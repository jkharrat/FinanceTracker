-- Atomic update and delete for transactions, matching the pattern of add_transaction_safe.
-- Both recalculate the kid's balance from the full transaction ledger within a single
-- SECURITY DEFINER function so no concurrent operation can interleave.

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
  WHERE id = p_transaction_id;

  IF v_kid_id IS NULL THEN
    RETURN 'Transaction not found';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM public.kids
  WHERE id = v_kid_id;

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
  WHERE id = p_transaction_id;

  IF v_kid_id IS NULL THEN
    RETURN 'Transaction not found';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM public.kids
  WHERE id = v_kid_id;

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
