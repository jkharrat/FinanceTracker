-- Atomic add/subtract transaction (SECURITY DEFINER to bypass RLS)
-- Mirrors the pattern used by do_transfer, update_kid_safe, etc.
CREATE OR REPLACE FUNCTION add_transaction_safe(
  p_kid_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_category TEXT DEFAULT 'other'
)
RETURNS TEXT AS $$
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
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only parents can add or subtract funds';
  END IF;

  SELECT family_id, balance INTO v_family_id, v_old_balance
  FROM kids
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

  INSERT INTO transactions (kid_id, type, amount, description, category, date)
  VALUES (p_kid_id, p_type, p_amount, COALESCE(NULLIF(trim(p_description), ''), ''), p_category, now());

  UPDATE kids SET balance = v_new_balance WHERE id = p_kid_id;

  RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
