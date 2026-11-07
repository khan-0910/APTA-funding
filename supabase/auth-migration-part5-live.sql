-- APTA Empowers — PART 5: live updates + edit-conflict detection (run after part 4). Idempotent.
--
-- 1. Every table gets an updated_at that the database stamps on each change. The app
--    remembers the version it last saw; if the row changed since, it refuses to
--    overwrite it and shows the latest version instead of silently losing someone's edit.
-- 2. Tables are added to Supabase Realtime so open browsers receive changes as they
--    happen. Realtime applies the same Row Level Security: students only receive their
--    own rows. (Free plan: 200 concurrent connections, 2M messages/month; no billing.)

-- ---------- 1) updated_at on every table ----------
alter table user_accounts    add column if not exists updated_at timestamptz not null default now();
alter table beneficiaries    add column if not exists updated_at timestamptz not null default now();
alter table transactions     add column if not exists updated_at timestamptz not null default now();
alter table partners         add column if not exists updated_at timestamptz not null default now();
alter table progress_reports add column if not exists updated_at timestamptz not null default now();
-- applications already has updated_at (schema.sql)

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['applications', 'beneficiaries', 'transactions', 'partners', 'progress_reports', 'user_accounts'] loop
    execute format('drop trigger if exists %I on %I', t || '_updated_at', t);
    -- Named "<table>_updated_at" so it sorts after the apta_guard_* triggers (they compare old/new first).
    execute format('create trigger %I before update on %I for each row execute function set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- ---------- 2) Realtime ----------
do $$
declare t text;
begin
  foreach t in array array['applications', 'beneficiaries', 'transactions', 'partners', 'progress_reports', 'user_accounts'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Done. login_logs is deliberately not live (high volume, staff-only, low value).
