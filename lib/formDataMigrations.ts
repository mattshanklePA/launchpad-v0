// Legacy form_data migrations (issue #116). form_data is an unstructured
// JSON blob (see docs/ARCHITECTURE.md) — there's no DB schema to alter when a
// field's shape changes, so migrating existing submissions means normalizing
// the raw blob at the read boundary instead of running a backfill script.
// Applied once, in lib/adapters/default/supabaseStore.ts's getSubmissions().

import type { FormData } from "@/lib/steps"

const VALID_IS_WITHHELD = new Set(["no", "yes_risk_to_disclosure", "yes_disclosure_prohibited", "other"])

/**
 * Resolves the four-way `isWithheld` value (OMB `is_withheld`, field #5) for
 * a raw, possibly-legacy form_data blob. Already-migrated data passes
 * through unchanged. Legacy two-way `publicIndicator`: `"public"` maps to
 * `"no"` (matches OMB's default "No" answer); `"excluded"` maps to `"other"`
 * — the old flag never recorded *why* something was excluded, so "Other" is
 * the only faithful mapping rather than guessing a FOIA/legal reason that
 * was never captured.
 */
export function migrateIsWithheld(raw: Record<string, unknown> | null | undefined): FormData["isWithheld"] {
  const current = raw?.isWithheld
  if (typeof current === "string" && VALID_IS_WITHHELD.has(current)) {
    return current as FormData["isWithheld"]
  }
  const legacy = raw?.publicIndicator
  if (legacy === "public") return "no"
  if (legacy === "excluded") return "other"
  return ""
}

/** Applies every field migration to a raw form_data blob. Never mutates the input. */
export function migrateFormData(raw: Record<string, unknown>): Record<string, unknown> {
  return { ...raw, isWithheld: migrateIsWithheld(raw) }
}
