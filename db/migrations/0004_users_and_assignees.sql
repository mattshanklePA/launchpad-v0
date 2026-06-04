-- LaunchPad — reviewers (one per business unit) + submitters, and per-BU
-- reviewer assignment on every submission. Idempotent (guarded inserts).
-- Run after 0001-0003. Demo password for all new accounts: 'launchpad'.

-- Reviewers --------------------------------------------------------------
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-priya-raman', 'priya.raman@uspto.gov', 'Priya Raman', 'reviewer', 'launchpad', null, 'patents', now()
where not exists (select 1 from users where email = 'priya.raman@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-jonathan-moody', 'jonathan.moody@uspto.gov', 'Jonathan Moody', 'reviewer', 'launchpad', null, 'trademarks', now()
where not exists (select 1 from users where email = 'jonathan.moody@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-marcus-lee', 'marcus.lee@uspto.gov', 'Marcus Lee', 'reviewer', 'launchpad', null, 'ocio', now()
where not exists (select 1 from users where email = 'marcus.lee@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-diane-foster', 'diane.foster@uspto.gov', 'Diane Foster', 'reviewer', 'launchpad', null, 'ocfo', now()
where not exists (select 1 from users where email = 'diane.foster@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-robert-hayes', 'robert.hayes@uspto.gov', 'Robert Hayes', 'reviewer', 'launchpad', null, 'ogc', now()
where not exists (select 1 from users where email = 'robert.hayes@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-sandra-kim', 'sandra.kim@uspto.gov', 'Sandra Kim', 'reviewer', 'launchpad', null, 'hr', now()
where not exists (select 1 from users where email = 'sandra.kim@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-elena-cruz', 'elena.cruz@uspto.gov', 'Elena Cruz', 'reviewer', 'launchpad', null, 'opia', now()
where not exists (select 1 from users where email = 'elena.cruz@uspto.gov');

-- Submitters -------------------------------------------------------------
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-anita-krishnan', 'anita.krishnan@uspto.gov', 'Anita Krishnan', 'submitter', 'launchpad', 'patent_examiner', 'patents', now()
where not exists (select 1 from users where email = 'anita.krishnan@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-marcus-webb', 'marcus.webb@uspto.gov', 'Marcus Webb', 'submitter', 'launchpad', 'trademark_examiner', 'trademarks', now()
where not exists (select 1 from users where email = 'marcus.webb@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-priya-subramanian', 'priya.subramanian@uspto.gov', 'Priya Subramanian', 'submitter', 'launchpad', 'manager', 'hr', now()
where not exists (select 1 from users where email = 'priya.subramanian@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-james-okonkwo', 'james.okonkwo@uspto.gov', 'James Okonkwo', 'submitter', 'launchpad', 'it_staff', 'ocio', now()
where not exists (select 1 from users where email = 'james.okonkwo@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-reginald-ortiz', 'reginald.ortiz@uspto.gov', 'Reginald Ortiz', 'submitter', 'launchpad', 'other', 'ogc', now()
where not exists (select 1 from users where email = 'reginald.ortiz@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-karen-diallo', 'karen.diallo@uspto.gov', 'Karen Diallo', 'submitter', 'launchpad', 'manager', 'ocfo', now()
where not exists (select 1 from users where email = 'karen.diallo@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-daniel-roth', 'daniel.roth@uspto.gov', 'Daniel Roth', 'submitter', 'launchpad', 'supervisory_examiner', 'patents', now()
where not exists (select 1 from users where email = 'daniel.roth@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-lena-park', 'lena.park@uspto.gov', 'Lena Park', 'submitter', 'launchpad', 'other', 'opia', now()
where not exists (select 1 from users where email = 'lena.park@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-omar-haddad', 'omar.haddad@uspto.gov', 'Omar Haddad', 'submitter', 'launchpad', 'trademark_examiner', 'trademarks', now()
where not exists (select 1 from users where email = 'omar.haddad@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-tariq-nguyen', 'tariq.nguyen@uspto.gov', 'Tariq Nguyen', 'submitter', 'launchpad', 'it_staff', 'ocio', now()
where not exists (select 1 from users where email = 'tariq.nguyen@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-victor-solis', 'victor.solis@uspto.gov', 'Victor Solis', 'submitter', 'launchpad', 'other', 'patents', now()
where not exists (select 1 from users where email = 'victor.solis@uspto.gov');
insert into users (id, email, name, role, password, job_role, business_unit, created_at)
select 'user-bianca-lowe', 'bianca.lowe@uspto.gov', 'Bianca Lowe', 'submitter', 'launchpad', 'manager', 'hr', now()
where not exists (select 1 from users where email = 'bianca.lowe@uspto.gov');

-- Assign each submission its business-unit reviewer ----------------------
update submissions
set form_data = form_data || jsonb_build_object('assignedReviewerName', 'Priya Raman', 'assignedReviewerEmail', 'priya.raman@uspto.gov')
where business_unit = 'patents';
update submissions
set form_data = form_data || jsonb_build_object('assignedReviewerName', 'Jonathan Moody', 'assignedReviewerEmail', 'jonathan.moody@uspto.gov')
where business_unit = 'trademarks';
update submissions
set form_data = form_data || jsonb_build_object('assignedReviewerName', 'Marcus Lee', 'assignedReviewerEmail', 'marcus.lee@uspto.gov')
where business_unit = 'ocio';
update submissions
set form_data = form_data || jsonb_build_object('assignedReviewerName', 'Diane Foster', 'assignedReviewerEmail', 'diane.foster@uspto.gov')
where business_unit = 'ocfo';
update submissions
set form_data = form_data || jsonb_build_object('assignedReviewerName', 'Robert Hayes', 'assignedReviewerEmail', 'robert.hayes@uspto.gov')
where business_unit = 'ogc';
update submissions
set form_data = form_data || jsonb_build_object('assignedReviewerName', 'Sandra Kim', 'assignedReviewerEmail', 'sandra.kim@uspto.gov')
where business_unit = 'hr';
update submissions
set form_data = form_data || jsonb_build_object('assignedReviewerName', 'Elena Cruz', 'assignedReviewerEmail', 'elena.cruz@uspto.gov')
where business_unit = 'opia';
