REVOKE EXECUTE ON FUNCTION public.grant_role_for_verified_domain() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.grant_role_for_verified_domain() TO service_role;