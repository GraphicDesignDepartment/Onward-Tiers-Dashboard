-- Security hardening: helper functions are used only inside authenticated RLS policies.
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.can_access_account(uuid) from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_access_account(uuid) to authenticated;
