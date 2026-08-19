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
import {
  YES_NO_OPTIONS,
  STAGE_OF_DEVELOPMENT_OPTIONS,
  HIGH_IMPACT_OPTIONS,
  TOPIC_AREA_OPTIONS,
  AI_CLASSIFICATION_OPTIONS,
  HAS_ATO_OPTIONS,
  SYSTEM_SOURCE_OPTIONS,
  DEMOGRAPHIC_FEATURE_OPTIONS,
  MIN_PRACTICE_STATUS_OPTIONS,
  INDEPENDENT_REVIEW_OPTIONS,
  FAILSAFE_OPTIONS,
  APPEAL_OPTIONS,
  PUBLIC_CONSULTATION_OPTIONS,
  type FieldOption,
} from "@/lib/governanceFieldOptions"

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
  // Scout's stated reason for the proposal, snapshotted alongside it — empty
  // when Scout had no proposal for this field at all. Lets a reviewer-detail
  // summary (issue #206) show "why Plumb proposed this" for a field without
  // re-running the draft.
  rationale: string
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
    entries.push({
      field,
      decision,
      proposedValue: proposedValue ?? finalValue,
      finalValue,
      rationale: draft[field]?.rationale ?? "",
    })
  }

  return {
    ...fieldPatch,
    governanceCaptureReview: { entries, ...opts } satisfies GovernanceCaptureReview,
  }
}

/** "{k} drafted by Plumb, {j} confirmed by the reviewer" counts (reviewer-detail issue #206) — "drafted by Plumb" is a field the reviewer kept as proposed, "confirmed by the reviewer" is one they entered or overrode themselves. The single source of truth for this split; callers should read it from here rather than recounting `entries`. */
export function governanceCaptureCounts(review: GovernanceCaptureReview | undefined): { draftedByPlumb: number; confirmedByReviewer: number } {
  const entries = review?.entries ?? []
  return {
    draftedByPlumb: entries.filter((e) => e.decision === "confirmed").length,
    confirmedByReviewer: entries.filter((e) => e.decision === "overridden").length,
  }
}

/**
 * Fields applicable given `fd`, resolving conditional visibility (`showWhen`)
 * against Scout's draft-proposed values for anything `fd` doesn't already have
 * a real value for — mirrors GovernanceCapturePanel's own `values` seeding
 * (a field stays uncounted only because a proposal hasn't been saved yet
 * would otherwise undercount siblings the panel already unlocks and renders).
 * Falls back to plain `applicableGovernanceFields(fd)` when there's no draft
 * yet (e.g. before it resolves).
 */
export function applicableGovernanceFieldsForDisplay(fd: FormData, draft: GovernanceFieldDraft | null | undefined): (keyof FormData)[] {
  if (!draft) return applicableGovernanceFields(fd)
  const overrides: Partial<Record<string, GovernanceFieldValue>> = {}
  for (const key of GOVERNANCE_FIELD_KEYS) {
    const existing = fd[key] as GovernanceFieldValue | undefined
    const hasExisting = Array.isArray(existing) ? existing.length > 0 : !!existing
    const proposed = draft[key as string]?.value
    if (!hasExisting && proposed !== undefined) overrides[key as string] = proposed
  }
  const merged: FormData = { ...fd, ...(overrides as Partial<FormData>) }
  return GOVERNANCE_FIELD_KEYS.filter((f) => isFieldVisible(f, merged))
}

/**
 * The one place that counts governance fields for display — the step 4
 * header, the review rail's progress line, and a decided record's Governance
 * record tab all render "All {N} fields · {k} drafted by Plumb, {j} confirmed
 * by the reviewer" and must agree, so all three call this instead of
 * recounting (issue #218). `applicable` is normally
 * `applicableGovernanceFieldsForDisplay(fd, draft)`.
 *
 * A field is "drafted by Plumb" whenever it carries a live proposal — this is
 * exactly what GovernanceCapturePanel tags PLUMB PROPOSED, whether or not a
 * reviewer has acted on it yet. A field is "confirmed by the reviewer" once
 * the reviewer has a saved decision for it (confirmed as drafted, or
 * overridden) — independent of whether Plumb had a proposal for that field at
 * all.
 */
export function governanceFieldCounts(
  applicable: (keyof FormData)[],
  draft: GovernanceFieldDraft | null | undefined,
  review: GovernanceCaptureReview | undefined,
): { applicableCount: number; draftedByPlumb: number; confirmedByReviewer: number } {
  const reviewedFields = new Set((review?.entries ?? []).map((e) => e.field))
  return {
    applicableCount: applicable.length,
    draftedByPlumb: applicable.filter((f) => draft?.[f as string]?.value !== undefined).length,
    confirmedByReviewer: applicable.filter((f) => reviewedFields.has(f as string)).length,
  }
}

/** The shared "All {N} fields · {k} drafted by Plumb, {j} confirmed by the reviewer" sentence, rendered identically at the step 4 header and the Governance record tab (issue #218). */
export function governanceFieldCountsSentence(
  counts: { applicableCount: number; draftedByPlumb: number; confirmedByReviewer: number },
  assistantName: string,
): string {
  const { applicableCount, draftedByPlumb, confirmedByReviewer } = counts
  return `All ${applicableCount} fields · ${draftedByPlumb} drafted by ${assistantName}, ${confirmedByReviewer} confirmed by the reviewer.`
}

// Field -> option list, for mapping a stored enum code (`pre_deployment`,
// `high_impact`, `in_progress`, ...) to its display label. Mirrors
// governance-capture-panel.tsx's per-field `kind`/`options` pairing
// (CAPTURE_FIELD_SPECS) but keeps only what a pure label lookup needs, so it
// can be shared by any reviewer-detail summary without importing the "use
// client" panel component.
const GOVERNANCE_FIELD_OPTIONS: Partial<Record<string, FieldOption[]>> = {
  stageOfDevelopment: STAGE_OF_DEVELOPMENT_OPTIONS,
  highImpact: HIGH_IMPACT_OPTIONS,
  topicArea: TOPIC_AREA_OPTIONS,
  aiClassification: AI_CLASSIFICATION_OPTIONS,
  disseminatesToPublic: YES_NO_OPTIONS,
  scalable: YES_NO_OPTIONS,
  hasATO: HAS_ATO_OPTIONS,
  systemSource: SYSTEM_SOURCE_OPTIONS,
  hasPii: YES_NO_OPTIONS,
  demographicFeatures: DEMOGRAPHIC_FEATURE_OPTIONS,
  customCode: YES_NO_OPTIONS,
  preDeploymentTesting: MIN_PRACTICE_STATUS_OPTIONS,
  aiImpactAssessmentCompleted: MIN_PRACTICE_STATUS_OPTIONS,
  independentReviewConducted: INDEPENDENT_REVIEW_OPTIONS,
  ongoingMonitoringPlan: MIN_PRACTICE_STATUS_OPTIONS,
  operatorTrainingEstablished: MIN_PRACTICE_STATUS_OPTIONS,
  failSafeMechanism: FAILSAFE_OPTIONS,
  humanOversightAppeal: APPEAL_OPTIONS,
  publicConsultationSteps: PUBLIC_CONSULTATION_OPTIONS,
}

/**
 * A governance field's stored value(s) as display label(s) — e.g.
 * `"pre_deployment"` -> `"Pre-deployment (development or acquisition)"` — so
 * "Plumb proposes: …" lines never leak the raw stored code. Falls back to the
 * raw value for a field with no registered option list (free-text fields).
 */
export function governanceFieldValueLabel(field: string, value: GovernanceFieldValue): string {
  const options = GOVERNANCE_FIELD_OPTIONS[field]
  const labelFor = (v: string) => options?.find((o) => o.value === v)?.label ?? v
  if (Array.isArray(value)) return value.length ? value.map(labelFor).join(", ") : "(none)"
  return value ? labelFor(value) : "(blank)"
}
