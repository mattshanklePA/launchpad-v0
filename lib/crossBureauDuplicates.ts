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
import { findSimilar, similarity } from "@/lib/similarity"
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

// Pairwise version of the roll-up-strength rule, exported for
// lib/rationalization.ts's clustering (which needs an edge test between two
// specific submissions rather than "does `s` have any match"). Unlike
// hasCrossBureauMatch, this is NOT bureau-scoped — lib/rationalization.ts
// clusters over whatever set of submissions the viewer can see
// (visibleSubmissions), so the same edge rule must fire for a same-bureau
// pair as for a cross-bureau one; scope (intra_bureau vs. cross_bureau) is
// derived downstream from which bureaus a resulting cluster's members land
// in, not from this edge test. Kept in sync with hasCrossBureauMatch's other
// two filters by construction — both apply the same threshold and
// not-same-OMB-category rules.
export function isDuplicatePair(a: Submission, b: Submission): boolean {
  return !sameConsolidationCategory(a, b) && similarity(a, b) >= ROLLUP_DUPLICATE_THRESHOLD
}

/** Count of `unit`'s submissions with a cross-bureau possible-duplicate match. */
export function crossBureauDuplicateCount(submissions: Submission[], unit: string): number {
  return submissions.filter((s) => getBusinessUnit(s) === unit && hasCrossBureauMatch(s, submissions)).length
}
