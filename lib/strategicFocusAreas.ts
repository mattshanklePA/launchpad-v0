// Canonical USPTO strategic focus areas. Imported by both the server-side
// suggestStrategicAlignment action AND the client-side Step 6 component, so
// it lives outside the "use server" actions file (where non-async exports
// aren't allowed).

export const STRATEGIC_FOCUS_AREAS = [
  // USPTO 2022-2026 Strategic Plan
  { id: "goal_innovation", label: "Drive U.S. innovation & global competitiveness", category: "USPTO Strategic Plan" },
  { id: "goal_pendency_quality", label: "Efficient delivery of reliable IP rights (pendency + quality)", category: "USPTO Strategic Plan" },
  { id: "goal_ip_protection", label: "Protect IP against new and persistent threats", category: "USPTO Strategic Plan" },
  { id: "goal_public_good", label: "Bring innovation to impact for the public good", category: "USPTO Strategic Plan" },
  { id: "goal_employee_experience", label: "Impactful employee & customer experiences via operations", category: "USPTO Strategic Plan" },
  // USPTO AI Strategy (January 2025)
  { id: "ai_inclusive_policy", label: "Advance IP policies for inclusive AI innovation", category: "AI Strategy" },
  { id: "ai_infrastructure", label: "Enhance AI capabilities through infrastructure & resources", category: "AI Strategy" },
  { id: "ai_responsible_use", label: "Promote responsible AI use (bias, explainability, oversight)", category: "AI Strategy" },
  { id: "ai_workforce", label: "Develop AI expertise within the workforce", category: "AI Strategy" },
  { id: "ai_partnerships", label: "Collaborate with governmental & international AI partners", category: "AI Strategy" },
] as const

export type StrategicFocusAreaId = (typeof STRATEGIC_FOCUS_AREAS)[number]["id"]

export type AlignmentSuggestion = {
  focusAreas: string[]
  relevantOkrs: string
  alignmentSummary: string
  rationale: string
}
