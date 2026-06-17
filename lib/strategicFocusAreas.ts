import { getTenant } from "@/lib/tenant"
// Canonical USPTO strategic focus areas. Imported by both the server-side
// suggestStrategicAlignment action AND the client-side Step 6 component, so
// it lives outside the "use server" actions file (where non-async exports
// aren't allowed).

export const STRATEGIC_FOCUS_AREAS = getTenant().focusAreas

export type StrategicFocusAreaId = string

export type AlignmentSuggestion = {
  focusAreas: string[]
  relevantOkrs: string
  alignmentSummary: string
  rationale: string
}
