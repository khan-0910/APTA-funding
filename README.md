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

The app ships with **no mock data**. On first run everything is empty — create your own
accounts at `/register` (Student, Staff, or Admin) and fill in your own applications,
beneficiaries, partners, ledger entries, and reports.

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
