-- Supabase Auth setup for BridgeVoice
-- Run this after schema.sql

alter table if exists public.users
  add column if not exists email text unique;

-- Mirror new auth users into public.users
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, external_user_id, email, preferred_language)
  values (new.id, concat('auth:', new.id::text), new.email, 'English')
  on conflict (id) do update set
    email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

-- Allow authenticated users to read/update only their own user record.
create policy if not exists "users-can-read-own-profile"
on public.users
as permissive
for select
to authenticated
using (auth.uid() = id);

create policy if not exists "users-can-update-own-profile"
on public.users
as permissive
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
