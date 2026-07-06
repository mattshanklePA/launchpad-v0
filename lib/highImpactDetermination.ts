// High-impact AI determination — recommends whether a use case meets OMB's
// "high-impact AI" definition (M-25-21 Section 5), instead of just trusting a
// self-reported flag. Pure, no I/O — mirrors lib/ombReportability.ts's pattern
// of keeping OMB judgment logic testable without a live Supabase connection.
//
// Rule (from M-25-21 Section 5): a use case is high-impact if its AI output
// could meaningfully affect any of — rights, safety, access to benefits,
// resource allocation, or enforcement actions. The submitter/reviewer can mark
// which of those the use case touches directly (`highImpactFactors`); on top
// of that manual path, this module infers the same five categories from risk
// signals LaunchPad already captures elsewhere (the AI Risk Management
// questions behind lib/riskProfile.ts, plus problem/solution text as a
// secondary, non-sole-trigger signal) so a submission doesn't get "Not
// high-impact" purely because nobody checked the box. The reviewer keeps the
// final call — this is advisory, same as Scout's read on a submission.

import type { FormData } from "@/lib/steps"

export type HighImpactRecommendation = "yes" | "no"

export type HighImpactResult = {
  recommendation: HighImpactRecommendation
  reasons: string[]
}

export type HighImpactFactor =
  | "rights"
  | "safety"
  | "benefits_access"
  | "resource_allocation"
  | "enforcement"

export const HIGH_IMPACT_FACTOR_LABELS: Record<HighImpactFactor, string> = {
  rights: "Could affect an individual's rights (due process, civil rights, legal entitlements)",
  safety: "Could affect the safety of individuals (health, physical, or life-safety)",
  benefits_access: "Could affect access to (or delivery of) benefits, services, or programs",
  resource_allocation: "Could affect the allocation of government or public resources",
  enforcement: "Could affect an enforcement action (investigations, inspections, penalties)",
}

const FACTOR_REASONS: Record<HighImpactFactor, string> = {
  rights: "AI output could meaningfully affect an individual's rights (OMB M-25-21 Section 5).",
  safety: "AI output could meaningfully affect the safety of individuals (OMB M-25-21 Section 5).",
  benefits_access: "AI output could meaningfully affect access to benefits or services (OMB M-25-21 Section 5).",
  resource_allocation:
    "AI output could meaningfully affect the allocation of government or public resources (OMB M-25-21 Section 5).",
  enforcement: "AI output could meaningfully affect an enforcement action (OMB M-25-21 Section 5).",
}

const NOT_HIGH_IMPACT_REASON =
  "None of the AI output was flagged as affecting rights, safety, benefits access, resource allocation, or enforcement actions (OMB M-25-21 Section 5)."

// Fields this module reads to infer criteria the submitter/reviewer didn't
// explicitly check. Only `highImpactFactors` is required; the rest are
// optional/blank-safe so a partially-filled submission (or a narrow test
// fixture) never throws.
type HighImpactInputs = Pick<FormData, "highImpactFactors"> &
  Partial<
    Pick<
      FormData,
      | "aiDecisionalImpact"
      | "severity"
      | "coreProblem"
      | "problemImpact"
      | "problemDefinition"
      | "proposedSolution"
      | "solutionSummary"
      | "useCaseDescription"
    >
  >

// Life-safety / safety-of-life language. Secondary signal only — the "safety"
// entry in INFERRED_SIGNALS below also requires severity to be "high", so free
// text alone can never be the sole trigger.
const SAFETY_KEYWORDS =
  /life[- ]?safety|public safety|safety[- ]of[- ]life|severe weather|life[- ]?threatening|protective action|hazardous condition|risk of (injury|death|harm)|medical emergency|emergency (response|alert)/i

// Benefits-eligibility / adjudication language.
const BENEFITS_KEYWORDS = /\bbenefit(s)?\b|eligib\w*|entitlement|assistance program|adjudicat\w*/i

// Resource-allocation language.
const RESOURCE_ALLOCATION_KEYWORDS =
  /resource alloc\w*|budget alloc\w*|staffing alloc\w*|fund(ing)? alloc\w*|case prioriti[sz]ation|prioriti[sz]e (cases|resources|funding|staffing)/i

// Enforcement / adjudication language.
const ENFORCEMENT_KEYWORDS =
  /enforcement action|investigat\w*|penalt(y|ies)|violation|inspection|compliance action|sanction(s)?/i

/** Joins the problem/solution fields this module treats as a secondary text signal. */
function problemSolutionText(fd: HighImpactInputs): string {
  return [
    fd.coreProblem,
    fd.problemImpact,
    fd.problemDefinition,
    fd.proposedSolution,
    fd.solutionSummary,
    fd.useCaseDescription,
  ]
    .filter(Boolean)
    .join(" ")
}

const INFERRED_SIGNAL_REASONS: Record<HighImpactFactor, string> = {
  rights:
    "Decisional AI: the AI makes or influences a decision or outcome about an individual (decisional impact on individuals → rights, OMB M-25-21 Section 5).",
  safety:
    "Life-safety context: a high-severity problem describes a safety-of-life scenario (life-safety / safety-of-life context → safety, OMB M-25-21 Section 5).",
  benefits_access:
    "Decisional AI over eligibility/benefits: the AI decision touches benefits eligibility or adjudication (benefits eligibility or adjudication → access to benefits, OMB M-25-21 Section 5).",
  resource_allocation:
    "Decisional AI over resource allocation: the AI decision touches how government or public resources are allocated (resource allocation context → resource allocation, OMB M-25-21 Section 5).",
  enforcement:
    "Decisional AI over enforcement/adjudication: the AI decision touches an enforcement or adjudication action (enforcement / adjudication context → enforcement actions, OMB M-25-21 Section 5).",
}

// Each inferred signal is gated on a structured field LaunchPad already
// captures (aiDecisionalImpact, severity) — free text (problemSolutionText)
// only ever narrows or corroborates a structured signal, never triggers alone.
const INFERRED_SIGNALS: { factor: HighImpactFactor; test: (fd: HighImpactInputs) => boolean }[] = [
  // Decisional AI / decision or outcome about individuals -> rights.
  { factor: "rights", test: (fd) => fd.aiDecisionalImpact === "yes" },
  // Life-safety / safety-of-life context -> safety.
  { factor: "safety", test: (fd) => fd.severity === "high" && SAFETY_KEYWORDS.test(problemSolutionText(fd)) },
  // Benefits eligibility or adjudication -> access to benefits.
  {
    factor: "benefits_access",
    test: (fd) => fd.aiDecisionalImpact === "yes" && BENEFITS_KEYWORDS.test(problemSolutionText(fd)),
  },
  // Resource allocation context -> resource allocation.
  {
    factor: "resource_allocation",
    test: (fd) => fd.aiDecisionalImpact === "yes" && RESOURCE_ALLOCATION_KEYWORDS.test(problemSolutionText(fd)),
  },
  // Enforcement / adjudication context -> enforcement actions.
  {
    factor: "enforcement",
    test: (fd) => fd.aiDecisionalImpact === "yes" && ENFORCEMENT_KEYWORDS.test(problemSolutionText(fd)),
  },
]

/** Recommends an OMB high-impact determination for one submission's fields. Pure — no I/O. */
export function determineHighImpact(fd: HighImpactInputs): HighImpactResult {
  const manualFactors = new Set((fd.highImpactFactors || []) as HighImpactFactor[])
  const inferredSignals = INFERRED_SIGNALS.filter((s) => s.test(fd))
  const inferredFactors = new Set(inferredSignals.map((s) => s.factor))

  if (manualFactors.size === 0 && inferredFactors.size === 0) {
    return { recommendation: "no", reasons: [NOT_HIGH_IMPACT_REASON] }
  }

  const reasons: string[] = []
  for (const f of manualFactors) reasons.push(FACTOR_REASONS[f])
  for (const s of inferredSignals) reasons.push(INFERRED_SIGNAL_REASONS[s.factor])

  return { recommendation: "yes", reasons }
}
