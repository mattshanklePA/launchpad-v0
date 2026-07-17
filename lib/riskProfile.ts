// Risk profile computation for the AI Risk Management questions on Step 7.
// Reviewers see this as a colored badge on Decision Center cards so they can
// triage at a glance — low-risk go-aheads vs. things that need a closer look.

import type { FormData } from "@/lib/steps"
import { STATUS_BADGE_CLASS } from "@/lib/statusTokens"

export type RiskLevel = "low" | "medium" | "high" | "unknown"

export type RiskProfile = {
  level: RiskLevel
  label: string
  rationale: string
  // Specific flags surfaced individually so the UI can list them on hover.
  flags: string[]
}

/**
 * Compute risk based on the four mandated questions:
 *   - involvesSensitiveData (PII)
 *   - aiDecisionalImpact (does AI make/influence decisions about people)
 *   - aiModelSourcing (American-built / foreign / unknown)
 *   - aiHumanReview (mandatory human review before action)
 *
 * Logic:
 *   HIGH    — foreign/unknown model sourcing, OR decisional AI with no human review
 *   MEDIUM  — PII or decisional impact, but mitigated by human review + acceptable sourcing
 *   LOW     — no PII, no decisional impact, American-built/open-source, with human review
 *   UNKNOWN — not enough info to assess (any required field still blank)
 */
export function computeRiskProfile(formData: Partial<FormData>): RiskProfile {
  const pii = formData.involvesSensitiveData
  const decisional = formData.aiDecisionalImpact
  const sourcing = formData.aiModelSourcing
  const humanReview = formData.aiHumanReview

  // Not enough data to assess
  if (!pii || !decisional || !sourcing || !humanReview) {
    return {
      level: "unknown",
      label: "Risk Unassessed",
      rationale: "AI risk management questions are not fully answered.",
      flags: [],
    }
  }

  const flags: string[] = []
  if (pii === "yes") flags.push("Uses PII")
  if (decisional === "yes") flags.push("AI drives decisions")
  if (sourcing === "foreign") flags.push("Foreign-built model")
  if (sourcing === "unknown") flags.push("Model sourcing TBD")
  if (humanReview === "no") flags.push("No human-in-the-loop")

  // HIGH — model sourcing violates EO, or decisional AI with no human oversight
  if (sourcing === "foreign" || sourcing === "unknown") {
    return {
      level: "high",
      label: "High Risk",
      rationale:
        sourcing === "foreign"
          ? "Foreign-built model sourcing is non-compliant with the current executive order on federal AI."
          : "Model sourcing has not been determined and may not meet the executive order requirements.",
      flags,
    }
  }
  if (decisional === "yes" && humanReview === "no") {
    return {
      level: "high",
      label: "High Risk",
      rationale: "AI directly drives decisions about applicants/employees without mandatory human review.",
      flags,
    }
  }

  // MEDIUM — sensitive surface area but mitigated
  if (pii === "yes" || decisional === "yes") {
    return {
      level: "medium",
      label: "Medium Risk",
      rationale:
        decisional === "yes"
          ? "AI influences decisions but mandatory human review is in place."
          : "PII is involved — verify access controls and data handling.",
      flags,
    }
  }

  // LOW — clean profile
  return {
    level: "low",
    label: "Low Risk",
    rationale: "No PII, no decisional impact, American-built or open-source model with human review.",
    flags,
  }
}

/**
 * Color tokens for the risk badge.
 */
export function riskBadgeClass(level: RiskLevel): string {
  switch (level) {
    case "low":
      return STATUS_BADGE_CLASS.healthy
    case "medium":
      return STATUS_BADGE_CLASS.attention
    case "high":
      return STATUS_BADGE_CLASS.alert
    default:
      return STATUS_BADGE_CLASS.neutral
  }
}
