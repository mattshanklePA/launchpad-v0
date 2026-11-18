// F7-3 (#346): the words and rules behind the ES2 review step screen. Pure, no
// I/O. Read only where `features.reviewerDecides` is on (ES2); the other
// tenants' review screens do not import this.

import { hasEnoughWords, NONE_YET, REASON_REQUIRED_MESSAGE } from "@/lib/reviewerDecision"
import { RMF_OVERALL_LABELS, type RmfProfile, type RmfRiskLevel } from "@/lib/nistRmf"
import type { HighImpactResult } from "@/lib/highImpactDetermination"
import type { ReviewStepKey } from "@/lib/reviewSteps"

export type StepChoice = { value: string; label: string }

export const NEEDS_ATTENTION_UNKNOWN = "Plumb could not tell what is missing. Read the submission."

export const HIGH_IMPACT_LABELS: Record<string, string> = {
  high_impact: "High-impact",
  presumed_not_high_impact: "Presumed, but not high-impact",
  not_high_impact: "Not high-impact",
}

/** Today's three high-impact answers, in today's order and words. */
export function highImpactChoices(): StepChoice[] {
  return ["high_impact", "presumed_not_high_impact", "not_high_impact"].map((value) => ({ value, label: HIGH_IMPACT_LABELS[value] }))
}

/** The risk levels a reviewer can answer with. "Unassessed" is offered only when that is what Plumb suggests, so confirming it is possible. */
export function rmfChoices(suggestion: string): StepChoice[] {
  const levels: RmfRiskLevel[] = ["on_track", "attention", "at_risk"]
  if (suggestion === "unknown") levels.push("unknown")
  return levels.map((value) => ({ value, label: RMF_OVERALL_LABELS[value] }))
}

export type StepSaveDecision =
  | { kind: "go" }
  | { kind: "save"; answer: string; reason: string | undefined }
  | { kind: "need_reason"; message: string }

/**
 * What "Save and go to step N" does. Nothing chosen, or the answer already on
 * record: move on and write nothing. A choice that differs from Plumb's needs a
 * reason of a few words: until it has one, nothing is saved.
 */
export function decideStepSave(input: { suggestion: string; saved: string; chosen: string | null; reason: string }): StepSaveDecision {
  const { suggestion, saved, chosen } = input
  if (chosen === null || chosen === saved) return { kind: "go" }
  const reason = input.reason.trim()
  if (chosen !== suggestion && !hasEnoughWords(reason)) return { kind: "need_reason", message: REASON_REQUIRED_MESSAGE }
  return { kind: "save", answer: chosen, reason: chosen !== suggestion ? reason : undefined }
}

/** The saved answer as a radio value, or null while there is none. */
export const savedAnswerOrNull = (answer: string): string | null => (answer === NONE_YET ? null : answer)

/**
 * One line saying what needs attention on the risk framework step, taken from
 * the profile's own flags. Null when the state is not "needs attention".
 */
export function needsAttentionLine(profile: RmfProfile, state: RmfRiskLevel, label = "Needs attention:"): string | null {
  if (state !== "attention") return null
  const flags = profile.flags.map((f) => f.trim()).filter(Boolean)
  if (flags.length === 0) return NEEDS_ATTENTION_UNKNOWN
  const first = flags[0].replace(/^[A-Za-z]+:\s*/, "")
  return `${label} ${first}${flags.length > 1 ? ` (and ${flags.length - 1} more)` : ""}`
}

export type StepAdvice = { suggests: string | null; reasons: string[]; notSure: string | null }

export type StepAdviceInput = {
  highImpact?: Pick<HighImpactResult, "recommendation" | "reasons">
  rmf?: { profile: RmfProfile }
  /** Inventory fields: how many apply, and how many Plumb drafted. */
  fields?: { applicable: number; drafted: number }
}

/** Plumb's advice for one step, from what the record already holds. A step with nothing to suggest returns all-empty. */
export function stepAdvice(step: ReviewStepKey, input: StepAdviceInput): StepAdvice {
  const none: StepAdvice = { suggests: null, reasons: [], notSure: null }
  if (step === "high_impact" && input.highImpact) {
    return {
      suggests: input.highImpact.recommendation === "yes" ? HIGH_IMPACT_LABELS.high_impact : HIGH_IMPACT_LABELS.not_high_impact,
      reasons: input.highImpact.reasons.slice(0, 3),
      notSure: null,
    }
  }
  if (step === "rmf" && input.rmf) {
    const { profile } = input.rmf
    return {
      suggests: RMF_OVERALL_LABELS[profile.overall],
      reasons: [profile.rationale].filter(Boolean),
      notSure: profile.overall === "unknown" ? "there is too little in the submission to assess the risk framework." : null,
    }
  }
  if (step === "governance" && input.fields && input.fields.drafted > 0) {
    const { applicable, drafted } = input.fields
    return {
      suggests: `a draft for ${drafted} of ${applicable} fields`,
      reasons: [],
      notSure: drafted < applicable ? `${applicable - drafted} fields have no draft. Fill them in or leave them empty.` : null,
    }
  }
  return none
}
