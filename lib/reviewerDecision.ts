// Reviewer decides (F7-1, #344): nothing counts as the reviewer's answer until
// the reviewer chooses. Pure, no I/O — same pattern as lib/decisionLock.ts and
// shared by the server write guard (lib/serverAccess.ts).
//
// Two steps carry a suggestion and a reviewer's answer:
//  - "highImpact": the suggestion is Plumb's rule (`determineHighImpact`, a plain
//    rule, no AI call); the answer is `formData.highImpact`, with who/when/why in
//    `formData.highImpactReview`.
//  - "rmf" (risk framework): the suggestion is the saved read
//    (`rmfProfileSnapshot.overall`, or a fresh computation for older records);
//    the answer is `formData.rmfProfileReview` (confirm or override, with the
//    reason in `notes`).
//
// The suggestion is always worked out from the stored record, never from
// anything the browser says about it.

import type { FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { determineHighImpact } from "@/lib/highImpactDetermination"
import { resolveRmfProfile } from "@/lib/rmfProfileReview"

export const NONE_YET = "none yet" as const

export type ReviewerStep = "highImpact" | "rmf"

export type ReviewerStepRead = {
  /** What Plumb suggests, worked out from the stored record. */
  suggestion: string
  /** The reviewer's answer, or "none yet". */
  answer: string
  /** True when there is an answer and it is not the suggestion. */
  differs: boolean
  /** A reason is needed: the answer differs from the suggestion. */
  reasonNeeded: boolean
  /** A reason of at least a few words is on the record. */
  reasonPresent: boolean
}

/** Added when a reviewer's answer differs from Plumb's and gives no reason. Shown only where the setting is on. */
export const REASON_REQUIRED_MESSAGE = "Add a one-line reason when your answer differs from Plumb's."

const MIN_REASON_WORDS = 3

/** True when the reason has at least a few words. */
export function hasEnoughWords(text: unknown): boolean {
  if (typeof text !== "string") return false
  return text.trim().split(/\s+/).filter(Boolean).length >= MIN_REASON_WORDS
}

/** True when the tenant has turned on "reviewer decides" (off when missing). */
export function reviewerDecidesEnabled(tenant: TenantConfig = getTenant()): boolean {
  return !!tenant.features.reviewerDecides
}

type Json = Record<string, unknown>
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {})

/** Reads one step's suggestion, answer and reason state from a stored record. */
export function readReviewerStep(
  step: ReviewerStep,
  formData: FormData | Json,
  tenant: TenantConfig = getTenant(),
): ReviewerStepRead {
  const fd = obj(formData)
  if (step === "highImpact") {
    const suggestion = determineHighImpact(fd as unknown as FormData, tenant).recommendation === "yes" ? "high_impact" : "not_high_impact"
    const raw = fd.highImpact
    const answered = typeof raw === "string" && raw !== ""
    const differs = answered && raw !== suggestion
    return {
      suggestion,
      answer: answered ? (raw as string) : NONE_YET,
      differs,
      reasonNeeded: differs,
      reasonPresent: hasEnoughWords(obj(fd.highImpactReview).reason),
    }
  }

  const resolved = resolveRmfProfile({ id: "", submittedAt: "", formData: fd as unknown as Submission["formData"] }, tenant)
  const suggestion = resolved.profile.overall
  const review = resolved.review
  if (!review) {
    return { suggestion, answer: NONE_YET, differs: false, reasonNeeded: false, reasonPresent: false }
  }
  const answer = review.decision === "overridden" && review.overriddenOverall ? review.overriddenOverall : suggestion
  const differs = answer !== suggestion
  return {
    suggestion,
    answer,
    differs,
    reasonNeeded: differs,
    reasonPresent: hasEnoughWords(review.notes),
  }
}
