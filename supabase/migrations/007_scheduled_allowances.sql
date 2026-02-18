-- ============================================================
-- Server-side scheduled allowance processing
-- Mirrors the client-side processAllowances() logic so that
-- allowances are deposited on time even when nobody opens the app.
-- ============================================================

CREATE OR REPLACE FUNCTION process_scheduled_allowances()
RETURNS TABLE(kid_id UUID, kid_name TEXT, family_id UUID, amount_added NUMERIC, payments_count INT) AS $$
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
    FROM kids k
    WHERE k.allowance_amount > 0
  LOOP
    -- Calculate first due date
    IF rec.last_allowance_date IS NOT NULL THEN
      IF rec.allowance_frequency = 'weekly' THEN
        next_due := rec.last_allowance_date + INTERVAL '7 days';
      ELSE
        next_due := date_trunc('month', rec.last_allowance_date + INTERVAL '1 month');
      END IF;
    ELSE
      IF rec.allowance_frequency = 'weekly' THEN
        -- Next Monday after created_at
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
      INSERT INTO transactions (kid_id, type, amount, description, category, date)
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
      UPDATE kids SET balance = new_balance, last_allowance_date = last_date
      WHERE kids.id = rec.id;

      -- Insert in-app notification for the family
      INSERT INTO notifications (family_id, kid_id, type, title, message, data)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
