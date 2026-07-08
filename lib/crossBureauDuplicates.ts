// Cross-bureau "possible duplicate" detection for the bureau roll-up table
// (components/admin/bureau-rollup.tsx). Pulled out as pure functions so the
// threshold decision is unit-testable without rendering React.
//
// This uses a stronger similarity threshold than lib/similarity.ts's default
// (0.07, tuned for the submission-detail "Similar use cases" list, where a
// weak match is fine because the caption tells reviewers to confirm before
// assuming duplicate). At the roll-up level there's no such caption — the
// column is meant to surface only genuine near-duplicates like the seed
// data's intentional Census/ITA comparison pair, not every submission that
// shares a handful of generic tokens with something in another bureau.
//
// A match is also excluded when both submissions land in the same
// lib/ombConsolidation.ts category (e.g. the seed's NIST/NOAA/ITA
// "meeting_transcription" trio) — those are consolidatable by design, not
// duplicates, and flagging them alongside the roll-up's separate
// Consolidated/Individual column would muddy that distinction.

import type { Submission } from "@/lib/submissions"
import { getBusinessUnit } from "@/lib/reviewWorkflow"
import { findSimilar } from "@/lib/similarity"
import { determineConsolidation } from "@/lib/ombConsolidation"

export const ROLLUP_DUPLICATE_THRESHOLD = 0.25

/** True when `a` and `b` share a defined lib/ombConsolidation.ts category. */
function sameConsolidationCategory(a: Submission, b: Submission): boolean {
  const category = determineConsolidation(a.formData).category
  return category !== undefined && category === determineConsolidation(b.formData).category
}

/** True when `s` has a likely match, at the roll-up's threshold, filed under a different bureau. */
export function hasCrossBureauMatch(s: Submission, all: Submission[]): boolean {
  return findSimilar(s, all, { threshold: ROLLUP_DUPLICATE_THRESHOLD }).some(
    (m) => m.bureau !== getBusinessUnit(s) && !sameConsolidationCategory(s, m.submission),
  )
}

/** Count of `unit`'s submissions with a cross-bureau possible-duplicate match. */
export function crossBureauDuplicateCount(submissions: Submission[], unit: string): number {
  return submissions.filter((s) => getBusinessUnit(s) === unit && hasCrossBureauMatch(s, submissions)).length
}
