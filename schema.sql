-- BridgeVoice Supabase schema

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  external_user_id text unique,
  preferred_language text not null default 'English',
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  external_session_id text not null unique,
  source_language text not null default 'English',
  target_language text not null default 'Spanish',
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  transcript_text text not null,
  translated_text text,
  source_language text not null default 'English',
  target_language text not null default 'Spanish',
  created_at timestamptz not null default now()
);

create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null unique references public.visits(id) on delete cascade,
  summary_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_visits_external_session_id
  on public.visits(external_session_id);

create index if not exists idx_transcripts_visit_id
  on public.transcripts(visit_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_summaries_updated_at on public.summaries;
create trigger trg_summaries_updated_at
before update on public.summaries
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.visits enable row level security;
alter table public.transcripts enable row level security;
alter table public.summaries enable row level security;

-- Starter policy for authenticated app backend access.
create policy if not exists "service-role-full-access"
on public.users
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists "service-role-full-access"
on public.visits
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists "service-role-full-access"
on public.transcripts
as permissive
for all
to service_role
using (true)
with check (true);

create policy if not exists "service-role-full-access"
on public.summaries
as permissive
for all
to service_role
using (true)
with check (true);
