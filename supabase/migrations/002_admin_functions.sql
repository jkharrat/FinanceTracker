-- ============================================================
-- Admin Functions (SECURITY DEFINER to bypass RLS)
-- ============================================================

-- Function to update a kid (admin only)
CREATE OR REPLACE FUNCTION update_kid_safe(
  p_kid_id UUID,
  p_name TEXT,
  p_avatar TEXT,
  p_allowance_amount NUMERIC,
  p_allowance_frequency TEXT,
  p_savings_goal_name TEXT DEFAULT NULL,
  p_savings_goal_target NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_admin_family_id UUID;
  v_kid_family_id UUID;
BEGIN
  -- Check if admin profile exists
  SELECT family_id INTO v_admin_family_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_admin_family_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found. Please log out and log back in.';
  END IF;

  -- Check if kid exists and belongs to admin's family
  SELECT family_id INTO v_kid_family_id
  FROM kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RAISE EXCEPTION 'Kid not found';
  END IF;

  IF v_kid_family_id != v_admin_family_id THEN
    RAISE EXCEPTION 'Kid does not belong to your family';
  END IF;

  -- Update the kid
  UPDATE kids SET
    name = p_name,
    avatar = p_avatar,
    allowance_amount = p_allowance_amount,
    allowance_frequency = p_allowance_frequency,
    savings_goal_name = p_savings_goal_name,
    savings_goal_target = p_savings_goal_target
  WHERE id = p_kid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a kid (admin only)
CREATE OR REPLACE FUNCTION delete_kid_safe(p_kid_id UUID)
RETURNS VOID AS $$
DECLARE
  v_admin_family_id UUID;
  v_kid_family_id UUID;
BEGIN
  -- Check if admin profile exists
  SELECT family_id INTO v_admin_family_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_admin_family_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found. Please log out and log back in.';
  END IF;

  -- Check if kid exists and belongs to admin's family
  SELECT family_id INTO v_kid_family_id
  FROM kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RAISE EXCEPTION 'Kid not found';
  END IF;

  IF v_kid_family_id != v_admin_family_id THEN
    RAISE EXCEPTION 'Kid does not belong to your family';
  END IF;

  -- Delete the kid (CASCADE handles related records)
  DELETE FROM kids WHERE id = p_kid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update kid avatar (admin only)
CREATE OR REPLACE FUNCTION update_kid_avatar_safe(p_kid_id UUID, p_avatar TEXT)
RETURNS VOID AS $$
DECLARE
  v_admin_family_id UUID;
  v_kid_family_id UUID;
BEGIN
  SELECT family_id INTO v_admin_family_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_admin_family_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found. Please log out and log back in.';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RAISE EXCEPTION 'Kid not found';
  END IF;

  IF v_kid_family_id != v_admin_family_id THEN
    RAISE EXCEPTION 'Kid does not belong to your family';
  END IF;

  UPDATE kids SET avatar = p_avatar WHERE id = p_kid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update savings goal (admin only)
CREATE OR REPLACE FUNCTION update_savings_goal_safe(
  p_kid_id UUID,
  p_savings_goal_name TEXT DEFAULT NULL,
  p_savings_goal_target NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_admin_family_id UUID;
  v_kid_family_id UUID;
BEGIN
  SELECT family_id INTO v_admin_family_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_admin_family_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found. Please log out and log back in.';
  END IF;

  SELECT family_id INTO v_kid_family_id
  FROM kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RAISE EXCEPTION 'Kid not found';
  END IF;

  IF v_kid_family_id != v_admin_family_id THEN
    RAISE EXCEPTION 'Kid does not belong to your family';
  END IF;

  UPDATE kids SET
    savings_goal_name = p_savings_goal_name,
    savings_goal_target = p_savings_goal_target
  WHERE id = p_kid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to look up kid for login (bypasses RLS)
CREATE OR REPLACE FUNCTION lookup_kid_for_login(kid_name TEXT)
RETURNS TABLE(kid_id UUID, kid_user_id UUID, kid_family_id UUID) AS $$
  SELECT id, user_id, family_id FROM kids WHERE lower(name) = lower(kid_name);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to link user_id to kid row (bypasses RLS)
CREATE OR REPLACE FUNCTION link_kid_user(p_kid_id UUID, p_user_id UUID)
RETURNS VOID AS $$
  UPDATE kids SET user_id = p_user_id WHERE id = p_kid_id;
$$ LANGUAGE sql SECURITY DEFINER;
