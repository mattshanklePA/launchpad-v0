-- LaunchPad — review workflow migration
-- Adds submission lifecycle status, ownership, business unit, and a comments
-- table. Safe to run more than once (IF NOT EXISTS / idempotent backfill).
--
-- Run in the Supabase SQL editor.

-- 1) Workflow columns on submissions ----------------------------------------
alter table submissions add column if not exists status        text;
alter table submissions add column if not exists owner_email   text;
alter table submissions add column if not exists business_unit text;

-- 2) Backfill from the JSON we've been storing in form_data ------------------
update submissions
set
  status        = coalesce(nullif(form_data->>'reviewStatus', ''), 'submitted'),
  owner_email   = lower(form_data->>'submitterEmail'),
  business_unit = form_data->>'submitterOffice'
where status is null;

-- Default for any rows inserted later without an explicit status.
alter table submissions alter column status set default 'submitted';

-- 3) Comments table ----------------------------------------------------------
create table if not exists submission_comments (
  id            uuid primary key default gen_random_uuid(),
  submission_id text        not null references submissions(id) on delete cascade,
  author_name   text        not null,
  author_role   text        not null,   -- 'submitter' | 'reviewer' | 'admin'
  body          text        not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_submission_comments_submission
  on submission_comments (submission_id);

-- 4) (Optional) seed comments that currently live in form_data.comments ------
-- If you've loaded the demo seed, this lifts any embedded comments into the
-- new table. Harmless to run with no embedded comments.
insert into submission_comments (submission_id, author_name, author_role, body, created_at)
select
  s.id,
  c->>'authorName',
  c->>'authorRole',
  c->>'body',
  coalesce((c->>'createdAt')::timestamptz, now())
from submissions s
cross join lateral jsonb_array_elements(coalesce(s.form_data->'comments', '[]'::jsonb)) as c
where not exists (
  select 1 from submission_comments sc where sc.submission_id = s.id
);
