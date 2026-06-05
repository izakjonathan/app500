-- Rummy 500 Supabase Game Library
-- Run this in Supabase SQL Editor.

create table if not exists public.rummy_game_library (
  id text primary key,
  game_name text not null default 'Untitled game',
  game_state jsonb not null,
  players text,
  player_count integer not null default 0,
  target_score integer not null default 1500,
  rounds_count integer not null default 0,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists rummy_game_library_updated_at_idx
on public.rummy_game_library (updated_at desc);

create index if not exists rummy_game_library_archived_idx
on public.rummy_game_library (archived);

alter table public.rummy_game_library enable row level security;

-- Current app model: anyone with the app/link can read/write shared games.
-- Do not use this policy for sensitive data.
drop policy if exists "public read rummy game library" on public.rummy_game_library;
create policy "public read rummy game library"
on public.rummy_game_library
for select
using (true);

drop policy if exists "public insert rummy game library" on public.rummy_game_library;
create policy "public insert rummy game library"
on public.rummy_game_library
for insert
with check (true);

drop policy if exists "public update rummy game library" on public.rummy_game_library;
create policy "public update rummy game library"
on public.rummy_game_library
for update
using (true)
with check (true);

drop policy if exists "public delete rummy game library" on public.rummy_game_library;
create policy "public delete rummy game library"
on public.rummy_game_library
for delete
using (true);
