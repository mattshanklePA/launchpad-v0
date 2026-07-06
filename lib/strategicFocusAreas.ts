import { getTenant } from "@/lib/tenant"
import type { FocusArea } from "@/lib/tenant/types"
// Canonical USPTO strategic focus areas. Imported by both the server-side
// suggestStrategicAlignment action AND the client-side Step 6 component, so
// it lives outside the "use server" actions file (where non-async exports
// aren't allowed).

export const STRATEGIC_FOCUS_AREAS = getTenant().focusAreas

// Returns the focus areas to score/align a submission against: a DoC bureau's
// own priorities (`UnitOption.focusAreas`) when the submission has one and
// that bureau has declared its own list, otherwise the tenant-level
// (department) focus areas. USPTO/DoW bureaus never declare `focusAreas`, so
// this always falls through to the tenant list for them — unaffected.
export function getFocusAreasForUnit(businessUnit?: string | null): FocusArea[] {
  const tenant = getTenant()
  const unit = businessUnit ? tenant.unit.options.find((o) => o.value === businessUnit) : undefined
  return unit?.focusAreas?.length ? unit.focusAreas : tenant.focusAreas
}

export type StrategicFocusAreaId = string

export type AlignmentSuggestion = {
  focusAreas: string[]
  relevantOkrs: string
  alignmentSummary: string
  rationale: string
}
