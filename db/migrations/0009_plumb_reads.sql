-- 0009_plumb_reads.sql
-- The saved Plumb read (reviewer-assist analysis) for each record: the read
-- itself, when it was produced, and a fingerprint of the submission content it
-- was based on (lib/plumbRead.ts). Lets a record open with the saved read
-- instead of calling the AI again (issue #272). Add-only.
-- Safe to run more than once. Run in each tenant's Supabase project
-- (uspto, doc, dow, es2). Until it runs, the app reads on open as before and
-- saves nothing.

create table if not exists public.plumb_reads (
  submission_id text primary key,
  read          jsonb not null,
  fingerprint   text not null,
  saved_at      timestamptz not null default now()
);

-- Server access uses the service-role key, which bypasses RLS. Enable RLS with
-- no policies so the browser (anon key) can neither read nor write this table.
alter table public.plumb_reads enable row level security;
