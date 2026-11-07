-- APTA Empowers — Supabase Auth migration, PART 1b (trigger fix)
-- Run in Dashboard → SQL Editor → New query → paste → Run. Idempotent: safe to re-run.
--
-- WHY: part 1's signup trigger always INSERTs a new user_accounts row. For the two
-- pre-existing accounts (admin@ / staff@) that insert violates the unique-email
-- constraint and fails the WHOLE signup ("duplicate key value violates unique
-- constraint user_accounts_email_key"). This patch makes the trigger LINK an
-- existing profile row (set auth_uid) when one already exists for that email,
-- and only insert when there is genuinely no profile yet.
--
-- After running this, the assistant will create the two Auth users via the public
-- signup API and the linking happens automatically.

create or replace function apta_handle_new_user() returns trigger as $$
begin
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

-- Done. No other changes — the trigger itself (on_auth_user_created) stays as-is.
