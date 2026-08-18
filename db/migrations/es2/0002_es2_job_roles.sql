-- Keystone — Army CPE ES2 (es2 tenant): job roles for the already-deployed
-- instance (ES2-13).
--
-- RUN THIS BY HAND IN SUPABASE (SQL editor) against the es2 project. Nothing
-- in the app runs it: 0001_es2_users_seed.sql only inserts accounts that do
-- not exist yet, so a deployment seeded before ES2-13 keeps its null
-- `job_role` column forever. This file brings those rows in line without
-- re-running the base seed.
--
-- Values are exactly the ones 0001_es2_users_seed.sql now carries, and all
-- come from `submitterRoles` in lib/tenant/es2.ts. lib/seedSubmissionsEs2.test.ts
-- asserts the two files agree.
--
-- Idempotent: every update is guarded on `job_role is null`, so a role an
-- admin has already set through User Management (Settings > User Management,
-- the fallback if this file is never run) is never overwritten, and re-running
-- the file is a no-op.
--
-- Touches `job_role` only. `business_unit` and `office` are deliberately left
-- alone — Avery Lang's null `business_unit` is what puts her on the
-- enterprise roll-up (lib/dashboard/scope.ts), which the demo's first screen
-- depends on.

-- ─── Enterprise admin ─────────────────────────────────────────────────────
update users set job_role = 'contracting_officer' where email = 'avery.lang@es2.demo' and job_role is null;

-- ─── Program-office reviewers ─────────────────────────────────────────────
update users set job_role = 'program_manager' where email = 'alan.brooks@es2.demo' and job_role is null;
update users set job_role = 'program_manager' where email = 'jordan.pierce@es2.demo' and job_role is null;
update users set job_role = 'program_manager' where email = 'karen.udall@es2.demo' and job_role is null;
update users set job_role = 'program_manager' where email = 'derek.hsu@es2.demo' and job_role is null;
update users set job_role = 'program_manager' where email = 'maria.santos@es2.demo' and job_role is null;

-- ─── AT&R program-level reviewer ──────────────────────────────────────────
update users set job_role = 'program_manager' where email = 'nora.quist@es2.demo' and job_role is null;

-- ─── Submitters ───────────────────────────────────────────────────────────
-- Each role matches what that person files under in lib/seedSubmissionsEs2.ts.
update users set job_role = 'contract_specialist' where email = 'dana.whitfield@es2.demo' and job_role is null;
update users set job_role = 'analyst' where email = 'marcus.bell@es2.demo' and job_role is null;
update users set job_role = 'training_developer' where email = 'priya.nair@es2.demo' and job_role is null;
update users set job_role = 'analyst' where email = 'lena.okafor@es2.demo' and job_role is null;
update users set job_role = 'product_owner' where email = 'victor.hale@es2.demo' and job_role is null;
update users set job_role = 'contracting_officer' where email = 'sofia.marquez@es2.demo' and job_role is null;
update users set job_role = 'developer' where email = 'andre.duval@es2.demo' and job_role is null;
update users set job_role = 'it_staff' where email = 'renee.calder@es2.demo' and job_role is null;

-- ─── Verification ─────────────────────────────────────────────────────────
-- Expect 15 rows, none with a null job_role, and business_unit unchanged
-- (Avery Lang's still null).
select email, role, job_role, business_unit, office from users order by role, email;
