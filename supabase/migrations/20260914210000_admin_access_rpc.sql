create or replace function public.get_my_staff_access()
returns table(role text, is_active boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.role, p.is_active
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_staff_access() from public;
grant execute on function public.get_my_staff_access() to authenticated;
