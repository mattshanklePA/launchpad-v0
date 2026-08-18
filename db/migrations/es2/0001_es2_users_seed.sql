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
-- `job_role` values come from es2.ts's `submitterRoles`, the same list step 1
-- of intake offers and User Management now assigns from (ES2-13; the column
-- used to be null throughout because that dropdown was USPTO-shaped and had no
-- ES2 values to offer). It is what step 1 pre-fills from the session, so each
-- account carries the role that person files under in
-- lib/seedSubmissionsEs2.ts's form_data.submitterRole. A value that isn't in
-- es2.ts renders as a raw code on screen.
--
-- Demo password for every account: 'launchpad'. Plaintext, demo only — see the
-- note on the users table in 0000_es2_base_schema.sql.

-- ─── Enterprise admin ─────────────────────────────────────────────────────
-- No business_unit, so this account gets the enterprise-wide roll-up
-- (lib/dashboard/scope.ts's department level), not one program office's slice.
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-avery-lang', 'avery.lang@es2.demo', 'Avery Lang', 'admin', 'launchpad', 'contracting_officer', null, null, now()
where not exists (select 1 from users where email = 'avery.lang@es2.demo');

-- ─── Program-office reviewers (one per program office) ────────────────────
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-alan-brooks', 'alan.brooks@es2.demo', 'Alan Brooks', 'reviewer', 'launchpad', 'program_manager', 'atr', null, now()
where not exists (select 1 from users where email = 'alan.brooks@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-jordan-pierce', 'jordan.pierce@es2.demo', 'Jordan Pierce', 'reviewer', 'launchpad', 'program_manager', 'hrfm', null, now()
where not exists (select 1 from users where email = 'jordan.pierce@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-karen-udall', 'karen.udall@es2.demo', 'Karen Udall', 'reviewer', 'launchpad', 'program_manager', 'logfin', null, now()
where not exists (select 1 from users where email = 'karen.udall@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-derek-hsu', 'derek.hsu@es2.demo', 'Derek Hsu', 'reviewer', 'launchpad', 'program_manager', 'bts', null, now()
where not exists (select 1 from users where email = 'derek.hsu@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-maria-santos', 'maria.santos@es2.demo', 'Maria Santos', 'reviewer', 'launchpad', 'program_manager', 'cerp', null, now()
where not exists (select 1 from users where email = 'maria.santos@es2.demo');

-- ─── AT&R program-level reviewer ──────────────────────────────────────────
-- Scoped to one program under AT&R, so the office roll-down
-- (visibleSubmissions in lib/reviewWorkflow.ts) is demonstrable: this account
-- sees ACWS submissions only, not all of AT&R's.
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-nora-quist', 'nora.quist@es2.demo', 'Nora Quist', 'reviewer', 'launchpad', 'program_manager', 'atr', 'acws', now()
where not exists (select 1 from users where email = 'nora.quist@es2.demo');

-- ─── Submitters ───────────────────────────────────────────────────────────
-- Each email owns at least one submission in lib/seedSubmissionsEs2.ts.
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-dana-whitfield', 'dana.whitfield@es2.demo', 'Dana Whitfield', 'submitter', 'launchpad', 'contract_specialist', 'atr', 'acws', now()
where not exists (select 1 from users where email = 'dana.whitfield@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-marcus-bell', 'marcus.bell@es2.demo', 'Marcus Bell', 'submitter', 'launchpad', 'analyst', 'atr', 'acws', now()
where not exists (select 1 from users where email = 'marcus.bell@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-priya-nair', 'priya.nair@es2.demo', 'Priya Nair', 'submitter', 'launchpad', 'training_developer', 'atr', 'atis', now()
where not exists (select 1 from users where email = 'priya.nair@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-lena-okafor', 'lena.okafor@es2.demo', 'Lena Okafor', 'submitter', 'launchpad', 'analyst', 'atr', 'fmsaces', now()
where not exists (select 1 from users where email = 'lena.okafor@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-victor-hale', 'victor.hale@es2.demo', 'Victor Hale', 'submitter', 'launchpad', 'product_owner', 'atr', 'digitalmarket', now()
where not exists (select 1 from users where email = 'victor.hale@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-sofia-marquez', 'sofia.marquez@es2.demo', 'Sofia Marquez', 'submitter', 'launchpad', 'contracting_officer', 'logfin', null, now()
where not exists (select 1 from users where email = 'sofia.marquez@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-andre-duval', 'andre.duval@es2.demo', 'Andre Duval', 'submitter', 'launchpad', 'developer', 'bts', null, now()
where not exists (select 1 from users where email = 'andre.duval@es2.demo');
insert into users (id, email, name, role, password, job_role, business_unit, office, created_at)
select 'user-es2-renee-calder', 'renee.calder@es2.demo', 'Renee Calder', 'submitter', 'launchpad', 'it_staff', 'hrfm', null, now()
where not exists (select 1 from users where email = 'renee.calder@es2.demo');

-- ─── Verification ─────────────────────────────────────────────────────────
-- Expect 15 rows: 1 admin, 6 reviewers, 8 submitters.
select role, count(*) from users group by role order by role;
