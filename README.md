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
6. SQL Editor → **part4-limits** (per-account caps on rows and uploads; closes helper functions to anonymous callers).
7. SQL Editor → **part5-live** (`updated_at` on every table + Realtime publication: live updates and edit-conflict detection).
8. SQL Editor → **part6-quality** (email-domain allowlist for sign-ups, one open application per student, range checks). To accept another email domain later: Table Editor → `allowed_email_domains` → Insert row (set `is_suffix` for whole families like `ac.in`).
9. SQL Editor → **part7-disabled** (disabled accounts lose API access immediately; the last active admin can't be removed).
10. **First admin** (once): sign up on the live site, then in the SQL Editor
    `update user_accounts set role = 'admin' where email = '<their email>';` and sign in again.
    After that, admins manage everyone from **Users & access** (`/admin/users`): promote to staff/admin,
    demote, disable or re-enable. Admins can't change their own access, and the last admin is protected.
11. Push to `main`; Vercel builds and deploys.

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

## Deploying to Vercel

1. vercel.com → **Add New → Project** → import `khan-0910/APTA-funding`. Framework: **Vite**
   (picked up from `vercel.json`). Build `npm run build`, output `dist`. No env vars are required:
   the public Supabase URL and publishable key ship in `.env.production`, and the build detects
   Vercel and serves from `/`.
2. Deploy. Note the URL (e.g. `apta-funding.vercel.app`).
3. Supabase → Authentication → URL Configuration: set **Site URL** to the Vercel URL and add
   `https://<your-app>.vercel.app/**` to **Redirect URLs** (keep the GitHub Pages URL there too while
   both are live).
4. Optional: Vercel → Settings → Domains for a custom domain, then repeat step 3 for it.
5. Project → **Speed Insights** → **Enable**. The app already ships the `<SpeedInsights />`
   component (Vercel builds only; record ids are stripped from URLs before sending).
6. Once Vercel is the real site, disable GitHub Pages (Settings → Pages → Source: None) so there is
   one address to keep up to date.

`vercel.json` adds SPA rewrites and security headers (no framing, HSTS, nosniff, strict referrer,
locked-down browser permissions); the build also ships a Content-Security-Policy that only allows
this site and your own Supabase project.

## Keeping it free

Nothing in this project can create a bill as long as:

- **Supabase** stays on the **Free** plan with no card on the organisation. Free projects that go over
  a quota are restricted or paused, never charged. (Inactive Free projects pause after a week; the
  dashboard has a one-click restore.)
- **Vercel** stays on **Hobby** with no card. Speed Insights is used (included in Hobby; when the
  monthly allowance runs out it stops collecting until next month — it can't bill without a card).
  Don't enable paid add-ons (Web Analytics Plus, Edge Config, Blob, KV/Postgres, Image Optimization).
  Vercel's Hobby plan is officially for personal, non-commercial projects. An organisation's
  website is a grey area under their terms: hitting a limit pauses the site rather than billing,
  but if you want zero ambiguity, GitHub Pages (already set up) or Cloudflare Pages are free for
  organisations too.
- No secret keys exist anywhere in this repo or its history — only the **publishable** Supabase key,
  which is designed to be public and is limited by Row Level Security. Never add the
  `service_role` / `sb_secret_…` key to the frontend or to Vercel env vars.
- There are no server functions, cron jobs, paid APIs, email services or analytics. The contact page
  uses plain email/phone links, not a form backend.

Abuse limits already in place: RLS on every table (anonymous visitors read nothing but the
totals-only stats function), per-account caps on applications, reports and uploads (part 4),
5 MB / PDF-PNG-JPG-only private storage, GraphQL disabled, and the schema endpoint requires a secret key.

### Bot protection (recommended, free)

1. Cloudflare dashboard → **Turnstile** → Add widget → hostname = your Vercel domain → copy the
   **site key** and **secret key**.
2. Vercel → Settings → Environment Variables → `VITE_TURNSTILE_SITE_KEY` = site key → redeploy.
3. Check sign-in shows the Turnstile box, then Supabase → Authentication → **Bot and Abuse Protection**
   → enable CAPTCHA → Turnstile → paste the **secret** key.

Do step 3 last: once Supabase requires a CAPTCHA, a build without the site key can't sign anyone in.

### Also worth setting in Supabase (free)

- Authentication → Sign In / Up → **minimum password length 8** (the app already asks for 8).
- Authentication → Rate Limits: keep the defaults or lower sign-ups per hour.
- Database → Extensions: leave `pg_graphql` disabled.

## Several people at once

- **Live updates**: open browsers subscribe to Supabase Realtime, so new and edited records from
  other staff appear without reloading. Realtime applies the same RLS (students only receive their
  own rows). Login logs are not live.
- **Edit conflicts**: each row carries a database-stamped `updated_at`. Before saving a change to an
  existing row, the app checks the row hasn't changed since it was loaded; if someone else saved
  first, their version is kept and shown, and a notice asks the user to redo their edit. New rows
  never conflict (random ids).

## Backups & staying awake

- **Backups**: admins get **Backup (.json)** and **Spreadsheets (.csv)** buttons in the Database
  Viewer (header database icon). The JSON is complete and restorable; the CSVs open in Excel/Sheets
  (UTF-8 for Tamil, formula-injection-safe). Uploaded documents are not included — download those
  from Supabase → Storage → documents if needed. Free Supabase projects have no downloadable
  backups, so take one regularly (e.g. monthly) and keep it somewhere private: it contains personal data.
- **Keep-alive**: `.github/workflows/keep-alive.yml` makes one read-only request every 3 days so the
  free project never auto-pauses. GitHub turns scheduled workflows off after 60 days without commits
  to the repo; if that happens, Actions → "Keep Supabase awake" → **Enable workflow**.

## Contact & legal pages

`/contact`, `/privacy` and `/terms` read the organisation's details from `src/lib/site.ts`
(empty fields are simply hidden). Sign-up requires accepting the Privacy Policy and Terms; the
acceptance time and policy version are stored on the Supabase Auth user (`consent_at`,
`consent_version`). Bump `POLICY_VERSION` in `site.ts` when the policy changes.

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
