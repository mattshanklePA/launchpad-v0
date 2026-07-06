// High-impact AI determination — recommends whether a use case meets OMB's
// "high-impact AI" definition (M-25-21 Section 5), instead of just trusting a
// self-reported flag. Pure, no I/O — mirrors lib/ombReportability.ts's pattern
// of keeping OMB judgment logic testable without a live Supabase connection.
//
// Rule (from M-25-21 Section 5): a use case is high-impact if its AI output
// could meaningfully affect any of — rights, safety, access to benefits,
// resource allocation, or enforcement actions. The submitter/reviewer marks
// which of those the use case touches (`highImpactFactors`); this module is
// the rule-based source of truth for the recommendation. The reviewer keeps
// the final call — this is advisory, same as Scout's read on a submission.

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

type HighImpactInputs = Pick<FormData, "highImpactFactors">

/** Recommends an OMB high-impact determination for one submission's fields. Pure — no I/O. */
export function determineHighImpact(fd: HighImpactInputs): HighImpactResult {
  const factors = (fd.highImpactFactors || []) as HighImpactFactor[]

  if (factors.length === 0) {
    return { recommendation: "no", reasons: [NOT_HIGH_IMPACT_REASON] }
  }

  return {
    recommendation: "yes",
    reasons: factors.map((f) => FACTOR_REASONS[f]).filter(Boolean),
  }
}
