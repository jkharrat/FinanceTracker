-- Ensures the handle_new_user trigger is present.
-- Recreating it is idempotent (CREATE OR REPLACE + DROP IF EXISTS).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
BEGIN
  new_family_id := COALESCE(
    (NEW.raw_user_meta_data->>'family_id')::uuid,
    gen_random_uuid()
  );

  IF NEW.raw_user_meta_data->>'family_id' IS NULL THEN
    INSERT INTO families (id) VALUES (new_family_id);
  END IF;

  INSERT INTO profiles (id, family_id, role, display_name)
  VALUES (
    NEW.id,
    new_family_id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO notification_preferences (family_id)
  VALUES (new_family_id)
  ON CONFLICT (family_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Client-callable fallback: guarantees a family + profile exist for the
-- caller even when the trigger did not fire (e.g. trigger was missing,
-- or the migration hadn't been applied yet).
CREATE OR REPLACE FUNCTION bootstrap_admin(p_display_name TEXT)
RETURNS TEXT AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT family_id INTO v_family_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_family_id IS NOT NULL THEN
    UPDATE profiles SET display_name = p_display_name WHERE id = auth.uid();
    RETURN 'OK';
  END IF;

  v_family_id := gen_random_uuid();
  INSERT INTO families (id) VALUES (v_family_id);

  INSERT INTO profiles (id, family_id, role, display_name)
  VALUES (auth.uid(), v_family_id, 'admin', p_display_name);

  INSERT INTO notification_preferences (family_id)
  VALUES (v_family_id)
  ON CONFLICT (family_id) DO NOTHING;

  RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
