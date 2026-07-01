-- LaunchPad — Department of Commerce (doc tenant) base schema.
-- Run FIRST on a brand-new DoC Supabase project. Then run the DoC users seed
-- (the SQL file added for the doc tenant). Submissions seed automatically via
-- the app's /api/seed route on first load for the doc tenant.
--
-- This consolidates the base tables + the review-workflow columns into one file
-- and intentionally seeds NO users (DoC users come from the doc users seed), so
-- there is no cross-tenant (DoW) admin in a Commerce database.

-- Submissions (includes the review-workflow columns) -----------------------
create table if not exists submissions (
  id            text        primary key,
  submitted_at  timestamptz not null default now(),
  form_data     jsonb       not null default '{}'::jsonb,
  status        text        default 'submitted',  -- submitted | in_review | needs_info | approved | rejected | draft
  owner_email   text,
  business_unit text
);

-- Users --------------------------------------------------------------------
create table if not exists users (
  id            text        primary key,
  email         text        not null unique,
  name          text        not null,
  role          text        not null default 'submitter',  -- admin | reviewer | submitter
  password      text        not null,                       -- plaintext, demo only
  job_role      text,
  business_unit text,                                       -- bureau code for DoC (nist, census, ...)
  created_at    timestamptz not null default now()
);

-- Single-row form configuration -------------------------------------------
create table if not exists form_config (
  id         int         primary key default 1,
  enabled    jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint form_config_single_row check (id = 1)
);
insert into form_config (id, enabled)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
