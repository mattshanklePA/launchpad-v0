-- Keystone — Army CPE ES2 (es2 tenant) user seed.
--
-- Run AFTER 0000_es2_base_schema.sql. Submissions seed separately, through the
-- app's /api/seed route on first load (lib/seedSubmissionsEs2.ts).
--
-- Idempotent: every insert is guarded by a `where not exists` on email, so
-- re-running this file is a no-op rather than a duplicate-key error.
--
-- SUBMITTER EMAILS ARE LOAD-BEARING. Each one below must exactly match a
-- `submitterEmail` in lib/seedSubmissionsEs2.ts — a reviewer's scoped views
-- resolve through owner_email, so a mismatch shows an empty queue rather than
-- an error. lib/seedSubmissionsEs2.test.ts asserts the two lists agree.
--
-- `business_unit` values are ES2 program-office codes and `office` values are
-- AT&R program codes, both from lib/tenant/es2.ts. A code that isn't in that
-- file renders as a raw enum on screen.
--
-- `job_role` is null throughout: that column feeds a USPTO-shaped dropdown
-- (JOB_ROLE_OPTIONS in components/admin/user-management.tsx) that has no ES2
-- values yet, and null renders as "Not set" rather than a raw code. The
-- submitter's actual role is carried per submission in form_data.submitterRole,
-- which does come from es2.ts's `submitterRoles`.
--
-- Demo password for every account: 'launchpad'. Plaintext, demo only — see the
-- note on the users table in 0000_es2_base_schema.sql.

-- ─── Enterprise admin ─────────────────────────────────────────────────────
-- No business_unit, so this account gets the enterprise-wide roll-up
-- (lib/dashboard/scope.ts's department level), not one program office's slice.
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-avery-lang', 'avery.lang@es2.demo', 'Avery Lang', 'admin', 'launchpad', null, null, null, now()
where not exists (select 1 from users where email = 'avery.lang@es2.demo');

-- ─── Program-office reviewers (one per program office) ────────────────────
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-alan-brooks', 'alan.brooks@es2.demo', 'Alan Brooks', 'reviewer', 'launchpad', null, 'atr', null, now()
where not exists (select 1 from users where email = 'alan.brooks@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-jordan-pierce', 'jordan.pierce@es2.demo', 'Jordan Pierce', 'reviewer', 'launchpad', null, 'hrfm', null, now()
where not exists (select 1 from users where email = 'jordan.pierce@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-karen-udall', 'karen.udall@es2.demo', 'Karen Udall', 'reviewer', 'launchpad', null, 'logfin', null, now()
where not exists (select 1 from users where email = 'karen.udall@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-derek-hsu', 'derek.hsu@es2.demo', 'Derek Hsu', 'reviewer', 'launchpad', null, 'bts', null, now()
where not exists (select 1 from users where email = 'derek.hsu@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-maria-santos', 'maria.santos@es2.demo', 'Maria Santos', 'reviewer', 'launchpad', null, 'cerp', null, now()
where not exists (select 1 from users where email = 'maria.santos@es2.demo');

-- ─── AT&R program-level reviewer ──────────────────────────────────────────
-- Scoped to one program under AT&R, so the office roll-down
-- (visibleSubmissions in lib/reviewWorkflow.ts) is demonstrable: this account
-- sees ACWS submissions only, not all of AT&R's.
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-nora-quist', 'nora.quist@es2.demo', 'Nora Quist', 'reviewer', 'launchpad', null, 'atr', 'acws', now()
where not exists (select 1 from users where email = 'nora.quist@es2.demo');

-- ─── Submitters ───────────────────────────────────────────────────────────
-- Each email owns at least one submission in lib/seedSubmissionsEs2.ts.
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-dana-whitfield', 'dana.whitfield@es2.demo', 'Dana Whitfield', 'submitter', 'launchpad', null, 'atr', 'acws', now()
where not exists (select 1 from users where email = 'dana.whitfield@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-marcus-bell', 'marcus.bell@es2.demo', 'Marcus Bell', 'submitter', 'launchpad', null, 'atr', 'acws', now()
where not exists (select 1 from users where email = 'marcus.bell@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-priya-nair', 'priya.nair@es2.demo', 'Priya Nair', 'submitter', 'launchpad', null, 'atr', 'atis', now()
where not exists (select 1 from users where email = 'priya.nair@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-lena-okafor', 'lena.okafor@es2.demo', 'Lena Okafor', 'submitter', 'launchpad', null, 'atr', 'fmsaces', now()
where not exists (select 1 from users where email = 'lena.okafor@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-victor-hale', 'victor.hale@es2.demo', 'Victor Hale', 'submitter', 'launchpad', null, 'atr', 'digitalmarket', now()
where not exists (select 1 from users where email = 'victor.hale@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-sofia-marquez', 'sofia.marquez@es2.demo', 'Sofia Marquez', 'submitter', 'launchpad', null, 'logfin', null, now()
where not exists (select 1 from users where email = 'sofia.marquez@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-andre-duval', 'andre.duval@es2.demo', 'Andre Duval', 'submitter', 'launchpad', null, 'bts', null, now()
where not exists (select 1 from users where email = 'andre.duval@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-renee-calder', 'renee.calder@es2.demo', 'Renee Calder', 'submitter', 'launchpad', null, 'hrfm', null, now()
where not exists (select 1 from users where email = 'renee.calder@es2.demo');

-- ─── Verification ─────────────────────────────────────────────────────────
-- Expect 15 rows: 1 admin, 6 reviewers, 8 submitters.
select role, count(*) from users group by role order by role;
