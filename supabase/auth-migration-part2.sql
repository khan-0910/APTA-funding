-- APTA Empowers — Supabase Auth migration, PART 2 (LOCKDOWN)
-- Run in Dashboard → SQL Editor → New query → paste → Run. Idempotent: safe to re-run.
--
-- ⚠ THIS IS THE SECURITY BOUNDARY. Run it ONLY after the assistant has confirmed
-- that admin@aptaempowers.org and staff@aptaempowers.org can sign in via Supabase
-- Auth from the live site (part 1 + 1b applied, both Auth users seeded and verified).
--
-- What it does:
--   1. Drops every legacy anon policy from schema.sql ("the front door was open").
--      From now on, requests without a Supabase Auth session are REJECTED.
--   2. Keeps the part-1 `authenticated` policies exactly as they are:
--      read/insert/update for signed-in users, deletes admin-only (apta_role()).
--   3. Adds ONE narrow exception for the public landing page, which shows headline
--      stats (students funded, amount disbursed) while the visitor is logged out.
--      It exposes nothing but aggregate numbers via the apta_public_stats() view —
--      no names, emails, contact details or per-row application data.
--   4. Removes the now-unused apta_client_access() helper.

-- ---------- 1) Drop every legacy anon policy ----------
drop policy if exists accounts_select  on user_accounts;
drop policy if exists accounts_write   on user_accounts;
drop policy if exists accounts_update  on user_accounts;
drop policy if exists accounts_delete  on user_accounts;

drop policy if exists logs_select  on login_logs;
drop policy if exists logs_insert  on login_logs;
drop policy if exists logs_update  on login_logs;
drop policy if exists logs_delete  on login_logs;

drop policy if exists applications_select  on applications;
drop policy if exists applications_insert  on applications;
drop policy if exists applications_update  on applications;
drop policy if exists applications_delete  on applications;

drop policy if exists beneficiaries_select  on beneficiaries;
drop policy if exists beneficiaries_insert  on beneficiaries;
drop policy if exists beneficiaries_update  on beneficiaries;
drop policy if exists beneficiaries_delete  on beneficiaries;

drop policy if exists partners_select  on partners;
drop policy if exists partners_insert  on partners;
drop policy if exists partners_update  on partners;
drop policy if exists partners_delete  on partners;

drop policy if exists transactions_select  on transactions;
drop policy if exists transactions_insert  on transactions;
drop policy if exists transactions_update  on transactions;
drop policy if exists transactions_delete  on transactions;

drop policy if exists reports_select  on progress_reports;
drop policy if exists reports_insert  on progress_reports;
drop policy if exists reports_update  on progress_reports;
drop policy if exists reports_delete  on progress_reports;

-- ---------- 2) Public landing-page stats (the ONLY anon-visible surface) ----------
-- A tiny security-definer function returning aggregate numbers only. Call with
-- supabase.rpc('apta_public_stats'). No PII: no names, no emails, no rows.
create or replace function apta_public_stats()
returns json
as $$
  select json_build_object(
    'studentsFunded', (select count(*) from beneficiaries),
    'amountDisbursed', (select coalesce(sum(funding_received), 0) from beneficiaries),
    'inflowTotal', (select coalesce(sum(amount), 0) from transactions where direction = 'inflow'),
    -- Matches the landing page: completed OR already employed after graduation.
    'graduated', (select count(*) from beneficiaries
                   where status = 'completed' or career_survey->>'status' = 'already_employed'),
    'employed', (select count(*) from beneficiaries where career_survey->>'status' = 'already_employed'),
    'partners', (select count(*) from partners)
  );
$$ language sql stable security definer set search_path = public;

grant execute on function apta_public_stats() to anon, authenticated;

-- ---------- 3) Retire the legacy helper ----------
drop function if exists apta_client_access();

-- ---------- Done. The assistant verifies the lockdown from the outside. ----------
