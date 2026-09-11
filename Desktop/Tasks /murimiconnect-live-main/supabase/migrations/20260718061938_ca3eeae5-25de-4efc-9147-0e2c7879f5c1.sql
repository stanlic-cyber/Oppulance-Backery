
-- Auth hardening: atomic user provisioning via trigger on auth.users
-- Ensures profile + role are created inside the same transaction as the auth
-- user, preventing orphaned auth accounts if any downstream insert fails.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name  text := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'name', '')), '');
  v_phone text := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  v_role_raw text := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role', 'buyer')));
  v_role public.app_role;
BEGIN
  -- Whitelist role; never allow client to self-assign admin.
  IF v_role_raw IN ('farmer','buyer','driver') THEN
    v_role := v_role_raw::public.app_role;
  ELSE
    v_role := 'buyer'::public.app_role;
  END IF;

  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (NEW.id, COALESCE(v_name, split_part(NEW.email, '@', 1)), NEW.email, v_phone)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
