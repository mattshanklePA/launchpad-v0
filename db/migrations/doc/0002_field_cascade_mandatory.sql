-- LaunchPad — Department of Commerce (doc tenant) field-config cascade.
--
-- Run AFTER 0000_doc_base_schema.sql (and 0001_office_hierarchy.sql, if
-- already applied) on the DoC Supabase project. Adds the storage for the
-- OMB -> Department -> Bureau field-authority cascade (issue #57): a
-- level: "bureau" field's on/off state already lives in `form_config.enabled`
-- (unchanged); this migration adds the one new piece — an OS/department
-- admin's "mandatory for all bureaus" override for such a field. `level:
-- "omb"`/`"department"` fields need no storage at all: they're mandatory by
-- definition in lib/fieldRegistry.ts, not by admin action.
--
-- Purely additive — no existing column is dropped, renamed, or made
-- non-nullable. USPTO/DoW never run this migration and never send a
-- `mandatory` value to PUT /api/form-config, so they are unaffected.

alter table form_config add column if not exists mandatory jsonb not null default '{}'::jsonb;

comment on column form_config.mandatory is
  'OS/department admin "mandatory for all bureaus" overrides for level: "bureau" fields (lib/fieldRegistry.ts). Keyed by fieldKey -> true. Empty for tenants without a bureau tier.';
