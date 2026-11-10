-- 0008_ai_usage.sql
-- One row per AI call (lib/aiUsageLog.ts): tenant, action, submission (if any),
-- tokens in/out, duration, success. Counts only: no prompt or answer text.
-- Gives a cost-per-idea number per tenant.
-- Safe to run more than once. Run in each tenant's Supabase project
-- (uspto, doc, dow, es2). Until it runs, the app logs to the console only
-- and AI calls are unaffected.

create table if not exists public.ai_usage (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  tenant        text not null,
  action        text not null,
  submission_id text,
  tokens_in     int  not null default 0,
  tokens_out    int  not null default 0,
  duration_ms   int  not null default 0,
  success       boolean not null
);

create index if not exists ai_usage_created_at_idx on public.ai_usage (created_at desc);
create index if not exists ai_usage_action_idx on public.ai_usage (action);

-- Server writes use the service-role key, which bypasses RLS. Enable RLS with
-- no policies so the browser (anon key) can neither read nor write this table.
alter table public.ai_usage enable row level security;
