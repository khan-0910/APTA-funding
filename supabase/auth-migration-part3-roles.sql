-- APTA Empowers — PART 3: per-role access + document storage
-- Run AFTER part 2 (lockdown). Dashboard → SQL Editor → paste → Run. Idempotent.
--
-- Before this, every signed-in user could read and write every row — including
-- changing their own `role` to 'admin'. After this:
--   * students see and edit only their own profile, applications, beneficiary record
--     and progress reports, and can never change role/status or approve anything;
--   * staff/admin see and manage everything; deletes stay admin-only;
--   * uploaded documents live in a private Storage bucket, readable by the owner and staff.

-- ---------- Helpers ----------
create or replace function apta_my_id() returns text as $$
  select id from user_accounts where auth_uid = auth.uid()
$$ language sql stable security definer set search_path = public;

create or replace function apta_is_staff() returns boolean as $$
  select coalesce(apta_role() in ('staff', 'admin'), false)
$$ language sql stable security definer set search_path = public;

-- Beneficiary ↔ student link (set by the app when an application is approved).
alter table beneficiaries add column if not exists student_id text;
create index if not exists beneficiaries_student_id_idx on beneficiaries (student_id);
create index if not exists applications_student_id_idx on applications (student_id);
create index if not exists progress_reports_student_id_idx on progress_reports (student_id);

-- ---------- user_accounts ----------
drop policy if exists accounts_select_auth on user_accounts;
create policy accounts_select_auth on user_accounts for select to authenticated
  using (auth_uid = auth.uid() or apta_is_staff());
-- insert/update/delete policies from part 1 stay (own row or admin; delete admin).

-- Column guard: only an admin may change who someone is or what they can do.
create or replace function apta_guard_account() returns trigger as $$
begin
  if auth.role() in ('anon', 'authenticated') and coalesce(apta_role(), '') <> 'admin' then
    if tg_op = 'INSERT' and new.role <> 'student' then
      raise exception 'Only an admin can create staff or admin accounts';
    end if;
    if tg_op = 'UPDATE' and (
         new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.email is distinct from old.email
      or new.auth_uid is distinct from old.auth_uid
      or new.password_hash is distinct from old.password_hash) then
      raise exception 'Only an admin can change role, status, email or login link';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists apta_guard_account on user_accounts;
create trigger apta_guard_account before insert or update on user_accounts
  for each row execute function apta_guard_account();

-- Legacy in-browser password hashes are dead weight once anon access is gone
-- (legacy users sign up again with the same email; part 1b links their profile).
update user_accounts set password_hash = 'supabase-auth' where password_hash <> 'supabase-auth';

-- ---------- login_logs ----------
drop policy if exists logs_select_auth on login_logs;
create policy logs_select_auth on login_logs for select to authenticated using (apta_is_staff());
drop policy if exists logs_insert_auth on login_logs;
create policy logs_insert_auth on login_logs for insert to authenticated
  with check (user_id is null or user_id = apta_my_id());

-- ---------- applications ----------
drop policy if exists applications_select_auth on applications;
create policy applications_select_auth on applications for select to authenticated
  using (student_id = apta_my_id() or apta_is_staff());
drop policy if exists applications_insert_auth on applications;
create policy applications_insert_auth on applications for insert to authenticated
  with check (apta_is_staff() or (student_id = apta_my_id() and status in ('draft', 'submitted')));
drop policy if exists applications_update_auth on applications;
create policy applications_update_auth on applications for update to authenticated
  using (student_id = apta_my_id() or apta_is_staff())
  with check (student_id = apta_my_id() or apta_is_staff());

-- Students may edit their own application (e.g. the career survey) but not its
-- decision: status and the office-use section are staff-only.
create or replace function apta_guard_application() returns trigger as $$
begin
  if auth.role() = 'authenticated' and not apta_is_staff() and (
       new.status is distinct from old.status
    or new.student_id is distinct from old.student_id
    or new.data->'officeUseOnly' is distinct from old.data->'officeUseOnly'
    or new.data->>'status' is distinct from old.data->>'status') then
    raise exception 'Only staff can change an application''s decision';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists apta_guard_application on applications;
create trigger apta_guard_application before update on applications
  for each row execute function apta_guard_application();

-- ---------- beneficiaries ----------
drop policy if exists beneficiaries_select_auth on beneficiaries;
create policy beneficiaries_select_auth on beneficiaries for select to authenticated
  using (student_id = apta_my_id() or apta_is_staff());
drop policy if exists beneficiaries_insert_auth on beneficiaries;
create policy beneficiaries_insert_auth on beneficiaries for insert to authenticated
  with check (apta_is_staff());
drop policy if exists beneficiaries_update_auth on beneficiaries;
create policy beneficiaries_update_auth on beneficiaries for update to authenticated
  using (student_id = apta_my_id() or apta_is_staff())
  with check (student_id = apta_my_id() or apta_is_staff());

-- A student may only fill in their own career survey; funding, GPA, status are staff's.
create or replace function apta_guard_beneficiary() returns trigger as $$
begin
  if auth.role() = 'authenticated' and not apta_is_staff()
     and (to_jsonb(new) - 'career_survey') is distinct from (to_jsonb(old) - 'career_survey') then
    raise exception 'Students can only update their career survey';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists apta_guard_beneficiary on beneficiaries;
create trigger apta_guard_beneficiary before update on beneficiaries
  for each row execute function apta_guard_beneficiary();

-- ---------- partners & transactions: staff only ----------
drop policy if exists partners_select_auth on partners;
create policy partners_select_auth on partners for select to authenticated using (apta_is_staff());
drop policy if exists partners_insert_auth on partners;
create policy partners_insert_auth on partners for insert to authenticated with check (apta_is_staff());
drop policy if exists partners_update_auth on partners;
create policy partners_update_auth on partners for update to authenticated using (apta_is_staff());

drop policy if exists transactions_select_auth on transactions;
create policy transactions_select_auth on transactions for select to authenticated using (apta_is_staff());
drop policy if exists transactions_insert_auth on transactions;
create policy transactions_insert_auth on transactions for insert to authenticated with check (apta_is_staff());
drop policy if exists transactions_update_auth on transactions;
create policy transactions_update_auth on transactions for update to authenticated using (apta_is_staff());

-- ---------- progress_reports ----------
drop policy if exists reports_select_auth on progress_reports;
create policy reports_select_auth on progress_reports for select to authenticated
  using (student_id = apta_my_id() or apta_is_staff());
drop policy if exists reports_insert_auth on progress_reports;
create policy reports_insert_auth on progress_reports for insert to authenticated
  with check (apta_is_staff() or (student_id = apta_my_id() and status = 'pending'));
drop policy if exists reports_update_auth on progress_reports;
create policy reports_update_auth on progress_reports for update to authenticated using (apta_is_staff());

-- ---------- Document storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 5242880, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Objects live under "<auth uid>/...": owners write their own folder, staff read all.
drop policy if exists documents_insert on storage.objects;
create policy documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists documents_select on storage.objects;
create policy documents_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or apta_is_staff()));
drop policy if exists documents_delete on storage.objects;
create policy documents_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or apta_role() = 'admin'));

-- Done.
