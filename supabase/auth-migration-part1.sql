-- APTA Empowers — Supabase Auth migration, PART 1 (backwards-safe)
-- Run in Dashboard → SQL Editor → New query → paste → Run. Idempotent: safe to re-run.
--
-- This part is ADDITIVE ONLY: it links app profiles to real Supabase Auth users and
-- grants sensible policies to the `authenticated` role. The app keeps working exactly
-- as before (anon policies stay until part 2), so you can run this at any time.
--
-- Dashboard checklist (do these once, in order):
--   1. Authentication → Providers → Email: ensure "Email" provider is enabled (default).
--   2. Authentication → Sign In / Up → turn OFF "Confirm email" (the app has no SMTP
--      or confirmation-page flow yet; users can log in immediately after signup).
--   3. Authentication → URL Configuration → Site URL:
--      https://khan-0910.github.io/APTA-funding/
--   4. Run this script, then tell the assistant to continue (it verifies via API).

-- ---------- 1) Link column: user_accounts.auth_uid -> auth.users.id ----------
alter table user_accounts add column if not exists auth_uid uuid;

-- One Auth account per profile, enforced in the DB.
create unique index if not exists user_accounts_auth_uid_key on user_accounts (auth_uid);

-- ---------- 2) Role helper: the app role of the signed-in user (null if anon) ----------
create or replace function apta_role() returns text as $$
  select role from user_accounts where auth_uid = auth.uid()
$$ language sql stable security definer set search_path = public;

-- ---------- 3) Policies for `authenticated` (Supabase Auth) — additive ----------
-- Shape mirrors current app behaviour: read/insert/update for signed-in users,
-- deletes admin-only (the only delete path in the app is the admin's Clear Data tool).
-- NOTE: before part 2, the broad anon policies still apply, so these are not yet
-- the security boundary — they are the migration target.

-- user_accounts
drop policy if exists accounts_select_auth on user_accounts;
create policy accounts_select_auth on user_accounts for select to authenticated
  using (true);
drop policy if exists accounts_insert_auth on user_accounts;
create policy accounts_insert_auth on user_accounts for insert to authenticated
  with check (auth_uid = auth.uid() or apta_role() = 'admin');
drop policy if exists accounts_update_auth on user_accounts;
create policy accounts_update_auth on user_accounts for update to authenticated
  using (auth_uid = auth.uid() or apta_role() = 'admin');
drop policy if exists accounts_delete_admin on user_accounts;
create policy accounts_delete_admin on user_accounts for delete to authenticated
  using (apta_role() = 'admin');

-- login_logs
drop policy if exists logs_select_auth on login_logs;
create policy logs_select_auth on login_logs for select to authenticated using (true);
drop policy if exists logs_insert_auth on login_logs;
create policy logs_insert_auth on login_logs for insert to authenticated with check (true);
drop policy if exists logs_update_admin on login_logs;
create policy logs_update_admin on login_logs for update to authenticated
  using (apta_role() = 'admin');
drop policy if exists logs_delete_admin on login_logs;
create policy logs_delete_admin on login_logs for delete to authenticated
  using (apta_role() = 'admin');

-- applications
drop policy if exists applications_select_auth on applications;
create policy applications_select_auth on applications for select to authenticated using (true);
drop policy if exists applications_insert_auth on applications;
create policy applications_insert_auth on applications for insert to authenticated with check (true);
drop policy if exists applications_update_auth on applications;
create policy applications_update_auth on applications for update to authenticated using (true);
drop policy if exists applications_delete_admin on applications;
create policy applications_delete_admin on applications for delete to authenticated
  using (apta_role() = 'admin');

-- beneficiaries
drop policy if exists beneficiaries_select_auth on beneficiaries;
create policy beneficiaries_select_auth on beneficiaries for select to authenticated using (true);
drop policy if exists beneficiaries_insert_auth on beneficiaries;
create policy beneficiaries_insert_auth on beneficiaries for insert to authenticated with check (true);
drop policy if exists beneficiaries_update_auth on beneficiaries;
create policy beneficiaries_update_auth on beneficiaries for update to authenticated using (true);
drop policy if exists beneficiaries_delete_admin on beneficiaries;
create policy beneficiaries_delete_admin on beneficiaries for delete to authenticated
  using (apta_role() = 'admin');

-- partners
drop policy if exists partners_select_auth on partners;
create policy partners_select_auth on partners for select to authenticated using (true);
drop policy if exists partners_insert_auth on partners;
create policy partners_insert_auth on partners for insert to authenticated with check (true);
drop policy if exists partners_update_auth on partners;
create policy partners_update_auth on partners for update to authenticated using (true);
drop policy if exists partners_delete_admin on partners;
create policy partners_delete_admin on partners for delete to authenticated
  using (apta_role() = 'admin');

-- transactions
drop policy if exists transactions_select_auth on transactions;
create policy transactions_select_auth on transactions for select to authenticated using (true);
drop policy if exists transactions_insert_auth on transactions;
create policy transactions_insert_auth on transactions for insert to authenticated with check (true);
drop policy if exists transactions_update_auth on transactions;
create policy transactions_update_auth on transactions for update to authenticated using (true);
drop policy if exists transactions_delete_admin on transactions;
create policy transactions_delete_admin on transactions for delete to authenticated
  using (apta_role() = 'admin');

-- progress_reports
drop policy if exists reports_select_auth on progress_reports;
create policy reports_select_auth on progress_reports for select to authenticated using (true);
drop policy if exists reports_insert_auth on progress_reports;
create policy reports_insert_auth on progress_reports for insert to authenticated with check (true);
drop policy if exists reports_update_auth on progress_reports;
create policy reports_update_auth on progress_reports for update to authenticated using (true);
drop policy if exists reports_delete_admin on progress_reports;
create policy reports_delete_admin on progress_reports for delete to authenticated
  using (apta_role() = 'admin');

-- ---------- 4) Auto-create the app profile on every Auth signup ----------
-- Role is ALWAYS 'student' here: client-chosen role metadata is never trusted
-- (a crafted API signup could claim 'admin'). The organisation admin promotes
-- staff/admin accounts from inside the app afterwards.
create or replace function apta_handle_new_user() returns trigger as $$
begin
  insert into user_accounts (id, name, email, password_hash, role, status, auth_uid)
  values (
    'acc-auth-' || left(replace(new.id::text, '-', ''), 16),
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    'supabase-auth',           -- real verification lives in auth.users now
    'student',
    'active',
    new.id
  )
  on conflict (auth_uid) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function apta_handle_new_user();

-- ---------- Done. Verification happens via the Auth API (assistant-side). ----------
