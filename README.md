# APTA Empowers — Education & Social Welfare Platform

Bilingual (English + தமிழ்) education funding, scholarship management, and social welfare platform for Salem, Tamil Nadu — powered by APTA (All Praise To Allah).

## Quick Start

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # tsc -b && vite build (strict TS, 0 errors)
npm run typecheck  # tsc -b only
```

## Your Data, From Zero

The app ships with **no mock data**. On first run everything is empty — students register
themselves at `/register`; **Staff and Admin accounts are created by a signed-in Admin**
(also via `/register`, where the privileged roles appear only for them). Fill in your own
applications, beneficiaries, partners, ledger entries, and reports.

A DEV role switcher in the header instantly toggles Student / Staff / Admin views without
logging out (handy for trying each role against your own data).

## Connect Supabase (recommended)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste `supabase/schema.sql`, and Run. It creates all
   7 tables with RLS and is safe to re-run.
3. Copy `.env.example` to `.env.local` and fill in your project URL + anon key
   (Project Settings → API).
4. Restart the dev server. The app hydrates from PostgreSQL at startup and every mutation
   syncs to the cloud within ~1 second — all 7 tables, both reads and writes.

Without Supabase configured, the app runs entirely on this device's localStorage with the
same behavior and no errors.

## Authentication & the Supabase Auth migration

Sign-in tries **Supabase Auth first**, then falls back to the legacy custom-hash check, so
accounts migrated in either order keep working. Password reset (“Forgot password?” on the
sign-in page) uses Supabase Auth emails and lands on `/reset`.

One-time migration runbook (Dashboard → SQL Editor + Authentication settings):

1. **Dashboard → Authentication**:
   - Providers → keep **Email** enabled.
   - Sign In / Up → turn **OFF “Confirm email”** (no SMTP/confirmation flow yet).
   - URL Configuration → Site URL: `https://khan-0910.github.io/APTA-funding/`.
2. **Run `supabase/auth-migration-part1.sql`** (idempotent, backwards-safe): adds
   `user_accounts.auth_uid`, authenticated-role policies (deletes admin-only), and a
   signup trigger that auto-creates the profile row — always with role `student`;
   client-supplied roles are never trusted.
3. **Seed the existing admin/staff accounts** into Auth (one-time): sign up each email at
   `/register`, or insert via SQL, then link and promote from the SQL editor:
   ```sql
   update user_accounts set auth_uid = (select id from auth.users where email = 'admin@aptaempowers.org')
     where email = 'admin@aptaempowers.org' and role = 'admin';
   update user_accounts set auth_uid = (select id from auth.users where email = 'staff@aptaempowers.org')
     where email = 'staff@aptaempowers.org' and role = 'staff';
   ```
   Users whose row has an `auth_uid` must sign in with their **Auth password** (the legacy
   hash is ignored for them).
4. **Lock down (part 2, only after step 3 is verified)**: drop the legacy anon-CRUD
   policies so every table requires a real Auth session; keep a read-only policy for the
   landing-page stats. Script: `supabase/auth-migration-part2.sql`.

## Feature Map

- **Landing (`/`)** — bilingual hero, live impact stats computed from your data, 3-step How It Works.
- **Application form (`/applications/new`)** — 8 sections matching the physical Salem form, side-by-side Tamil on every field, Aadhaar & +91 phone masks, conditional School/College fields, live Indian academic-calendar projection (July–May session, 4-year completion window), multi-file uploader, and the exact bilingual Zakkath undertaking.
- **Application detail (`/applications/:id`)** — multi-tab bilingual record, Page-8 Office-Use-Only review (field notes, verification checklist, sanction, NEFT/cheque ref), staff Approve/Reject with notes (auto-creates a beneficiary), and 1-click print (`window.print()` with a clean `@media print` layout).
- **My Applications (`/applications`)** — status tracking, search, graduation-milestone banner for final-year students opening the Career & Salary Survey.
- **Career survey modal** — 5 employment statuses with conditional fields (offer details + salary, placement-help with resume + mentor opt-in, PG program, exam prep, entrepreneurship). Persists to both the Application and Beneficiary records.
- **Beneficiaries dashboard (`/dashboard/beneficiaries`)** — funding KPIs, placement rate & average starting salary, actionable "seeking help" alert list, 12-month funding-trajectory area chart, category/level allocation bars, roster with color-coded career badges, Add Beneficiary dialog.
- **Progress reports** — students submit semester GPA reports (`/progress-reports`); staff review them with notes (`/staff/progress-reports`).
- **Accounting (`/staff/accounting`)** — inflow/outflow ledger with an Add Entry dialog, net balance, 1-click reconciliation toggles.
- **Partners (`/staff/partners`)** — CSR/NGO/foundation directory with contributions.
- **Accounts & audit** — `/register` + `/login` with per-account login counts; every auth event (LOGIN_SUCCESS / LOGIN_FAILED / ACCOUNT_CREATED / LOGOUT) logged with IP, user-agent, timestamp; staff/admin Database Viewer modal (header DB icon) with an admin-only **Clear All Data** action (wipes local storage and all Supabase tables).

## Architecture

- React 18 + TypeScript (strict) + Vite + React Router v6.
- Tailwind CSS v4 (`@custom-variant dark`) with the APTA palette: deep teal `primary`, warm amber accent, slate surfaces. Glassmorphic cards (`.glass-card`, `.glass-sidebar`), persistent dark mode (`apta-theme`).
- **Dual-layer persistence**: Supabase PostgreSQL is the source of truth when configured (hydrate on load + push on every mutation, all 7 tables). Otherwise localStorage (`apta-*` keys) is used with zero seed data. 200–300 ms simulated latency keeps interactions consistent. See `supabase/schema.sql` (RLS included).
- Icons: lucide-react. Charts: Recharts.

## Project Layout

```
src/
  lib/        types, format (INR/phone/Aadhaar), academic calendar engine,
              dual-layer persistence (Supabase + localStorage), store & auth contexts
  components/ AppShell (sidebar/header/role switcher), UI kit,
              career-transition-modal, DatabaseViewerModal
  pages/      Landing, Login, Register, New Application, My Applications,
              Application Detail, Beneficiaries, Progress Reports (student/staff),
              Accounting, Partners, 404
supabase/schema.sql
```
