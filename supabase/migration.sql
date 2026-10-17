-- smthmind opt-in sync schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query)

create table if not exists public.entries (
  id bigint primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tag text not null default '',
  mood text not null,
  text text not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.entries enable row level security;

-- Each signed-in user can only read and write their own rows.
create policy "entries own rows"
  on public.entries
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Timestamps are maintained client-side (updated_at) so that
-- last-write-wins across devices works with clock skew tolerance.
-- updated_at is set by the client on every insert/update.
