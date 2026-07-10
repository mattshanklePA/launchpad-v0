// "One Commerce" rationalization gate — clusters cross-bureau duplicate
// submissions (lib/crossBureauDuplicates.ts's ROLLUP_DUPLICATE_THRESHOLD,
// reusing lib/similarity.ts) and blocks approval of a cluster's members until
// a department/OS reviewer explicitly decides to consolidate them into a lead
// use case or keep them separate. The top DoC-demo concern this addresses:
// detection alone ("~20 of the same thing across the bureaus") didn't make
// anyone act on it.
//
// This is the text-similarity DUPLICATE axis (rationalizing duplicated
// effort) — distinct from lib/ombConsolidation.ts's OMB CATEGORY axis (how a
// single use case is reported). A cluster here can include use cases that are
// individually Consolidated or Individual for OMB purposes; the two are
// orthogonal and intentionally not merged (see crossBureauDuplicates.ts's
// same-category exclusion, which keeps them from overlapping in practice).
//
// Pure, no I/O — mirrors lib/reviewWorkflow.ts and lib/crossBureauDuplicates.ts's
// pattern of testable logic with persistence handled by callers via
// lib/submissions.ts's patchSubmissionFormData.

import type { Submission } from "@/lib/submissions"
import { getBusinessUnit } from "@/lib/reviewWorkflow"
import { similarity } from "@/lib/similarity"
import { isCrossBureauDuplicatePair } from "@/lib/crossBureauDuplicates"
import { getTenant, type TenantConfig } from "@/lib/tenant"

export type RationalizationDecision = "consolidated" | "keep_separate"

// Persisted on EVERY member of a cluster (lib/reviewWorkflow.ts's
// form_data-as-storage pattern — no schema change for the demo).
export type Rationalization = {
  clusterId: string
  decision: RationalizationDecision
  leadSubmissionId?: string
  decidedBy: string
  decidedAt: string
}

export type RationalizationCluster = {
  // Deterministic: the lexicographically smallest member submission id.
  id: string
  memberIds: string[]
  bureaus: string[]
  // Highest pairwise similarity score among the cluster's member matches.
  maxSimilarity: number
}

/**
 * True when the tenant has a bureau tier under its top-level unit (DoC) —
 * the only shape where two submissions can ever land in different bureaus of
 * the same department. USPTO/DoW's `unit.options` are business
 * units/commands with no `offices`, so this is always false for them and the
 * gate is a no-op, matching lib/tenant/index.ts's `getOrgNameForUnit` gating
 * pattern.
 */
export function tenantHasBureauTier(tenant: TenantConfig = getTenant()): boolean {
  return tenant.unit.options.some((o) => (o.offices?.length ?? 0) > 0)
}

/**
 * Groups `submissions` into rationalization clusters: connected components of
 * the cross-bureau duplicate-match graph (an edge is
 * lib/crossBureauDuplicates.ts's `isCrossBureauDuplicatePair`). A cluster is
 * only returned once it has 2+ members spanning 2+ bureaus — the
 * "rationalize duplicated effort across bureaus" case this gate exists for.
 * [] for tenants without a bureau tier (see `tenantHasBureauTier`).
 */
export function clusterDuplicates(
  submissions: Submission[],
  tenant: TenantConfig = getTenant(),
): RationalizationCluster[] {
  if (!tenantHasBureauTier(tenant)) return []

  const parent = new Map<string, string>()
  const find = (id: string): string => {
    const p = parent.get(id) ?? id
    if (p === id) {
      parent.set(id, id)
      return id
    }
    const root = find(p)
    parent.set(id, root)
    return root
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  const pairScores: { a: string; b: string; score: number }[] = []
  for (let i = 0; i < submissions.length; i++) {
    const a = submissions[i]
    find(a.id)
    for (let j = i + 1; j < submissions.length; j++) {
      const b = submissions[j]
      if (isCrossBureauDuplicatePair(a, b)) {
        union(a.id, b.id)
        pairScores.push({ a: a.id, b: b.id, score: similarity(a, b) })
      }
    }
  }

  const groups = new Map<string, string[]>()
  for (const s of submissions) {
    const root = find(s.id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(s.id)
  }

  const byId = new Map(submissions.map((s) => [s.id, s]))
  const clusters: RationalizationCluster[] = []
  for (const memberIds of groups.values()) {
    if (memberIds.length < 2) continue
    const sortedIds = [...memberIds].sort()
    const memberSet = new Set(sortedIds)
    const bureaus = Array.from(new Set(sortedIds.map((id) => getBusinessUnit(byId.get(id)!)))).sort()
    // Guards the invariant implied by isCrossBureauDuplicatePair's edge rule
    // (every edge crosses a bureau boundary); can't actually be < 2 here.
    if (bureaus.length < 2) continue
    const maxSimilarity = pairScores
      .filter((p) => memberSet.has(p.a) && memberSet.has(p.b))
      .reduce((max, p) => Math.max(max, p.score), 0)
    clusters.push({ id: sortedIds[0], memberIds: sortedIds, bureaus, maxSimilarity })
  }

  return clusters.sort((a, b) => a.id.localeCompare(b.id))
}

/** The submission's decision record, if any (from `form_data.rationalization`). */
export function getRationalization(s: Submission): Rationalization | undefined {
  const r = (s.formData as Record<string, unknown>)?.rationalization
  return r && typeof r === "object" ? (r as Rationalization) : undefined
}

/** The cluster `s` belongs to among `clusters`, if any. */
export function clusterForSubmission(
  s: Submission,
  clusters: RationalizationCluster[],
): RationalizationCluster | undefined {
  return clusters.find((c) => c.memberIds.includes(s.id))
}

/**
 * True when `s` is a member of a duplicate cluster that has not yet been
 * decided (consolidated or keep-separate) — the state that blocks approval.
 * Non-duplicates (no cluster) are always false. A stale decision recorded
 * against a different cluster id (e.g. the seed changed shape) is treated as
 * pending, not decided.
 */
export function isRationalizationPending(s: Submission, clusters: RationalizationCluster[]): boolean {
  const cluster = clusterForSubmission(s, clusters)
  if (!cluster) return false
  const decision = getRationalization(s)
  return !decision || decision.clusterId !== cluster.id
}

const BLOCK_REASON =
  "Rationalization pending — this cross-bureau duplicate cluster must be marked consolidated or keep-separate before approval."

/** True when `s` may be moved to "approved" given its cluster's decision state. */
export function canApprove(s: Submission, clusters: RationalizationCluster[]): boolean {
  return !isRationalizationPending(s, clusters)
}

/** Human-readable block reason for `s`, or undefined when approval isn't blocked. */
export function rationalizationBlockReason(s: Submission, clusters: RationalizationCluster[]): string | undefined {
  return isRationalizationPending(s, clusters) ? BLOCK_REASON : undefined
}

/**
 * Builds the `form_data` patch to persist a cluster decision — apply to every
 * member via lib/submissions.ts's `patchSubmissionFormData` (this module
 * stays pure/I/O-free per lib/reviewWorkflow.ts's convention).
 */
export function buildRationalizationPatch(
  cluster: RationalizationCluster,
  decision: RationalizationDecision,
  opts: { leadSubmissionId?: string; decidedBy: string; decidedAt: string },
): { rationalization: Rationalization } {
  return {
    rationalization: {
      clusterId: cluster.id,
      decision,
      leadSubmissionId: decision === "consolidated" ? opts.leadSubmissionId : undefined,
      decidedBy: opts.decidedBy,
      decidedAt: opts.decidedAt,
    },
  }
}
