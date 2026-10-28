-- 0006_ai_failures.sql
-- Record of structured AI calls that needed a repair, a retry, or fell back to
-- canned text (lib/aiFailureLog.ts). Lets a demo-day failure be investigated
-- after the hosting provider's short runtime-log window has passed.
-- Safe to run more than once. Run in each tenant's Supabase project
-- (uspto, doc, dow, es2). Until it runs, the app logs to the console only.

create table if not exists public.ai_failures (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  tenant        text not null,
  label         text not null,
  outcome       text not null check (outcome in ('repaired', 'retried', 'failed')),
  attempt       int  not null,
  model_id      text,
  error_name    text,
  error_message text,
  raw_text      text
);

create index if not exists ai_failures_created_at_idx on public.ai_failures (created_at desc);

-- Server writes use the service-role key, which bypasses RLS. Enable RLS with
-- no policies so the browser (anon key) can neither read nor write this table.
alter table public.ai_failures enable row level security;
