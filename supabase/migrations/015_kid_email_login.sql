-- ============================================================
-- 015: Kids Email Login Migration
--
-- Kids now log in with a real email via Supabase Auth, just
-- like parents.  The kids.name column becomes display-only.
-- ============================================================

-- 1. Drop the name-uniqueness constraint (names are display-only now)
ALTER TABLE public.kids DROP CONSTRAINT IF EXISTS kids_family_id_name_key;

-- 2. Drop the lookup_kid_for_login function (login goes through Supabase Auth directly)
DROP FUNCTION IF EXISTS lookup_kid_for_login(TEXT);

-- 3. Allow admins to retrieve the auth email for a kid in their family.
--    auth.users is not queryable from the client, so this SECURITY DEFINER
--    function bridges the gap for the edit-kid screen.
CREATE OR REPLACE FUNCTION get_kid_auth_email(p_kid_id UUID)
RETURNS TEXT
STABLE
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_kid_family_id UUID;
  v_kid_user_id UUID;
  v_email TEXT;
BEGIN
  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_family_id IS NULL OR v_caller_role != 'admin' THEN
    RETURN NULL;
  END IF;

  SELECT family_id, user_id INTO v_kid_family_id, v_kid_user_id
  FROM public.kids
  WHERE id = p_kid_id;

  IF v_kid_family_id IS NULL OR v_kid_family_id != v_caller_family_id THEN
    RETURN NULL;
  END IF;

  IF v_kid_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_kid_user_id;

  RETURN v_email;
END;
$$;
