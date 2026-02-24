-- Allow kids to update their own savings goals (not just admins).
-- Previously the RPC function rejected all non-admin callers, so kids
-- could see the goal editor UI but saves silently failed.

CREATE OR REPLACE FUNCTION update_savings_goal_safe(
  p_kid_id UUID,
  p_savings_goal_name TEXT DEFAULT NULL,
  p_savings_goal_target NUMERIC DEFAULT NULL
)
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
    -- Parents can update any kid's goal in their family
    NULL;
  ELSIF v_caller_role = 'kid' AND v_kid_user_id = auth.uid() THEN
    -- Kids can update their own goal
    NULL;
  ELSE
    RETURN 'You do not have permission to update this savings goal';
  END IF;

  UPDATE public.kids SET
    savings_goal_name = p_savings_goal_name,
    savings_goal_target = p_savings_goal_target
  WHERE id = p_kid_id;

  RETURN 'OK';
END;
$$;
