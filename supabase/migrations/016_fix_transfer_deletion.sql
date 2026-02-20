-- ============================================================
-- 016: Fix transfer deletion — delete both sides atomically
--
-- Previously, delete_transaction_safe only removed the single
-- transaction passed to it and recalculated that kid's balance.
-- If the transaction was part of a transfer, the paired
-- transaction in the other kid's account was left orphaned,
-- causing balance inconsistencies.
--
-- Now, when the deleted transaction has a transfer_id, we also
-- delete the paired transaction and recalculate both balances.
-- Deterministic lock ordering (by kid id) prevents deadlocks.
-- ============================================================

CREATE OR REPLACE FUNCTION delete_transaction_safe(
  p_transaction_id UUID
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_kid_id         UUID;
  v_kid_family_id  UUID;
  v_caller_family_id UUID;
  v_caller_role    TEXT;
  v_transfer_id    UUID;
  v_paired_kid_id  UUID;
  v_new_balance    NUMERIC;
BEGIN
  -- Fetch the target transaction
  SELECT kid_id, transfer_id INTO v_kid_id, v_transfer_id
  FROM public.transactions
  WHERE id = p_transaction_id;

  IF v_kid_id IS NULL THEN
    RETURN 'Transaction not found';
  END IF;

  -- If this is a transfer, find the paired kid before locking
  IF v_transfer_id IS NOT NULL THEN
    SELECT kid_id INTO v_paired_kid_id
    FROM public.transactions
    WHERE transfer_id = v_transfer_id
      AND id != p_transaction_id;
  END IF;

  -- Lock kid rows in deterministic order to prevent deadlocks
  IF v_paired_kid_id IS NOT NULL THEN
    PERFORM 1 FROM public.kids
    WHERE id IN (v_kid_id, v_paired_kid_id)
    ORDER BY id
    FOR UPDATE;
  ELSE
    PERFORM 1 FROM public.kids
    WHERE id = v_kid_id
    FOR UPDATE;
  END IF;

  -- Lock the transaction row(s)
  IF v_transfer_id IS NOT NULL THEN
    PERFORM 1 FROM public.transactions
    WHERE transfer_id = v_transfer_id
    FOR UPDATE;
  ELSE
    PERFORM 1 FROM public.transactions
    WHERE id = p_transaction_id
    FOR UPDATE;
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

  -- Delete the target transaction (and paired transfer transaction if any)
  IF v_transfer_id IS NOT NULL THEN
    DELETE FROM public.transactions WHERE transfer_id = v_transfer_id;
  ELSE
    DELETE FROM public.transactions WHERE id = p_transaction_id;
  END IF;

  -- Recalculate balance for the primary kid
  SELECT COALESCE(round(SUM(
    CASE WHEN type = 'add' THEN amount ELSE -amount END
  ), 2), 0) INTO v_new_balance
  FROM public.transactions
  WHERE kid_id = v_kid_id;

  UPDATE public.kids SET balance = v_new_balance WHERE id = v_kid_id;

  -- Recalculate balance for the paired kid if this was a transfer
  IF v_paired_kid_id IS NOT NULL THEN
    SELECT COALESCE(round(SUM(
      CASE WHEN type = 'add' THEN amount ELSE -amount END
    ), 2), 0) INTO v_new_balance
    FROM public.transactions
    WHERE kid_id = v_paired_kid_id;

    UPDATE public.kids SET balance = v_new_balance WHERE id = v_paired_kid_id;
  END IF;

  RETURN 'OK';
END;
$$;
