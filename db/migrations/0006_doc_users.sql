-- LaunchPad — Department of Commerce (doc tenant) users: department admin,
-- one bureau deputy-CIO reviewer per bureau with seeded submissions, and one
-- submitter, so the roll-up (admin sees every bureau) / roll-down (reviewer
-- sees only their bureau) demo works end to end. Idempotent (guarded inserts).
-- Demo password for all new accounts: 'launchpad'.

-- Department admin (roll-up: sees every bureau) ---------------------------
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-doug-freeman', 'doug.freeman@doc.gov', 'Doug Freeman', 'admin', 'launchpad', null, null, now()
where not exists (select 1 from users where email = 'doug.freeman@doc.gov');

-- Bureau deputy-CIO reviewers (roll-down: one bureau each) ----------------
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-victor-nash', 'victor.nash@census.gov', 'Victor Nash', 'reviewer', 'launchpad', null, 'census', now()
where not exists (select 1 from users where email = 'victor.nash@census.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-melissa-grant', 'melissa.grant@trade.gov', 'Melissa Grant', 'reviewer', 'launchpad', null, 'ita', now()
where not exists (select 1 from users where email = 'melissa.grant@trade.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-harold-jennings', 'harold.jennings@doc.gov', 'Harold Jennings', 'reviewer', 'launchpad', null, 'os', now()
where not exists (select 1 from users where email = 'harold.jennings@doc.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-angela-brooks', 'angela.brooks@nist.gov', 'Angela Brooks', 'reviewer', 'launchpad', null, 'nist', now()
where not exists (select 1 from users where email = 'angela.brooks@nist.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-derek-simmons', 'derek.simmons@uspto.gov', 'Derek Simmons', 'reviewer', 'launchpad', null, 'uspto', now()
where not exists (select 1 from users where email = 'derek.simmons@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-felicia-tran', 'felicia.tran@noaa.gov', 'Felicia Tran', 'reviewer', 'launchpad', null, 'noaa', now()
where not exists (select 1 from users where email = 'felicia.tran@noaa.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-gregory-walsh', 'gregory.walsh@bis.doc.gov', 'Gregory Walsh', 'reviewer', 'launchpad', null, 'bis', now()
where not exists (select 1 from users where email = 'gregory.walsh@bis.doc.gov');

-- Submitter -----------------------------------------------------------------
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-doc-submitter', 'submitter@doc.gov', 'Commerce Submitter', 'submitter', 'launchpad', 'other', 'os', now()
where not exists (select 1 from users where email = 'submitter@doc.gov');
