// RD-6 (issue #207): "review as a process" — pure derivation of the 5-step
// guided in-review process (DIVERGENCES.md item 5, mock `08 Reviewer Detail
// - Rationalization.dc.html`). Step order: duplicate cluster (only when this
// submission belongs to one), high-impact determination, NIST AI RMF (only
// when the tenant has the feature on), inventory fields (the governance
// panel), disposition. Numbering adapts to whichever steps actually apply —
// "Step 1 of 4" for a tenant/submission with no cluster step, "Step 1 of 3"
// for a tenant with neither a cluster nor RMF (USPTO/DoW).
//
// Pure, no I/O — every input here is a boolean the caller already computed
// from lib/rationalization.ts, lib/rmfProfileReview.ts,
// lib/governanceCapture.ts and lib/reviewWorkflow.ts. Nothing here is a new
// source of truth, and nothing here is persisted — step state is derived
// from the record on every render, per the issue's "persist nothing new."

export type ReviewStepKey = "cluster" | "high_impact" | "rmf" | "governance" | "disposition"

export type ReviewStep = {
  key: ReviewStepKey
  /** 1-based position among the steps that apply to this submission. */
  index: number
  settled: boolean
}

export type ReviewStepsInput = {
  /** This submission belongs to a duplicate cluster (lib/rationalization.ts's `clusterForSubmission`). */
  hasCluster: boolean
  /** The cluster has a recorded consolidate/keep-separate decision (`!isRationalizationPending`). */
  clusterSettled: boolean
  /** A reviewer determination has been recorded (`fd.highImpact` is non-empty). */
  highImpactSettled: boolean
  /** The tenant has the NIST AI RMF feature on (`tenant.features.rmf`). */
  rmfEnabled: boolean
  /** The proposed RMF profile has been confirmed or overridden. */
  rmfSettled: boolean
  /** Every applicable governance field has an answer. */
  governanceSettled: boolean
  /** A disposition has been recorded (approved, rejected, or a request for info sent). */
  dispositionSettled: boolean
}

/**
 * Builds the ordered, numbered list of steps that apply to this submission.
 * The cluster step is included only when `hasCluster`; the RMF step only
 * when `rmfEnabled` — every other step always applies.
 */
export function buildReviewSteps(input: ReviewStepsInput): ReviewStep[] {
  const candidates: { key: ReviewStepKey; applicable: boolean; settled: boolean }[] = [
    { key: "cluster", applicable: input.hasCluster, settled: input.clusterSettled },
    { key: "high_impact", applicable: true, settled: input.highImpactSettled },
    { key: "rmf", applicable: input.rmfEnabled, settled: input.rmfSettled },
    { key: "governance", applicable: true, settled: input.governanceSettled },
    { key: "disposition", applicable: true, settled: input.dispositionSettled },
  ]

  let index = 0
  return candidates
    .filter((c) => c.applicable)
    .map((c) => ({ key: c.key, index: ++index, settled: c.settled }))
}

/** How many steps apply to this submission — the "M" in "Step N of M". */
export function totalReviewSteps(steps: ReviewStep[]): number {
  return steps.length
}

/** The step a reviewer should land on: the first unsettled step, or the last (always disposition) once everything else is settled. */
export function defaultReviewStep(steps: ReviewStep[]): ReviewStepKey {
  const firstUnsettled = steps.find((s) => !s.settled)
  return (firstUnsettled ?? steps[steps.length - 1])?.key ?? "disposition"
}

/** One step's descriptor by key, or undefined if it doesn't apply to this submission. */
export function reviewStepByKey(steps: ReviewStep[], key: ReviewStepKey): ReviewStep | undefined {
  return steps.find((s) => s.key === key)
}

/** The step after `key` in this submission's step list, or undefined for the last step. */
export function nextReviewStep(steps: ReviewStep[], key: ReviewStepKey): ReviewStep | undefined {
  const i = steps.findIndex((s) => s.key === key)
  return i === -1 ? undefined : steps[i + 1]
}

/** The step before `key` in this submission's step list, or undefined for the first step. */
export function previousReviewStep(steps: ReviewStep[], key: ReviewStepKey): ReviewStep | undefined {
  const i = steps.findIndex((s) => s.key === key)
  return i <= 0 ? undefined : steps[i - 1]
}
