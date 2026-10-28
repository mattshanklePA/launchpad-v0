-- 0007_demo_reset_stamp.sql
-- Remembers when "Reset Demo Data" last ran, so every visitor's browser can
-- clear its leftover unsubmitted drafts once per reset (lib/demoReset.ts).
-- Single-row table, same pattern as form_config. Safe to run more than once.
-- Run in each tenant's Supabase project that uses the reset (uspto, doc, es2).
-- Until it runs, Reset Demo Data still clears the clicking admin's own
-- browser; other browsers simply aren't told about the reset.

create table if not exists public.demo_state (
  id             int primary key default 1,
  last_reset_at  timestamptz,
  constraint demo_state_single_row check (id = 1)
);

insert into public.demo_state (id) values (1) on conflict (id) do nothing;

-- Read and written only by the server (service-role key bypasses RLS).
alter table public.demo_state enable row level security;
