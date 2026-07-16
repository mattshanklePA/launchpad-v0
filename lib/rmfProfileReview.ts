// RMF profile propose-then-confirm (Roadmap #22 story 4) — lib/nistRmf.ts's
// computeRmfProfile is deterministic and pure, but a computed governance
// profile should never be silently authoritative. This module snapshots the
// profile once at submission (buildRmfProfileSnapshotPatch, merged in by
// lib/adapters/default/supabaseStore.ts's saveSubmission) and records a
// reviewer's confirm/override decision on top of that snapshot
// (buildRmfProfileReviewPatch) — mirroring lib/bureauSignoff.ts's
// get/build-patch shape and lib/ombAutofill.ts's propose-then-confirm
// relationship between a computed value and the human decision that ratifies
// or overrides it.
//
// Both fields are persisted in form_data (no schema change) and read via
// casts — the same pattern lib/bureauSignoff.ts uses for BureauSignoff /
// DepartmentApproval, neither of which is declared on FormData itself.
//
// Guardrail: never a second rubric. `resolveRmfProfile` always defers to
// `computeRmfProfile` for the profile itself (snapshot or, for submissions
// saved before this feature existed, a fresh computation) — the only thing
// this module adds on top is which of that profile's `overall` a reviewer
// has ratified or replaced.

import type { FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { getBureauSignoff, getDepartmentApproval } from "@/lib/bureauSignoff"
import { computeRmfProfile, type RmfProfile, type RmfRiskLevel } from "@/lib/nistRmf"

export type RmfReviewDecision = "confirmed" | "overridden"

/** Recorded once a reviewer ratifies or overrides the RMF profile proposed at submission. */
export type RmfProfileReview = {
  decision: RmfReviewDecision
  // Snapshot of the proposed overall level at the moment of review, so the
  // record stays legible even if the underlying submission changes later.
  proposedOverall: RmfRiskLevel
  // Only present when decision === "overridden".
  overriddenOverall?: RmfRiskLevel
  notes?: string
  byName: string
  byEmail: string
  at: string
}

export function getRmfProfileSnapshot(s: Submission): RmfProfile | undefined {
  const v = (s.formData as Record<string, unknown>)?.rmfProfileSnapshot
  return v && typeof v === "object" ? (v as RmfProfile) : undefined
}

export function getRmfProfileReview(s: Submission): RmfProfileReview | undefined {
  const v = (s.formData as Record<string, unknown>)?.rmfProfileReview
  return v && typeof v === "object" ? (v as RmfProfileReview) : undefined
}

/**
 * Builds the `form_data` patch that snapshots the RMF profile at submission
 * time — pure, apply by merging into the initial save (see
 * `lib/adapters/default/supabaseStore.ts`'s `saveSubmission`).
 */
export function buildRmfProfileSnapshotPatch(
  fd: FormData,
  tenant: TenantConfig = getTenant(),
): { rmfProfileSnapshot: RmfProfile } {
  return { rmfProfileSnapshot: computeRmfProfile(fd, tenant) }
}

/** Builds the `form_data` patch recording a reviewer's confirm/override decision on the proposed RMF profile. Pure — apply via `patchSubmissionFormData`. */
export function buildRmfProfileReviewPatch(
  decision: RmfReviewDecision,
  proposed: RmfProfile,
  opts: { byName: string; byEmail: string; at: string; overriddenOverall?: RmfRiskLevel; notes?: string },
): { rmfProfileReview: RmfProfileReview } {
  return {
    rmfProfileReview: {
      decision,
      proposedOverall: proposed.overall,
      ...(decision === "overridden" && opts.overriddenOverall ? { overriddenOverall: opts.overriddenOverall } : {}),
      ...(opts.notes ? { notes: opts.notes } : {}),
      byName: opts.byName,
      byEmail: opts.byEmail,
      at: opts.at,
    },
  }
}

export type ResolvedRmfProfile = {
  profile: RmfProfile
  // What a UI should badge as authoritative: the reviewer's overridden level
  // once recorded, else the computed `overall` — a confirmed or
  // not-yet-reviewed profile badges its own computed level, and only an
  // override replaces what's shown.
  effectiveOverall: RmfRiskLevel
  review?: RmfProfileReview
  // True until a reviewer has confirmed or overridden — i.e. this is still
  // only a proposal.
  isProposal: boolean
}

/**
 * Resolves the profile a UI should badge for one submission: the snapshot
 * taken at submission if present, falling back to a fresh `computeRmfProfile`
 * for submissions saved before this snapshot existed (older/seeded data) —
 * reuses the same rubric either way, never a second copy of it.
 */
export function resolveRmfProfile(s: Submission, tenant: TenantConfig = getTenant()): ResolvedRmfProfile {
  const review = getRmfProfileReview(s)
  const profile =
    getRmfProfileSnapshot(s) ||
    computeRmfProfile(
      { ...s.formData, bureauSignoff: getBureauSignoff(s), departmentApproval: getDepartmentApproval(s) },
      tenant,
    )
  const effectiveOverall =
    review?.decision === "overridden" && review.overriddenOverall ? review.overriddenOverall : profile.overall
  return { profile, effectiveOverall, review, isProposal: !review }
}
