// "One Commerce" rationalization gate — clusters duplicate submissions
// (lib/crossBureauDuplicates.ts's ROLLUP_DUPLICATE_THRESHOLD, reusing
// lib/similarity.ts) and blocks approval of a cluster's members until a
// reviewer with authority over that cluster explicitly decides to
// consolidate them into a lead use case or keep them separate. The top
// DoC-demo concern this addresses: detection alone ("~20 of the same thing
// across the bureaus") didn't make anyone act on it.
//
// Detection scope follows the viewer's visibility (issue #68): a bureau
// reviewer clusters and rationalizes duplicates within their own bureau
// (`scope: "intra_bureau"`); a department-level viewer additionally sees and
// is the only one who can decide clusters that span bureaus
// (`scope: "cross_bureau"`). Callers get this for free by passing
// `visibleSubmissions(all, viewer)` (lib/reviewWorkflow.ts) into
// `clusterDuplicates()` instead of the full submission list — there is no
// separate scoping mechanism here.
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
import { isDuplicatePair } from "@/lib/crossBureauDuplicates"
import { isDepartmentLevelViewer, type FieldViewer } from "@/lib/fieldRegistry"
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

// "intra_bureau": every member shares one bureau. "cross_bureau": members
// span 2+ bureaus — today's original behavior, retained for department/OS
// reviewers. Drives canRationalizeCluster's decision-authority rule below.
export type RationalizationClusterScope = "intra_bureau" | "cross_bureau"

export type RationalizationCluster = {
  // Deterministic: the lexicographically smallest member submission id.
  id: string
  memberIds: string[]
  bureaus: string[]
  scope: RationalizationClusterScope
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
 * the duplicate-match graph (an edge is lib/crossBureauDuplicates.ts's
 * `isDuplicatePair` — no longer bureau-scoped itself). A cluster is returned
 * once it has 2+ members, tagged `scope: "cross_bureau"` when its members
 * span more than one bureau or `"intra_bureau"` when they don't. Callers
 * control detection scope by what they pass in: pass
 * `visibleSubmissions(all, viewer)` (lib/reviewWorkflow.ts) to get exactly
 * the clusters that viewer should see — a bureau reviewer's visible set never
 * contains another bureau's submissions, so only intra_bureau clusters can
 * ever form for them; a department-level viewer's visible set is
 * unrestricted, so both scopes can form. [] for tenants without a bureau tier
 * (see `tenantHasBureauTier`).
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
      if (isDuplicatePair(a, b)) {
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
    const scope: RationalizationClusterScope = bureaus.length > 1 ? "cross_bureau" : "intra_bureau"
    const maxSimilarity = pairScores
      .filter((p) => memberSet.has(p.a) && memberSet.has(p.b))
      .reduce((max, p) => Math.max(max, p.score), 0)
    clusters.push({ id: sortedIds[0], memberIds: sortedIds, bureaus, scope, maxSimilarity })
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
 * True when `viewer` has authority to record a decision (consolidate /
 * keep-separate) on `cluster`. An `intra_bureau` cluster is decidable by a
 * reviewer/admin of that bureau, or by any department-level viewer
 * (`isDepartmentLevelViewer`, lib/fieldRegistry.ts). A `cross_bureau` cluster
 * is decidable ONLY by a department-level viewer — a bureau reviewer must
 * never be able to consolidate away another bureau's use case, even one they
 * happen to be able to see (e.g. via a direct submission link).
 */
export function canRationalizeCluster(cluster: RationalizationCluster, viewer: FieldViewer): boolean {
  if (isDepartmentLevelViewer(viewer)) return true
  if (cluster.scope === "cross_bureau") return false
  return !!viewer?.businessUnit && cluster.bureaus.includes(viewer.businessUnit)
}

/**
 * True when `s` is a member of a duplicate cluster that has not yet been
 * decided (consolidated or keep-separate) — the state that blocks approval.
 * Non-duplicates (no cluster) are always false. A stale decision recorded
 * against a different cluster id (e.g. the seed changed shape) is treated as
 * pending, not decided. Applies to intra_bureau clusters exactly like
 * cross_bureau ones — a bureau reviewer clears their own bureau's clusters
 * themselves before any member can be approved.
 */
export function isRationalizationPending(s: Submission, clusters: RationalizationCluster[]): boolean {
  const cluster = clusterForSubmission(s, clusters)
  if (!cluster) return false
  const decision = getRationalization(s)
  return !decision || decision.clusterId !== cluster.id
}

/** True when `cluster` itself (any member) still needs a decision — the cluster-level counterpart to `isRationalizationPending`. */
export function isClusterPending(cluster: RationalizationCluster, submissions: Submission[]): boolean {
  const member = submissions.find((s) => cluster.memberIds.includes(s.id))
  return !member || isRationalizationPending(member, [cluster])
}

/**
 * Count of undecided `intra_bureau` clusters entirely within `unit` — the
 * bureau roll-up's "this bureau has N unresolved internal duplicate
 * clusters" signal, distinct from the existing cross-bureau "Possible
 * duplicates" column (lib/crossBureauDuplicates.ts).
 */
export function pendingIntraBureauClusterCount(
  clusters: RationalizationCluster[],
  submissions: Submission[],
  unit: string,
): number {
  return clusters.filter(
    (c) => c.scope === "intra_bureau" && c.bureaus[0] === unit && isClusterPending(c, submissions),
  ).length
}

const BLOCK_REASON =
  "Rationalization pending — this duplicate cluster must be marked consolidated or keep-separate before approval."

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
