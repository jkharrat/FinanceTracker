-- Allow kids to update their own avatar (not just admins).
-- Same pattern as 017_allow_kid_update_own_goal.sql: the RPC function
-- previously rejected all non-admin callers, so kids saw the avatar
-- picker UI but the change was silently discarded.

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
  v_kid_user_id UUID;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL THEN
    RETURN 'Profile not found. Please log out and log back in.';
  END IF;

  SELECT family_id, user_id INTO v_kid_family_id, v_kid_user_id
  FROM public.kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL THEN
    RETURN 'Kid not found';
  END IF;

  IF v_kid_family_id != v_caller_family_id THEN
    RETURN 'Kid does not belong to your family';
  END IF;

  IF v_caller_role = 'admin' THEN
    NULL;
  ELSIF v_caller_role = 'kid' AND v_kid_user_id = auth.uid() THEN
    NULL;
  ELSE
    RETURN 'You do not have permission to update this avatar';
  END IF;

  UPDATE public.kids SET avatar = p_avatar WHERE id = p_kid_id;

  RETURN 'OK';
END;
$$;
