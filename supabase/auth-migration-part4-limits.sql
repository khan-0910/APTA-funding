-- APTA Empowers — PART 4: abuse limits (run after part 3). Idempotent.
--
-- Part 3 decides WHO may write; this part caps HOW MUCH one account can write, so a
-- throwaway sign-up can't fill the free-tier database (500 MB) or storage (1 GB).
-- On the Free plan hitting those limits pauses the project instead of billing you,
-- but either way the site would stop working — these caps keep it from getting there.

-- ---------- Helpers are for policies, not for the public API ----------
revoke execute on function apta_role() from public, anon;
revoke execute on function apta_my_id() from public, anon;
revoke execute on function apta_is_staff() from public, anon;
grant execute on function apta_role(), apta_my_id(), apta_is_staff() to authenticated;
-- apta_public_stats() stays callable by anon: it returns totals only.

-- Counting helpers (security definer so policies don't re-enter RLS).
create or replace function apta_my_count(tbl text) returns int as $$
declare n int;
begin
  if tbl = 'applications' then
    select count(*) into n from applications where student_id = apta_my_id();
  elsif tbl = 'progress_reports' then
    select count(*) into n from progress_reports where student_id = apta_my_id();
  elsif tbl = 'documents' then
    select count(*) into n from storage.objects
     where bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text;
  else
    n := 0;
  end if;
  return n;
end;
$$ language plpgsql stable security definer set search_path = public;
revoke execute on function apta_my_count(text) from public, anon;
grant execute on function apta_my_count(text) to authenticated;

-- ---------- applications: ≤ 20 per student, ≤ 256 KB each ----------
drop policy if exists applications_insert_auth on applications;
create policy applications_insert_auth on applications for insert to authenticated
  with check (
    apta_is_staff()
    or (student_id = apta_my_id()
        and status in ('draft', 'submitted')
        and apta_my_count('applications') < 20
        and pg_column_size(data) < 262144)
  );

create or replace function apta_guard_application() returns trigger as $$
begin
  if auth.role() = 'authenticated' and not apta_is_staff() then
    if new.status is distinct from old.status
      or new.student_id is distinct from old.student_id
      or new.data->'officeUseOnly' is distinct from old.data->'officeUseOnly'
      or new.data->>'status' is distinct from old.data->>'status' then
      raise exception 'Only staff can change an application''s decision';
    end if;
    if pg_column_size(new.data) >= 262144 then
      raise exception 'Application is too large';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- progress reports: ≤ 60 per student, sane text length ----------
drop policy if exists reports_insert_auth on progress_reports;
create policy reports_insert_auth on progress_reports for insert to authenticated
  with check (
    apta_is_staff()
    or (student_id = apta_my_id()
        and status = 'pending'
        and apta_my_count('progress_reports') < 60
        and char_length(narrative) <= 5000
        and char_length(semester) <= 60)
  );

-- ---------- login logs: bounded field sizes ----------
drop policy if exists logs_insert_auth on login_logs;
create policy logs_insert_auth on login_logs for insert to authenticated
  with check (
    (user_id is null or user_id = apta_my_id())
    and char_length(user_email) <= 320
    and char_length(coalesce(user_agent, '')) <= 300
    and char_length(coalesce(ip_address, '')) <= 64
  );

-- ---------- documents: ≤ 20 files per account (5 MB each via the bucket) ----------
drop policy if exists documents_insert on storage.objects;
create policy documents_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and apta_my_count('documents') < 20
  );

-- Done.
