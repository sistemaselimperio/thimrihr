create or replace function public.grant_role_for_verified_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and lower(split_part(new.email, '@', 2)) = 'grupoimperio.co' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'rrhh')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_hr on auth.users;
create trigger on_auth_user_created_grant_hr
after insert on auth.users
for each row execute function public.grant_role_for_verified_domain();

drop trigger if exists on_auth_user_confirmed_grant_hr on auth.users;
create trigger on_auth_user_confirmed_grant_hr
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_role_for_verified_domain();

insert into public.user_roles (user_id, role)
select id, 'rrhh'::public.app_role from auth.users
where email_confirmed_at is not null
  and lower(split_part(email, '@', 2)) = 'grupoimperio.co'
on conflict (user_id, role) do nothing;