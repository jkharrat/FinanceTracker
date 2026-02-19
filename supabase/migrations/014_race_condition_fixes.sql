-- ============================================================
-- 014: Race-condition fixes
--
-- 1. do_transfer: deterministic lock ordering to prevent deadlocks
-- 2. process_scheduled_allowances: FOR UPDATE to prevent double-pay
-- ============================================================

-- ============================================================
-- 1. Deadlock-safe do_transfer
--
-- Previously locked sender then receiver, which deadlocks when
-- A→B and B→A happen simultaneously. Now locks both rows in a
-- single query ordered by id (deterministic).
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

  -- Lock both rows in deterministic order (by id) to prevent deadlocks
  PERFORM 1 FROM public.kids
  WHERE id IN (p_from_kid_id, p_to_kid_id)
  ORDER BY id
  FOR UPDATE;

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
-- 2. process_scheduled_allowances with FOR UPDATE
--
-- Without row-level locking, concurrent cron invocations both
-- read the same last_allowance_date and double-pay allowances.
-- Adding FOR UPDATE serializes concurrent calls per-kid.
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
    FOR UPDATE
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
