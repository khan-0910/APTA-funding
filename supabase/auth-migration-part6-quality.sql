-- APTA Empowers — PART 6: data quality (run after part 5). Idempotent.
--
-- 1. Sign-ups are only accepted from recognised email providers and institution
--    domains. The list lives in public.allowed_email_domains — add or remove domains in
--    Supabase → Table Editor, no code change needed.
-- 2. A student can have only one application open (submitted / under review) at a time.
-- 3. Basic range checks on names and money so impossible values can't be stored.

-- ---------- 1) Email domain allowlist ----------
create table if not exists allowed_email_domains (
  domain text primary key check (domain = lower(domain) and domain !~ '\s'),
  -- true: also allow any sub-domain ending in ".<domain>" (e.g. "ac.in" → "psgtech.ac.in")
  is_suffix boolean not null default false,
  note text
);
alter table allowed_email_domains enable row level security; -- no policies: dashboard-only

insert into allowed_email_domains (domain, is_suffix, note) values
  ('gmail.com', false, 'Google'), ('googlemail.com', false, 'Google'),
  ('outlook.com', false, 'Microsoft'), ('outlook.in', false, 'Microsoft'), ('hotmail.com', false, 'Microsoft'),
  ('live.com', false, 'Microsoft'), ('live.in', false, 'Microsoft'), ('msn.com', false, 'Microsoft'),
  ('yahoo.com', false, 'Yahoo'), ('yahoo.co.in', false, 'Yahoo'), ('yahoo.in', false, 'Yahoo'),
  ('ymail.com', false, 'Yahoo'), ('rocketmail.com', false, 'Yahoo'),
  ('icloud.com', false, 'Apple'), ('me.com', false, 'Apple'), ('mac.com', false, 'Apple'),
  ('rediffmail.com', false, 'Rediff'),
  ('zoho.com', false, 'Zoho'), ('zohomail.com', false, 'Zoho'), ('zohomail.in', false, 'Zoho'),
  ('proton.me', false, 'Proton'), ('protonmail.com', false, 'Proton'),
  ('aol.com', false, 'AOL'), ('gmx.com', false, 'GMX'),
  ('aptaempowers.org', false, 'APTA staff'),
  ('edu', true, 'Universities'), ('edu.in', true, 'Indian institutions'), ('ac.in', true, 'Indian colleges'),
  ('gov.in', true, 'Government of India'), ('nic.in', true, 'NIC / government')
on conflict (domain) do nothing;

create or replace function apta_email_allowed(email text) returns boolean as $$
  select email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'
     and exists (
       select 1 from allowed_email_domains d
        where lower(split_part(email, '@', 2)) = d.domain
           or (d.is_suffix and lower(split_part(email, '@', 2)) like '%.' || d.domain)
     )
$$ language sql stable security definer set search_path = public;
-- Callable before sign-up so the form can warn early; it only answers yes/no.
grant execute on function apta_email_allowed(text) to anon, authenticated;

-- The sign-up trigger (part 1b) now refuses other domains, so the rule can't be
-- bypassed by calling the Auth API directly.
create or replace function apta_handle_new_user() returns trigger as $$
begin
  if not apta_email_allowed(new.email) then
    raise exception 'Email domain not accepted. Use Gmail, Outlook, Yahoo, iCloud, Rediff or an institution address.';
  end if;

  -- Legacy profile already exists for this email → link it to the new Auth user.
  update user_accounts
     set auth_uid = new.id
   where email = new.email
     and auth_uid is null;
  if found then
    return new;
  end if;

  -- No profile yet → create one (role ALWAYS 'student'; never trust client metadata).
  insert into user_accounts (id, name, email, password_hash, role, status, auth_uid)
  values (
    'acc-auth-' || left(replace(new.id::text, '-', ''), 16),
    left(coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ), 80),
    new.email,
    'supabase-auth',
    'student',
    'active',
    new.id
  )
  on conflict (auth_uid) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- 2) One open application per student ----------
create or replace function apta_has_open_application() returns boolean as $$
  select exists (
    select 1 from applications
     where student_id = apta_my_id() and status in ('submitted', 'under_review')
  )
$$ language sql stable security definer set search_path = public;
revoke execute on function apta_has_open_application() from public, anon;
grant execute on function apta_has_open_application() to authenticated;

drop policy if exists applications_insert_auth on applications;
create policy applications_insert_auth on applications for insert to authenticated
  with check (
    apta_is_staff()
    or (student_id = apta_my_id()
        and status in ('draft', 'submitted')
        and (status = 'draft' or not apta_has_open_application())
        and apta_my_count('applications') < 20
        and pg_column_size(data) < 262144)
  );

-- ---------- 3) Range checks (NOT VALID: applies to new/changed rows, never blocks old data) ----------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'applications_student_name_len') then
    alter table applications add constraint applications_student_name_len
      check (char_length(trim(student_name)) between 2 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_accounts_name_len') then
    alter table user_accounts add constraint user_accounts_name_len
      check (char_length(trim(name)) between 1 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'beneficiaries_funding_range') then
    alter table beneficiaries add constraint beneficiaries_funding_range
      check (funding_received >= 0 and funding_received <= 10000000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'beneficiaries_gpa_range') then
    alter table beneficiaries add constraint beneficiaries_gpa_range
      check (current_gpa between 0 and 10) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_amount_range') then
    alter table transactions add constraint transactions_amount_range
      check (amount > 0 and amount <= 100000000) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'partners_contributed_range') then
    alter table partners add constraint partners_contributed_range
      check (total_contributed >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'progress_reports_gpa_range') then
    alter table progress_reports add constraint progress_reports_gpa_range
      check (gpa between 0 and 10) not valid;
  end if;
end $$;

-- Done.
