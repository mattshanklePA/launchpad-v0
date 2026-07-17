// Governance-field capture — the vetting-side "complete the use case"
// surface (issue #161, follow-on to issue #160's gating of the OMB 34-field
// inventory, the M-25-21 minimum-practice block, and the RMF inputs to the
// vetting stage rather than idea intake).
//
// Mirrors lib/rmfProfileReview.ts's propose-then-confirm shape: Scout drafts
// a proposed value + rationale for each applicable governance field
// (app/actions.ts's `draftGovernanceFields`), and a reviewer confirms or
// overrides each one. Unlike the RMF profile (a single computed `overall`
// value), there are ~25 independent fields here, so the review record holds
// one entry per field instead of one decision for the whole thing.
//
// The final values land directly in `form_data` under their normal FormData
// keys (`stageOfDevelopment`, `topicArea`, etc.) — never a shadow copy — so
// lib/ombReportability.ts, lib/ombConsolidation.ts,
// lib/highImpactDetermination.ts, lib/nistRmf.ts, and lib/ombExport.ts (which
// all already read straight off FormData/Submission) compute from whatever a
// reviewer completes here with no changes of their own. Only the
// `governanceCaptureReview` record is new — it's purely a "who confirmed vs.
// overrode what" audit trail on top.

import type { FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { GOVERNANCE_FIELD_KEYS } from "@/lib/submissionReadiness"
import { isFieldVisible } from "@/lib/formConfig"

export { GOVERNANCE_FIELD_KEYS }

export type GovernanceFieldValue = string | string[]

/** A Scout-drafted value for one governance field, plus the reason a reviewer sees before confirming or overriding it. Mirrors lib/ombAutofill.ts's `AutofillProposal`. */
export type GovernanceFieldProposal = {
  value: GovernanceFieldValue
  rationale: string
}

/** Scout's full draft for one submission — keyed by FormData field name. A field the engine has no defensible proposal for is simply absent. */
export type GovernanceFieldDraft = Partial<Record<string, GovernanceFieldProposal>>

export type GovernanceFieldDecision = "confirmed" | "overridden"

export type GovernanceFieldReviewEntry = {
  field: string
  decision: GovernanceFieldDecision
  // Snapshot of what Scout proposed (or, if Scout had no proposal, the same
  // as finalValue) so the record stays legible even if the draft logic
  // changes later — same rationale as lib/rmfProfileReview.ts's
  // `proposedOverall` snapshot.
  proposedValue: GovernanceFieldValue
  finalValue: GovernanceFieldValue
}

export type GovernanceCaptureReview = {
  entries: GovernanceFieldReviewEntry[]
  byName: string
  byEmail: string
  at: string
}

export function getGovernanceCaptureReview(s: Submission): GovernanceCaptureReview | undefined {
  const v = (s.formData as Record<string, unknown>)?.governanceCaptureReview
  return v && typeof v === "object" ? (v as GovernanceCaptureReview) : undefined
}

/**
 * Governance fields currently applicable to `fd` (per each field's
 * `showWhen`, resolved through the same `isFieldVisible` the wizard and the
 * idea-intake readiness gate use) — a field hidden by conditional disclosure
 * is never demanded here either.
 */
export function applicableGovernanceFields(fd: FormData): (keyof FormData)[] {
  return GOVERNANCE_FIELD_KEYS.filter((f) => isFieldVisible(f, fd))
}

function valuesEqual(a: GovernanceFieldValue | undefined, b: GovernanceFieldValue): boolean {
  if (a === undefined) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i])
  }
  return a === b
}

/**
 * Builds the `form_data` patch for a reviewer's governance-field capture:
 * the final field values themselves (keyed by their normal FormData names,
 * so every downstream consumer keeps reading FormData directly) plus a
 * `governanceCaptureReview` record noting, per field, whether the reviewer
 * confirmed Scout's draft or overrode it. Pure — apply via
 * `patchSubmissionFormData`.
 */
export function buildGovernanceCapturePatch(
  draft: GovernanceFieldDraft,
  finalValues: Partial<Record<string, GovernanceFieldValue>>,
  opts: { byName: string; byEmail: string; at: string },
): Record<string, unknown> {
  const entries: GovernanceFieldReviewEntry[] = []
  const fieldPatch: Record<string, GovernanceFieldValue> = {}

  for (const [field, finalValue] of Object.entries(finalValues)) {
    if (finalValue === undefined) continue
    fieldPatch[field] = finalValue
    const proposedValue = draft[field]?.value
    const decision: GovernanceFieldDecision = valuesEqual(proposedValue, finalValue) ? "confirmed" : "overridden"
    entries.push({ field, decision, proposedValue: proposedValue ?? finalValue, finalValue })
  }

  return {
    ...fieldPatch,
    governanceCaptureReview: { entries, ...opts } satisfies GovernanceCaptureReview,
  }
}
