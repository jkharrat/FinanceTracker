-- Fix: Newer Supabase versions exclude "public" from the search_path for
-- trigger / SECURITY DEFINER contexts.  All table references must be
-- schema-qualified and each function must pin its own search_path.

-- ============================================================
-- 1. Recreate handle_new_user with explicit public. references
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_family_id UUID;
BEGIN
  new_family_id := COALESCE(
    (NEW.raw_user_meta_data->>'family_id')::uuid,
    gen_random_uuid()
  );

  IF NEW.raw_user_meta_data->>'family_id' IS NULL THEN
    INSERT INTO public.families (id) VALUES (new_family_id);
  END IF;

  INSERT INTO public.profiles (id, family_id, role, display_name)
  VALUES (
    NEW.id,
    new_family_id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.notification_preferences (family_id)
  VALUES (new_family_id)
  ON CONFLICT (family_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. Fix get_my_family_id (used by almost every RLS policy)
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID
STABLE
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 3. Fix assign_admin_to_family
-- ============================================================
CREATE OR REPLACE FUNCTION assign_admin_to_family(
  p_user_id UUID,
  p_display_name TEXT
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_family_id UUID;
  v_caller_role TEXT;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Your profile was not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only admins can add parents';
  END IF;

  INSERT INTO public.profiles (id, family_id, role, display_name)
  VALUES (p_user_id, v_caller_family_id, 'admin', p_display_name)
  ON CONFLICT (id) DO UPDATE SET
    family_id = v_caller_family_id,
    role = 'admin',
    display_name = p_display_name;

  RETURN 'OK';
END;
$$;

-- ============================================================
-- 4. Fix admin CRUD helpers
-- ============================================================
CREATE OR REPLACE FUNCTION update_kid_safe(
  p_kid_id UUID,
  p_name TEXT,
  p_avatar TEXT,
  p_allowance_amount NUMERIC,
  p_allowance_frequency TEXT,
  p_savings_goal_name TEXT DEFAULT NULL,
  p_savings_goal_target NUMERIC DEFAULT NULL
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.kids SET
    name = p_name,
    avatar = p_avatar,
    allowance_amount = p_allowance_amount,
    allowance_frequency = p_allowance_frequency,
    savings_goal_name = p_savings_goal_name,
    savings_goal_target = p_savings_goal_target
  WHERE id = p_kid_id;

  IF NOT FOUND THEN
    RETURN 'Kid not found';
  END IF;

  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION delete_kid_safe(p_kid_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.kids WHERE id = p_kid_id;

  IF NOT FOUND THEN
    RETURN 'Kid not found';
  END IF;

  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION update_kid_avatar_safe(p_kid_id UUID, p_avatar TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.kids SET avatar = p_avatar WHERE id = p_kid_id;

  IF NOT FOUND THEN
    RETURN 'Kid not found';
  END IF;

  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION update_savings_goal_safe(
  p_kid_id UUID,
  p_savings_goal_name TEXT DEFAULT NULL,
  p_savings_goal_target NUMERIC DEFAULT NULL
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.kids SET
    savings_goal_name = p_savings_goal_name,
    savings_goal_target = p_savings_goal_target
  WHERE id = p_kid_id;

  IF NOT FOUND THEN
    RETURN 'Kid not found';
  END IF;

  RETURN 'OK';
END;
$$;

-- ============================================================
-- 5. Fix kid auth helpers
-- ============================================================
CREATE OR REPLACE FUNCTION lookup_kid_for_login(kid_name TEXT)
RETURNS TABLE(kid_id UUID, kid_user_id UUID, kid_family_id UUID)
STABLE
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT id, user_id, family_id FROM public.kids WHERE lower(name) = lower(kid_name);
$$;

CREATE OR REPLACE FUNCTION link_kid_user(p_kid_id UUID, p_user_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  UPDATE public.kids SET user_id = p_user_id WHERE id = p_kid_id;
$$;

-- ============================================================
-- 6. Fix transfer function
-- ============================================================
CREATE OR REPLACE FUNCTION do_transfer(
  p_from_kid_id UUID,
  p_to_kid_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT ''
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_sender_balance NUMERIC;
  v_sender_family_id UUID;
  v_receiver_family_id UUID;
  v_transfer_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  IF p_amount <= 0 THEN
    RETURN 'Amount must be greater than zero';
  END IF;

  IF p_from_kid_id = p_to_kid_id THEN
    RETURN 'Cannot transfer to yourself';
  END IF;

  SELECT k.balance, k.family_id INTO v_sender_balance, v_sender_family_id
  FROM public.kids k
  WHERE k.id = p_from_kid_id AND k.user_id = auth.uid();

  IF v_sender_family_id IS NULL THEN
    RETURN 'Sender not found or you are not the sender';
  END IF;

  IF v_sender_balance < p_amount THEN
    RETURN 'Insufficient balance';
  END IF;

  SELECT family_id INTO v_receiver_family_id
  FROM public.kids
  WHERE id = p_to_kid_id;

  IF v_receiver_family_id IS NULL THEN
    RETURN 'Recipient not found';
  END IF;

  IF v_receiver_family_id != v_sender_family_id THEN
    RETURN 'Recipient is not in your family';
  END IF;

  v_transfer_id := gen_random_uuid();
  v_now := now();

  INSERT INTO public.transactions (kid_id, type, amount, description, category, date, transfer_id)
  VALUES (p_from_kid_id, 'subtract', p_amount, COALESCE(NULLIF(trim(p_description), ''), 'Transfer'), 'transfer', v_now, v_transfer_id);

  INSERT INTO public.transactions (kid_id, type, amount, description, category, date, transfer_id)
  VALUES (p_to_kid_id, 'add', p_amount, COALESCE(NULLIF(trim(p_description), ''), 'Transfer'), 'transfer', v_now, v_transfer_id);

  UPDATE public.kids SET balance = balance - p_amount WHERE id = p_from_kid_id;
  UPDATE public.kids SET balance = balance + p_amount WHERE id = p_to_kid_id;

  RETURN 'OK';
END;
$$;

-- ============================================================
-- 7. Fix add_transaction_safe
-- ============================================================
CREATE OR REPLACE FUNCTION add_transaction_safe(
  p_kid_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_category TEXT DEFAULT 'other'
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_family_id UUID;
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  IF p_type NOT IN ('add', 'subtract') THEN
    RETURN 'Invalid type: must be add or subtract';
  END IF;

  IF p_amount <= 0 THEN
    RETURN 'Amount must be greater than zero';
  END IF;

  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only parents can add or subtract funds';
  END IF;

  SELECT family_id, balance INTO v_family_id, v_old_balance
  FROM public.kids
  WHERE id = p_kid_id;

  IF v_family_id IS NULL THEN
    RETURN 'Kid not found';
  END IF;

  IF v_family_id != v_caller_family_id THEN
    RETURN 'Kid does not belong to your family';
  END IF;

  v_new_balance := CASE
    WHEN p_type = 'add' THEN v_old_balance + p_amount
    ELSE v_old_balance - p_amount
  END;
  v_new_balance := round(v_new_balance, 2);

  INSERT INTO public.transactions (kid_id, type, amount, description, category, date)
  VALUES (p_kid_id, p_type, p_amount, COALESCE(NULLIF(trim(p_description), ''), ''), p_category, now());

  UPDATE public.kids SET balance = v_new_balance WHERE id = p_kid_id;

  RETURN 'OK';
END;
$$;

-- ============================================================
-- 8. Fix process_scheduled_allowances
-- ============================================================
CREATE OR REPLACE FUNCTION process_scheduled_allowances()
RETURNS TABLE(kid_id UUID, kid_name TEXT, family_id UUID, amount_added NUMERIC, payments_count INT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  rec RECORD;
  next_due TIMESTAMPTZ;
  new_balance NUMERIC;
  total_added NUMERIC;
  pay_count INT;
  last_date TIMESTAMPTZ;
  tx_desc TEXT;
BEGIN
  FOR rec IN
    SELECT k.id, k.name, k.family_id, k.balance, k.allowance_amount,
           k.allowance_frequency, k.last_allowance_date, k.created_at
    FROM public.kids k
    WHERE k.allowance_amount > 0
  LOOP
    IF rec.last_allowance_date IS NOT NULL THEN
      IF rec.allowance_frequency = 'weekly' THEN
        next_due := rec.last_allowance_date + INTERVAL '7 days';
      ELSE
        next_due := date_trunc('month', rec.last_allowance_date + INTERVAL '1 month');
      END IF;
    ELSE
      IF rec.allowance_frequency = 'weekly' THEN
        next_due := date_trunc('day', rec.created_at)
                    + ((8 - EXTRACT(DOW FROM rec.created_at)::int) % 7) * INTERVAL '1 day';
        IF next_due <= rec.created_at THEN
          next_due := next_due + INTERVAL '7 days';
        END IF;
      ELSE
        next_due := date_trunc('month', rec.created_at + INTERVAL '1 month');
      END IF;
    END IF;

    new_balance := rec.balance;
    total_added := 0;
    pay_count := 0;
    last_date := rec.last_allowance_date;

    IF rec.allowance_frequency = 'weekly' THEN
      tx_desc := 'Weekly allowance';
    ELSE
      tx_desc := 'Monthly allowance';
    END IF;

    WHILE next_due <= now() LOOP
      INSERT INTO public.transactions (kid_id, type, amount, description, category, date)
      VALUES (rec.id, 'add', rec.allowance_amount, tx_desc, 'allowance', next_due);

      new_balance := round((new_balance + rec.allowance_amount)::numeric, 2);
      total_added := round((total_added + rec.allowance_amount)::numeric, 2);
      pay_count := pay_count + 1;
      last_date := next_due;

      IF rec.allowance_frequency = 'weekly' THEN
        next_due := next_due + INTERVAL '7 days';
      ELSE
        next_due := date_trunc('month', next_due + INTERVAL '1 month');
      END IF;
    END LOOP;

    IF pay_count > 0 THEN
      UPDATE public.kids SET balance = new_balance, last_allowance_date = last_date
      WHERE public.kids.id = rec.id;

      INSERT INTO public.notifications (family_id, kid_id, type, title, message, data)
      VALUES (
        rec.family_id,
        rec.id,
        'allowance_received',
        'Allowance for ' || rec.name,
        rec.name || ' received $' || to_char(total_added, 'FM999999990.00') || ' in allowance.',
        jsonb_build_object('amount', total_added)
      );

      kid_id := rec.id;
      kid_name := rec.name;
      family_id := rec.family_id;
      amount_added := total_added;
      payments_count := pay_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 9. Bootstrap fallback for setupAdmin
-- ============================================================
CREATE OR REPLACE FUNCTION bootstrap_admin(p_display_name TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT family_id INTO v_family_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_family_id IS NOT NULL THEN
    UPDATE public.profiles SET display_name = p_display_name WHERE id = auth.uid();
    RETURN 'OK';
  END IF;

  v_family_id := gen_random_uuid();
  INSERT INTO public.families (id) VALUES (v_family_id);

  INSERT INTO public.profiles (id, family_id, role, display_name)
  VALUES (auth.uid(), v_family_id, 'admin', p_display_name);

  INSERT INTO public.notification_preferences (family_id)
  VALUES (v_family_id)
  ON CONFLICT (family_id) DO NOTHING;

  RETURN 'OK';
END;
$$;
