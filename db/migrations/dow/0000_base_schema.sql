-- LaunchPad base schema — run FIRST on a brand-new Supabase project
-- (the original USPTO DB was created by hand; this reproduces it so a fresh
-- DoW database can be stood up from scratch). Run order: 0000 -> 0001 -> DoW seed.

-- Submissions (workflow columns added by 0001) -----------------------------
create table if not exists submissions (
  id           text        primary key,
  submitted_at timestamptz not null default now(),
  form_data    jsonb       not null default '{}'::jsonb
);

-- Users --------------------------------------------------------------------
create table if not exists users (
  id            text        primary key,
  email         text        not null unique,
  name          text        not null,
  role          text        not null default 'submitter',  -- admin | reviewer | submitter
  password      text        not null,                       -- plaintext, demo only
  job_role      text,
  business_unit text,
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

-- Seed an admin so you can log in (change the password before any real use).
insert into users (id, email, name, role, password, business_unit, created_at)
select 'user-dow-admin', 'admin@dow.mil', 'DoW Admin', 'admin', 'launchpad', null, now()
where not exists (select 1 from users where email = 'admin@dow.mil');
