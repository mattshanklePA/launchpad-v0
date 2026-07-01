-- LaunchPad — Department of Commerce (doc tenant) office sub-level.
--
-- Run AFTER 0000_doc_base_schema.sql (and any users seed) on the DoC Supabase
-- project. Adds a third org tier below the existing Department -> Bureau
-- roll-up: Department -> Bureau -> Office (e.g. Census -> Decennial /
-- Economic / Demographic). Purely additive — no existing column is dropped,
-- renamed, or made non-nullable.
--
-- RLS POSTURE (read before relying on this for access control):
--   - `submissions` gets row level security enabled with a SELECT policy for
--     the `authenticated` Postgres role that mirrors the app's client-side
--     scoping in lib/reviewWorkflow.ts#visibleSubmissions: an admin claim
--     sees every row, a bureau claim is scoped to that business_unit, and an
--     office claim (when present) further scopes to that office.
--   - The app talks to Supabase exclusively through the service_role key
--     (see getSupabaseAdmin() in lib/supabaseClient.ts). The service_role
--     Postgres role has BYPASSRLS, so these policies do not change any
--     current app behavior — they exist so the DB-level contract is in place
--     ahead of time, not to enforce anything today.
--   - FOLLOW-UP (not in this migration): the app's own auth (lib/auth.ts) is
--     a custom users table with plaintext passwords — it does not mint
--     Supabase sessions, so no request today ever authenticates to Supabase
--     as `authenticated` with these claims populated. Wiring real per-user
--     Supabase sessions (or a service that mints a JWT carrying `role`,
--     `business_unit`, `office` in app_metadata) is required before this
--     policy does anything for non-service-role access.

-- Data model ------------------------------------------------------------
alter table submissions add column if not exists office text;
alter table users add column if not exists office text;

comment on column submissions.office is
  'DoC office sub-level under business_unit (bureau), e.g. "decennial" under "census". Null for bureau-level submissions or tenants without offices.';
comment on column users.office is
  'DoC office sub-level under business_unit (bureau) for an office-scoped reviewer. Null for bureau-level or department-level users.';

-- Row level security ------------------------------------------------------
alter table submissions enable row level security;

drop policy if exists "doc_office_hierarchy_select" on submissions;
create policy "doc_office_hierarchy_select" on submissions
  for select
  to authenticated
  using (
    -- Department/admin claim: sees every bureau and office.
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or (
      -- Bureau claim must match; an office claim (if present) must also match.
      auth.jwt() -> 'app_metadata' ->> 'business_unit' = business_unit
      and (
        auth.jwt() -> 'app_metadata' ->> 'office' is null
        or auth.jwt() -> 'app_metadata' ->> 'office' = office
      )
    )
  );

drop policy if exists "doc_office_hierarchy_write" on submissions;
create policy "doc_office_hierarchy_write" on submissions
  for insert
  to authenticated
  with check (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or (
      auth.jwt() -> 'app_metadata' ->> 'business_unit' = business_unit
      and (
        auth.jwt() -> 'app_metadata' ->> 'office' is null
        or auth.jwt() -> 'app_metadata' ->> 'office' = office
      )
    )
  );
