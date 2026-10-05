-- APTA Empowers — Supabase schema
-- Run in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
--
-- The app generates IDs client-side (e.g. "app-lx2k3j-a1b2c3") and signs requests with the
-- anon key, so primary keys are text and RLS intentionally allows anon read/write — a
-- single-tenant NGO deployment pattern. If you later enable Supabase Auth, tighten the
-- policies to auth.role() = 'authenticated' and scope student rows by student_id.
-- Re-running this file is safe: every statement is idempotent.

create extension if not exists "pgcrypto";

-- ============ user_accounts ============
create table if not exists user_accounts (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('student','staff','admin')),
  status text not null default 'active' check (status in ('active','disabled')),
  login_count int not null default 0,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- ============ login_logs ============
create table if not exists login_logs (
  id text primary key,
  user_id text references user_accounts(id) on delete set null,
  user_email text not null,
  role text not null default 'unknown',
  action text not null check (action in ('LOGIN_SUCCESS','LOGIN_FAILED','ACCOUNT_CREATED','LOGOUT')),
  ip_address text,
  user_agent text,
  status text not null check (status in ('success','failure','info')),
  timestamp timestamptz not null default now()
);

-- ============ applications ============
create table if not exists applications (
  id text primary key,
  student_id text not null,
  student_name text not null,
  category text not null check (category in ('education','health_social','business')),
  status text not null default 'submitted' check (status in ('draft','submitted','under_review','approved','rejected')),
  data jsonb not null default '{}'::jsonb,
  career_survey jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ beneficiaries ============
create table if not exists beneficiaries (
  id text primary key,
  name text not null,
  category text not null check (category in ('education','health_social','business')),
  education_level text check (education_level in ('schooling','undergraduate','postgraduate')),
  funding_received numeric(12,2) not null default 0,
  program text not null default '',
  status text not null default 'active' check (status in ('active','completed','suspended')),
  enrolled_since timestamptz,
  expected_graduation text,
  current_gpa numeric(4,2) not null default 0,
  career_survey jsonb,
  created_at timestamptz not null default now()
);

-- ============ partners ============
create table if not exists partners (
  id text primary key,
  org_name text not null,
  contact_name text,
  contact_email text,
  relationship_status text check (relationship_status in ('corporate_csr','ngo','individual_donor','foundation')),
  total_contributed numeric(12,2) not null default 0,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============ transactions ============
create table if not exists transactions (
  id text primary key,
  date date not null,
  amount numeric(12,2) not null,
  direction text not null check (direction in ('inflow','outflow')),
  category text not null check (category in ('education','health_social','business','operations','donation')),
  description text not null default '',
  reconciled boolean not null default false,
  related_partner_id text references partners(id) on delete set null
);

-- ============ progress_reports ============
create table if not exists progress_reports (
  id text primary key,
  student_id text not null,
  student_name text,
  semester text not null,
  status text not null default 'pending' check (status in ('pending','reviewed','action_required')),
  gpa numeric(4,2) not null default 0,
  narrative text not null default '',
  submitted_at timestamptz,
  review_notes text
);

-- ============ Row Level Security ============
-- The web client calls Supabase with the anon key and no Supabase Auth session, so the
-- policies below grant the anon role full access — required for the keyless deployment
-- this app uses. Treat the anon key as the app's access token and keep it out of
-- untrusted hands. To harden later: enable Supabase Auth and swap 'anon' for
-- 'authenticated', then scope per-role.

alter table user_accounts enable row level security;
alter table login_logs enable row level security;
alter table applications enable row level security;
alter table beneficiaries enable row level security;
alter table partners enable row level security;
alter table transactions enable row level security;
alter table progress_reports enable row level security;

-- Helper predicate reused by every policy.
create or replace function apta_client_access() returns boolean as $$
  select auth.role() in ('anon','authenticated');
$$ language sql stable;

-- user_accounts: full client access (registration + login bookkeeping happen in-app).
drop policy if exists accounts_select on user_accounts;
create policy accounts_select on user_accounts for select using (apta_client_access());
drop policy if exists accounts_write on user_accounts;
create policy accounts_write on user_accounts for insert with check (apta_client_access());
drop policy if exists accounts_update on user_accounts;
create policy accounts_update on user_accounts for update using (apta_client_access());
drop policy if exists accounts_delete on user_accounts;
create policy accounts_delete on user_accounts for delete using (apta_client_access());

-- login_logs
drop policy if exists logs_select on login_logs;
create policy logs_select on login_logs for select using (apta_client_access());
drop policy if exists logs_insert on login_logs;
create policy logs_insert on login_logs for insert with check (apta_client_access());
drop policy if exists logs_update on login_logs;
create policy logs_update on login_logs for update using (apta_client_access());
drop policy if exists logs_delete on login_logs;
create policy logs_delete on login_logs for delete using (apta_client_access());

-- applications
drop policy if exists applications_select on applications;
create policy applications_select on applications for select using (apta_client_access());
drop policy if exists applications_insert on applications;
create policy applications_insert on applications for insert with check (apta_client_access());
drop policy if exists applications_update on applications;
create policy applications_update on applications for update using (apta_client_access());
drop policy if exists applications_delete on applications;
create policy applications_delete on applications for delete using (apta_client_access());

-- beneficiaries
drop policy if exists beneficiaries_select on beneficiaries;
create policy beneficiaries_select on beneficiaries for select using (apta_client_access());
drop policy if exists beneficiaries_insert on beneficiaries;
create policy beneficiaries_insert on beneficiaries for insert with check (apta_client_access());
drop policy if exists beneficiaries_update on beneficiaries;
create policy beneficiaries_update on beneficiaries for update using (apta_client_access());
drop policy if exists beneficiaries_delete on beneficiaries;
create policy beneficiaries_delete on beneficiaries for delete using (apta_client_access());

-- partners
drop policy if exists partners_select on partners;
create policy partners_select on partners for select using (apta_client_access());
drop policy if exists partners_insert on partners;
create policy partners_insert on partners for insert with check (apta_client_access());
drop policy if exists partners_update on partners;
create policy partners_update on partners for update using (apta_client_access());
drop policy if exists partners_delete on partners;
create policy partners_delete on partners for delete using (apta_client_access());

-- transactions
drop policy if exists transactions_select on transactions;
create policy transactions_select on transactions for select using (apta_client_access());
drop policy if exists transactions_insert on transactions;
create policy transactions_insert on transactions for insert with check (apta_client_access());
drop policy if exists transactions_update on transactions;
create policy transactions_update on transactions for update using (apta_client_access());
drop policy if exists transactions_delete on transactions;
create policy transactions_delete on transactions for delete using (apta_client_access());

-- progress_reports
drop policy if exists reports_select on progress_reports;
create policy reports_select on progress_reports for select using (apta_client_access());
drop policy if exists reports_insert on progress_reports;
create policy reports_insert on progress_reports for insert with check (apta_client_access());
drop policy if exists reports_update on progress_reports;
create policy reports_update on progress_reports for update using (apta_client_access());
drop policy if exists reports_delete on progress_reports;
create policy reports_delete on progress_reports for delete using (apta_client_access());

-- ============ updated_at trigger for applications ============
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists applications_updated_at on applications;
create trigger applications_updated_at before update on applications
for each row execute function set_updated_at();
