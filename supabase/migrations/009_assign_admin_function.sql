-- Assign a newly-created auth user to the caller's family as an admin.
-- Uses upsert so it works regardless of whether the handle_new_user trigger
-- already created a profile (possibly in the wrong family).
CREATE OR REPLACE FUNCTION assign_admin_to_family(
  p_user_id UUID,
  p_display_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_caller_family_id UUID;
  v_caller_role TEXT;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Your profile was not found. Please log out and log back in.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RETURN 'Only admins can add parents';
  END IF;

  INSERT INTO profiles (id, family_id, role, display_name)
  VALUES (p_user_id, v_caller_family_id, 'admin', p_display_name)
  ON CONFLICT (id) DO UPDATE SET
    family_id = v_caller_family_id,
    role = 'admin',
    display_name = p_display_name;

  RETURN 'OK';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
