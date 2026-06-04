-- LaunchPad — fix demo data after the review-workflow migration.
--
-- The seed submissions were inserted into prod BEFORE the seed gained the
-- reviewStatus / comments fields. The seed only runs on an empty table, so the
-- existing rows never picked them up, and 0001's backfill defaulted every row's
-- status to 'submitted'. This sets the intended varied statuses and restores the
-- trademark Needs-Info comment so the pipeline + feedback-loop demo look right.
--
-- Idempotent. Run in the Supabase SQL editor after 0001_review_workflow.sql.

update submissions set status = 'in_review'  where id = 'seed-patents-prior-art';
update submissions set status = 'needs_info' where id = 'seed-trademarks-confusion';
update submissions set status = 'submitted'  where id = 'seed-hr-onboarding';
update submissions set status = 'approved'   where id = 'seed-ocio-ticket-triage';
update submissions set status = 'rejected'   where id = 'seed-ogc-foia';

-- Mirror status into form_data so both read paths agree.
update submissions
set form_data = form_data || jsonb_build_object('reviewStatus', status)
where id like 'seed-%';

-- Add the reviewer's Needs-Info comment to the trademark idea. form_data is what
-- the app reads today; the table insert keeps the new comments table in sync.
update submissions
set form_data = jsonb_set(
  form_data,
  '{comments}',
  jsonb_build_array(jsonb_build_object(
    'id', 'c-tm-1',
    'authorName', 'Jonathan Moody',
    'authorRole', 'reviewer',
    'body', 'Strong direction. Before I can score this, put a number on examiner hours saved per application with a baseline source — right now the value is directional.',
    'createdAt', '2026-05-31T12:00:00Z'
  ))
)
where id = 'seed-trademarks-confusion';

insert into submission_comments (submission_id, author_name, author_role, body, created_at)
select 'seed-trademarks-confusion', 'Jonathan Moody', 'reviewer',
  'Strong direction. Before I can score this, put a number on examiner hours saved per application with a baseline source — right now the value is directional.',
  now()
where not exists (
  select 1 from submission_comments where submission_id = 'seed-trademarks-confusion'
);
