-- ============================================================
-- 013: Security & data-integrity hardening
--
-- Fixes:
--   1. Auth checks restored on admin CRUD RPCs
--   2. Auth + guard on link_kid_user
--   3. Row-level locking (FOR UPDATE) on do_transfer & add_transaction_safe
--   4. Atomic add_kid_safe RPC
--   5. LIMIT on lookup_kid_for_login
-- ============================================================

-- ============================================================
-- 1. Restore auth checks on admin CRUD RPCs
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
DECLARE
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_kid_family_id UUID;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only parents can edit kids';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM public.kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RETURN 'Kid not found';
  END IF;

  IF v_kid_family_id != v_caller_family_id THEN
    RETURN 'Kid does not belong to your family';
  END IF;

  UPDATE public.kids SET
    name = p_name,
    avatar = p_avatar,
    allowance_amount = p_allowance_amount,
    allowance_frequency = p_allowance_frequency,
    savings_goal_name = p_savings_goal_name,
    savings_goal_target = p_savings_goal_target
  WHERE id = p_kid_id;

  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION delete_kid_safe(p_kid_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_kid_family_id UUID;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only parents can delete kids';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM public.kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RETURN 'Kid not found';
  END IF;

  IF v_kid_family_id != v_caller_family_id THEN
    RETURN 'Kid does not belong to your family';
  END IF;

  DELETE FROM public.kids WHERE id = p_kid_id;

  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION update_kid_avatar_safe(p_kid_id UUID, p_avatar TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_kid_family_id UUID;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only parents can update avatars';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM public.kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RETURN 'Kid not found';
  END IF;

  IF v_kid_family_id != v_caller_family_id THEN
    RETURN 'Kid does not belong to your family';
  END IF;

  UPDATE public.kids SET avatar = p_avatar WHERE id = p_kid_id;

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
DECLARE
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_kid_family_id UUID;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only parents can update savings goals';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM public.kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RETURN 'Kid not found';
  END IF;

  IF v_kid_family_id != v_caller_family_id THEN
    RETURN 'Kid does not belong to your family';
  END IF;

  UPDATE public.kids SET
    savings_goal_name = p_savings_goal_name,
    savings_goal_target = p_savings_goal_target
  WHERE id = p_kid_id;

  RETURN 'OK';
END;
$$;

-- ============================================================
-- 2. Secure link_kid_user: caller must be admin in same family
--    OR linking themselves; kid must not already be linked
-- ============================================================

CREATE OR REPLACE FUNCTION link_kid_user(p_kid_id UUID, p_user_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_kid_family_id UUID;
  v_existing_user_id UUID;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found';
  END IF;

  SELECT family_id, user_id INTO v_kid_family_id, v_existing_user_id
  FROM public.kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RETURN 'Kid not found';
  END IF;

  IF v_kid_family_id != v_caller_family_id THEN
    RETURN 'Kid does not belong to your family';
  END IF;

  IF v_existing_user_id IS NOT NULL THEN
    RETURN 'Kid already has a linked account';
  END IF;

  -- Allow if caller is admin OR is linking themselves
  IF v_caller_role != 'admin' AND p_user_id != auth.uid() THEN
    RETURN 'Not authorized';
  END IF;

  UPDATE public.kids SET user_id = p_user_id WHERE id = p_kid_id;

  RETURN 'OK';
END;
$$;

-- ============================================================
-- 3a. Row-level locking on do_transfer
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
  WHERE k.id = p_from_kid_id AND k.user_id = auth.uid()
  FOR UPDATE;

  IF v_sender_family_id IS NULL THEN
    RETURN 'Sender not found or you are not the sender';
  END IF;

  IF v_sender_balance < p_amount THEN
    RETURN 'Insufficient balance';
  END IF;

  SELECT family_id INTO v_receiver_family_id
  FROM public.kids
  WHERE id = p_to_kid_id
  FOR UPDATE;

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
-- 3b. Row-level locking on add_transaction_safe
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
  WHERE id = p_kid_id
  FOR UPDATE;

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
-- 3c. Row-level locking on update_transaction_safe / delete_transaction_safe
-- ============================================================

CREATE OR REPLACE FUNCTION update_transaction_safe(
  p_transaction_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_category TEXT
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_kid_id UUID;
  v_kid_family_id UUID;
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RETURN 'Amount must be greater than zero';
  END IF;

  SELECT kid_id INTO v_kid_id
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF v_kid_id IS NULL THEN
    RETURN 'Transaction not found';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM public.kids
  WHERE id = v_kid_id
  FOR UPDATE;

  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only parents can edit transactions';
  END IF;

  IF v_kid_family_id != v_caller_family_id THEN
    RETURN 'Kid does not belong to your family';
  END IF;

  UPDATE public.transactions SET
    amount = p_amount,
    description = COALESCE(NULLIF(trim(p_description), ''), ''),
    category = p_category
  WHERE id = p_transaction_id;

  SELECT COALESCE(round(SUM(
    CASE WHEN type = 'add' THEN amount ELSE -amount END
  ), 2), 0) INTO v_new_balance
  FROM public.transactions
  WHERE kid_id = v_kid_id;

  UPDATE public.kids SET balance = v_new_balance WHERE id = v_kid_id;

  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION delete_transaction_safe(
  p_transaction_id UUID
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_kid_id UUID;
  v_kid_family_id UUID;
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_new_balance NUMERIC;
BEGIN
  SELECT kid_id INTO v_kid_id
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF v_kid_id IS NULL THEN
    RETURN 'Transaction not found';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM public.kids
  WHERE id = v_kid_id
  FOR UPDATE;

  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only parents can delete transactions';
  END IF;

  IF v_kid_family_id != v_caller_family_id THEN
    RETURN 'Kid does not belong to your family';
  END IF;

  DELETE FROM public.transactions WHERE id = p_transaction_id;

  SELECT COALESCE(round(SUM(
    CASE WHEN type = 'add' THEN amount ELSE -amount END
  ), 2), 0) INTO v_new_balance
  FROM public.transactions
  WHERE kid_id = v_kid_id;

  UPDATE public.kids SET balance = v_new_balance WHERE id = v_kid_id;

  RETURN 'OK';
END;
$$;

-- ============================================================
-- 4. Atomic add_kid_safe (kid row + optional initial balance tx)
-- ============================================================

CREATE OR REPLACE FUNCTION add_kid_safe(
  p_family_id UUID,
  p_name TEXT,
  p_avatar TEXT,
  p_allowance_amount NUMERIC,
  p_allowance_frequency TEXT,
  p_initial_balance NUMERIC DEFAULT 0
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_kid_id UUID;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only parents can add kids';
  END IF;

  IF v_caller_family_id != p_family_id THEN
    RETURN 'Family mismatch';
  END IF;

  INSERT INTO public.kids (family_id, name, avatar, allowance_amount, allowance_frequency, balance)
  VALUES (p_family_id, p_name, p_avatar, p_allowance_amount, p_allowance_frequency, GREATEST(p_initial_balance, 0))
  RETURNING id INTO v_kid_id;

  IF GREATEST(p_initial_balance, 0) > 0 THEN
    INSERT INTO public.transactions (kid_id, type, amount, description, category, date)
    VALUES (v_kid_id, 'add', p_initial_balance, 'Initial balance', 'other', now());
  END IF;

  RETURN v_kid_id::text;
END;
$$;

-- ============================================================
-- 5. Scope lookup_kid_for_login with LIMIT
-- ============================================================

CREATE OR REPLACE FUNCTION lookup_kid_for_login(kid_name TEXT)
RETURNS TABLE(kid_id UUID, kid_user_id UUID, kid_family_id UUID)
STABLE
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT id, user_id, family_id
  FROM public.kids
  WHERE lower(name) = lower(kid_name)
  LIMIT 5;
$$;
