-- Transfer money from one kid to another (SECURITY DEFINER so kid can update both balances)
-- Caller must be the sender (kid's user_id = auth.uid())
CREATE OR REPLACE FUNCTION do_transfer(
  p_from_kid_id UUID,
  p_to_kid_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT ''
)
RETURNS TEXT AS $$
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

  -- Get sender balance and family; ensure current user is the sender
  SELECT k.balance, k.family_id INTO v_sender_balance, v_sender_family_id
  FROM kids k
  WHERE k.id = p_from_kid_id AND k.user_id = auth.uid();

  IF v_sender_family_id IS NULL THEN
    RETURN 'Sender not found or you are not the sender';
  END IF;

  IF v_sender_balance < p_amount THEN
    RETURN 'Insufficient balance';
  END IF;

  -- Receiver must be in same family
  SELECT family_id INTO v_receiver_family_id
  FROM kids
  WHERE id = p_to_kid_id;

  IF v_receiver_family_id IS NULL THEN
    RETURN 'Recipient not found';
  END IF;

  IF v_receiver_family_id != v_sender_family_id THEN
    RETURN 'Recipient is not in your family';
  END IF;

  v_transfer_id := gen_random_uuid();
  v_now := now();

  -- Insert subtract transaction for sender
  INSERT INTO transactions (kid_id, type, amount, description, category, date, transfer_id)
  VALUES (p_from_kid_id, 'subtract', p_amount, COALESCE(NULLIF(trim(p_description), ''), 'Transfer'), 'transfer', v_now, v_transfer_id);

  -- Insert add transaction for receiver
  INSERT INTO transactions (kid_id, type, amount, description, category, date, transfer_id)
  VALUES (p_to_kid_id, 'add', p_amount, COALESCE(NULLIF(trim(p_description), ''), 'Transfer'), 'transfer', v_now, v_transfer_id);

  -- Update sender balance
  UPDATE kids SET balance = balance - p_amount WHERE id = p_from_kid_id;

  -- Update receiver balance
  UPDATE kids SET balance = balance + p_amount WHERE id = p_to_kid_id;

  RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
