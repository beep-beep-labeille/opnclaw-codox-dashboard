-- Supabase schema for Fiverr Agent Ops Dashboard
-- Run in Supabase SQL Editor.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  event_time timestamptz not null default now(),
  agent text,
  platform text,
  source_group text,
  post_url text,
  person text,
  profile_url text,
  action_type text,
  message text,
  status text,
  next_action text,
  due_date date,
  priority text,
  product text,
  offer_eur numeric,
  prob_pct numeric,
  result text,
  notes text,

  -- dedupe/idempotency key from OpenClaw (optional)
  event_key text unique
);

create index if not exists events_event_time_idx on public.events (event_time desc);
create index if not exists events_agent_idx on public.events (agent);
create index if not exists events_status_idx on public.events (status);
