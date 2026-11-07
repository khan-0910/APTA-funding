-- APTA Empowers — PART 7: disabled accounts lose access everywhere (run after part 6). Idempotent.
--
-- The admin Users page can set an account to "disabled". The app then refuses to sign
-- them in, but a login token issued earlier would still work against the API for up
-- to an hour. Making the two identity helpers ignore disabled accounts closes that:
-- every policy that relies on them (own rows, staff access, storage) stops matching.

create or replace function apta_role() returns text as $$
  select role from user_accounts where auth_uid = auth.uid() and status = 'active'
$$ language sql stable security definer set search_path = public;

create or replace function apta_my_id() returns text as $$
  select id from user_accounts where auth_uid = auth.uid() and status = 'active'
$$ language sql stable security definer set search_path = public;

-- Own-profile reads still work (auth_uid = auth.uid()), so the app can show
-- "This account is disabled" instead of failing silently.

-- Keep the grants from part 4.
revoke execute on function apta_role() from public, anon;
revoke execute on function apta_my_id() from public, anon;
grant execute on function apta_role(), apta_my_id() to authenticated;

-- Never leave the organisation without an admin: block demoting/disabling the last one.
create or replace function apta_keep_one_admin() returns trigger as $$
begin
  if old.role = 'admin' and old.status = 'active'
     and (new.role <> 'admin' or new.status <> 'active')
     and (select count(*) from user_accounts where role = 'admin' and status = 'active' and id <> old.id) = 0 then
    raise exception 'At least one active admin is required';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists apta_keep_one_admin on user_accounts;
create trigger apta_keep_one_admin before update on user_accounts
  for each row execute function apta_keep_one_admin();

-- Done.
