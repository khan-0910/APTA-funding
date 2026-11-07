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
2. **Run `supabase/auth-migration-part1.sql`, then `supabase/auth-migration-part1b.sql`** (idempotent, backwards-safe): adds
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

### Go-live checklist

0. **Project is awake.** Free-tier Supabase projects pause after inactivity; the
   `<ref>.supabase.co` host then stops resolving and the live site shows no data. Dashboard →
   **Restore project**.
1. Authentication settings as above. Site URL = the live URL; also add it (and
   `http://localhost:5173/APTA-funding/`) under **Redirect URLs** so confirmation and reset links work.
2. SQL Editor → **part1**, then **part1b**.
   Check: `select count(*) from user_accounts where auth_uid is not null;`
3. Sign up / link the admin + staff emails (step 3 above) and **sign in on the live site** as admin.
4. SQL Editor → **part2** (drops anonymous access).
   Check: in a private window the homepage numbers still load, dashboards show nothing until sign-in.
5. SQL Editor → **part3-roles** (per-role access + document storage). From here:
   - students only see their own profile, applications, beneficiary record and progress reports;
   - only staff/admin can approve, edit funding, the ledger or partners; only an admin can change
     anyone's role (enforced by triggers, not just the UI);
   - documents go to the private `documents` Storage bucket (PDF/PNG/JPG, 5 MB), readable by the
     owner and staff through 60-second signed links.
   Legacy (pre-Auth) users sign up again with the same email; part 1b links their old profile.
6. Push to `main`; GitHub Actions builds and deploys.

### Email confirmation & SMTP

Supabase's built-in mailer is rate-limited (a few emails an hour) and meant for testing. Before
turning **Confirm email** on:

1. Create an SMTP account (Resend, Postmark, Amazon SES, Brevo… any works) and verify a sending
   domain, e.g. `mail.aptaempowers.org`.
2. Dashboard → Authentication → **SMTP Settings** → enable custom SMTP, paste host/port/user/password,
   sender `no-reply@…`.
3. Authentication → Sign In / Up → turn **Confirm email** on.

The app already handles it: sign-up shows "check your email", the link returns to `/login`, and an
admin creating a staff account still gets the role applied immediately.

### Custom domain

1. Settings → Pages → Custom domain → `www.example.org` (GitHub adds a `CNAME`); add the DNS record
   GitHub shows.
2. Settings → Secrets and variables → Actions → **Variables** → `SITE_BASE` = `/`.
3. Update Supabase Site URL / Redirect URLs to the new domain, then re-run the deploy.

Routing, the 404 deep-link fallback and auth redirects all follow `SITE_BASE`.

## Feature Map

- **Landing (`/`)** — GSAP scroll-driven homepage: masked headline reveal, count-up impact numbers (aggregate-only RPC for visitors), scroll-lit mission statement, pinned "How it works" with a progress rail. Honours `prefers-reduced-motion`.
- **Language** — header switch between English and English + தமிழ். Every Tamil string sits in a `.ta` element, so English mode is one CSS rule; plain strings (`<option>`, placeholders) go through `useBi()`, runtime messages through `<T>` (`src/lib/lang.tsx`).
- **Application form (`/applications/new`)** — 8 sections matching the physical Salem form, side-by-side Tamil on every field, Aadhaar & +91 phone masks, conditional School/College fields, live Indian academic-calendar projection (July–May session, 4-year completion window), multi-file uploader (PDF/PNG/JPG, stored in Supabase Storage), sign-in required, and the exact bilingual Zakkath undertaking.
- **Application detail (`/applications/:id`)** — multi-tab bilingual record, Page-8 Office-Use-Only review (field notes, verification checklist, sanction, NEFT/cheque ref), staff Approve/Reject with notes (auto-creates a beneficiary), and 1-click print (`window.print()` with a clean `@media print` layout).
- **My Applications (`/applications`)** — status tracking, search, graduation-milestone banner for final-year students opening the Career & Salary Survey.
- **Career survey modal** — 5 employment statuses with conditional fields (offer details + salary, placement-help with resume + mentor opt-in, PG program, exam prep, entrepreneurship). Persists to both the Application and Beneficiary records.
- **Beneficiaries dashboard (`/dashboard/beneficiaries`, staff only)** — funding KPIs, placement rate & average starting salary, actionable "seeking help" alert list, 12-month funding-trajectory area chart, category/level allocation bars, roster with color-coded career badges, Add Beneficiary dialog.
- **Progress reports** — students submit semester GPA reports (`/progress-reports`); staff review them with notes (`/staff/progress-reports`).
- **Accounting (`/staff/accounting`)** — inflow/outflow ledger with an Add Entry dialog, net balance, 1-click reconciliation toggles.
- **Partners (`/staff/partners`)** — CSR/NGO/foundation directory with contributions.
- **Accounts & audit** — `/register` + `/login` with per-account login counts; every auth event (LOGIN_SUCCESS / LOGIN_FAILED / ACCOUNT_CREATED / LOGOUT) logged with user-agent and timestamp (the browser can't see its public IP; Supabase's auth logs have it); staff/admin Database Viewer modal (header DB icon) with an admin-only **Clear All Data** action (wipes local storage and all Supabase tables).

## Architecture

- React 18 + TypeScript (strict) + Vite + React Router v6.
- Tailwind CSS v4, light theme only: blue `primary`, a little gold (`amber-*` is overridden), slate `surface`. Inter for UI, Source Serif 4 for homepage display type, Noto Sans Tamil.
- Motion: GSAP (ScrollTrigger + SplitText) on the homepage only; app screens keep to short fades for modals, drawers and page changes.
- The header **DEV role switcher only exists in `npm run dev`**. Production builds always use the role stored on the account.
- **Persistence**: Supabase PostgreSQL when configured — hydrate on load, re-fetch on sign-in/out, and push **only the rows that changed** (rows are replaced immutably, so "changed" is an identity check against the last synced copy; a row RLS rejects is retried on its own so it can't block the rest). Otherwise localStorage (`apta-*` keys). Production builds ship a Content-Security-Policy meta tag (`vite.config.ts`).
- Heavy staff screens (charts) and the application form are lazy-loaded routes.
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
