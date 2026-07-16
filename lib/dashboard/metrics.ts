// Command Center dashboard metrics — pure functions that take a
// `DashboardScope` (lib/dashboard/scope.ts) plus the app's cached submissions
// and return typed card values for the landing dashboard. No fetching, no new
// data model: every card is derived from the same libs the pipeline, roll-up,
// and OMB surfaces already use, so a Command Center card never disagrees with
// the page it summarizes.
//
// Every card is constrained to the scope's slice via `scopedSubmissions`,
// which mirrors `visibleSubmissions`'s roll-down predicate (lib/reviewWorkflow.ts)
// exactly — a bureau/office scope never counts a submission outside that
// bureau/office. Like `visibleSubmissions`, this is a view-model convenience,
// not a security boundary.

import type { Submission } from "@/lib/submissions"
import {
  getStatus,
  getBusinessUnit,
  getOffice,
  getOwnerEmail,
  STATUS_ORDER,
  type SubmissionStatus,
} from "@/lib/reviewWorkflow"
import { determineHighImpact } from "@/lib/highImpactDetermination"
import { getBureauSignoff } from "@/lib/bureauSignoff"
import { determineReportability } from "@/lib/ombReportability"
import { determineConsolidation } from "@/lib/ombConsolidation"
import { clusterDuplicates, isRationalizationPending, tenantHasBureauTier } from "@/lib/rationalization"
import { officeRollupRows, type OfficeRollupRow } from "@/lib/officeRollup"
import { resolveRmfProfile } from "@/lib/rmfProfileReview"
import type { RmfRiskLevel } from "@/lib/nistRmf"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import type { DashboardScope } from "@/lib/dashboard/scope"

/**
 * Restricts `submissions` to the slice a scope's cards may count — the same
 * roll-down predicate `visibleSubmissions` applies to an equivalent viewer
 * (personal by owner email; bureau/office by business unit/office), just
 * keyed off a `DashboardScope` instead of a `{ role, businessUnit, office }`
 * viewer. Every card function below is built on top of this, so a card can
 * never count a row outside the scope.
 */
export function scopedSubmissions(scope: DashboardScope, submissions: Submission[]): Submission[] {
  switch (scope.level) {
    case "personal": {
      const email = scope.email.toLowerCase()
      return submissions.filter((s) => getOwnerEmail(s) === email)
    }
    case "department":
      return submissions
    case "bureau":
      return submissions.filter((s) => getBusinessUnit(s) === scope.businessUnit)
    case "office":
      return submissions.filter(
        (s) => getBusinessUnit(s) === scope.businessUnit && getOffice(s) === scope.office,
      )
  }
}

export type PipelineStatusCard = { counts: Record<SubmissionStatus, number>; total: number }

/** Pipeline status counts, scoped — built on `getStatus`/`STATUS_ORDER` (lib/reviewWorkflow.ts). */
export function pipelineStatusCounts(scope: DashboardScope, submissions: Submission[]): PipelineStatusCard {
  const rows = scopedSubmissions(scope, submissions)
  const counts = {} as Record<SubmissionStatus, number>
  for (const st of STATUS_ORDER) counts[st] = rows.filter((s) => getStatus(s) === st).length
  return { counts, total: rows.length }
}

export type ReadinessBucket = "ready" | "needs_work" | "early_stage" | "not_assessed"
export type ReadinessDistributionCard = Record<ReadinessBucket, number> & { total: number }

/** Buckets one submission's `formData.readinessScore` — the single source of truth `lib/dashboard/drilldown.ts` reuses so its readiness list never diverges from this count. */
export function readinessBucket(s: Submission): ReadinessBucket {
  const v = (s.formData as Record<string, unknown> | undefined)?.readinessScore
  return v === "ready" || v === "needs_work" || v === "early_stage" ? v : "not_assessed"
}

/** Readiness-score distribution, scoped — reads `formData.readinessScore` (lib/submissionReadiness.ts's AI quality gate field). */
export function readinessDistribution(scope: DashboardScope, submissions: Submission[]): ReadinessDistributionCard {
  const rows = scopedSubmissions(scope, submissions)
  const dist: ReadinessDistributionCard = { ready: 0, needs_work: 0, early_stage: 0, not_assessed: 0, total: rows.length }
  for (const s of rows) dist[readinessBucket(s)]++
  return dist
}

export type HighImpactCard = { count: number; total: number }

/**
 * Recommended-high-impact count, scoped — built on `determineHighImpact`
 * (lib/highImpactDetermination.ts), so the card reflects the same
 * manual-plus-inferred recommendation the submission detail view shows,
 * rather than trusting a bare self-reported `formData.highImpact` flag.
 */
export function highImpactCount(scope: DashboardScope, submissions: Submission[]): HighImpactCard {
  const rows = scopedSubmissions(scope, submissions)
  const count = rows.filter((s) => determineHighImpact(s.formData).recommendation === "yes").length
  return { count, total: rows.length }
}

export type AwaitingSignoffCard = { count: number; total: number }

/**
 * Approved submissions with no recorded bureau sign-off, scoped — the
 * "legacy approval" gap docs/ARCHITECTURE.md describes (built on
 * `getBureauSignoff`, lib/bureauSignoff.ts). Always `{ count: 0, total }` for
 * tenants without a bureau tier (USPTO/DoW never record `bureauSignoff`, so
 * every approved submission would otherwise show as "awaiting").
 */
export function awaitingSignoff(
  scope: DashboardScope,
  submissions: Submission[],
  tenant: TenantConfig = getTenant(),
): AwaitingSignoffCard {
  const approved = scopedSubmissions(scope, submissions).filter((s) => getStatus(s) === "approved")
  if (!tenantHasBureauTier(tenant)) return { count: 0, total: approved.length }
  return { count: approved.filter((s) => !getBureauSignoff(s)).length, total: approved.length }
}

export type OmbReportabilityCard = {
  reportable: number
  excluded: number
  review: number
  // Among `reportable` only — how many are OMB-Consolidated vs Individual.
  consolidated: number
  individual: number
}

/** OMB reportability + consolidated/individual breakdown, scoped — built on `determineReportability`/`determineConsolidation`. */
export function ombReportabilitySummary(scope: DashboardScope, submissions: Submission[]): OmbReportabilityCard {
  const rows = scopedSubmissions(scope, submissions)
  const card: OmbReportabilityCard = { reportable: 0, excluded: 0, review: 0, consolidated: 0, individual: 0 }
  for (const s of rows) {
    const { status } = determineReportability(s.formData)
    card[status]++
    if (status === "reportable") {
      if (determineConsolidation(s.formData).status === "Consolidated") card.consolidated++
      else card.individual++
    }
  }
  return card
}

export type CrossBureauDuplicatesCard = { clusterCount: number; pendingCount: number }

/**
 * Cross-bureau duplicate clusters that touch this scope, scoped — built on
 * `clusterDuplicates`/`isRationalizationPending` (lib/rationalization.ts).
 * Clustering itself deliberately runs over the FULL, unscoped submission set
 * (`clusterDuplicates`'s own rule — a bureau's half of a cross-bureau
 * duplicate must still be counted even though the bureau can't see the other
 * half); only the reported clusters are then filtered to ones with at least
 * one member in this scope. `[]`/`0` for tenants without a bureau tier.
 */
export function crossBureauDuplicatesSummary(
  scope: DashboardScope,
  allSubmissions: Submission[],
  tenant: TenantConfig = getTenant(),
): CrossBureauDuplicatesCard {
  const clusters = clusterDuplicates(allSubmissions, tenant)
  if (clusters.length === 0) return { clusterCount: 0, pendingCount: 0 }

  const inScopeIds = new Set(scopedSubmissions(scope, allSubmissions).map((s) => s.id))
  const byId = new Map(allSubmissions.map((s) => [s.id, s]))
  const relevant = clusters.filter((c) => c.memberIds.some((id) => inScopeIds.has(id)))
  const pendingCount = relevant.filter((c) => {
    const first = byId.get(c.memberIds[0])
    return !!first && isRationalizationPending(first, clusters)
  }).length

  return { clusterCount: relevant.length, pendingCount }
}

export type RmfRollupCard = Record<RmfRiskLevel, number> & { total: number }

/**
 * NIST AI RMF overall-level rollup, scoped — built on `resolveRmfProfile`
 * (lib/rmfProfileReview.ts) rather than a bare `computeRmfProfile` call, so a
 * reviewer's confirmed/overridden level counts here exactly as Decision
 * Center and the submission detail page badge it. Always computed regardless
 * of `features.rmf` — like every other card here, gating on the flag is the
 * caller's job (`buildKpiCards`'s `rmfEnabled` param decides whether the KPI
 * card itself renders).
 */
export function rmfRollupSummary(
  scope: DashboardScope,
  submissions: Submission[],
  tenant: TenantConfig = getTenant(),
): RmfRollupCard {
  const rows = scopedSubmissions(scope, submissions)
  const card: RmfRollupCard = { on_track: 0, attention: 0, at_risk: 0, unknown: 0, total: rows.length }
  for (const s of rows) card[resolveRmfProfile(s, tenant).effectiveOverall]++
  return card
}

export type BureauRollupRow = OfficeRollupRow

/**
 * Per-bureau roll-up rows across the scope's visible bureaus — one row per
 * bureau present in the scoped submissions, ordered per `tenant.unit.options`
 * (the same ordering `components/admin/bureau-rollup.tsx` uses). `[]` for a
 * "personal" scope (submitters don't get a cross-bureau roll-up card).
 */
export function bureauRollupRows(
  scope: DashboardScope,
  submissions: Submission[],
  tenant: TenantConfig = getTenant(),
): BureauRollupRow[] {
  if (scope.level === "personal") return []
  const rows = scopedSubmissions(scope, submissions)

  const configOrder = tenant.unit.options.map((o) => o.value)
  const units = Array.from(new Set(rows.map(getBusinessUnit).filter(Boolean))).sort((a, b) => {
    const ia = configOrder.indexOf(a)
    const ib = configOrder.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  return units.map((unit) => {
    const inUnit = rows.filter((s) => getBusinessUnit(s) === unit)
    const counts = {} as Record<SubmissionStatus, number>
    for (const st of STATUS_ORDER) counts[st] = inUnit.filter((s) => getStatus(s) === st).length
    return {
      value: unit,
      label: tenant.unit.options.find((o) => o.value === unit)?.label || unit,
      counts,
      total: inUnit.length,
      highImpact: inUnit.filter((s) => s.formData.highImpact === "high_impact").length,
    }
  })
}

/**
 * Per-office roll-up rows for the scope's own bureau — delegates directly to
 * `officeRollupRows` (lib/officeRollup.ts). `[]` for "department" (no single
 * bureau to drill into at that level — a caller can drill into one bureau at
 * a time via `bureauRollupRows` + a per-bureau call of its own) and
 * "personal".
 */
export function officeRollupRowsForScope(
  scope: DashboardScope,
  submissions: Submission[],
  tenant: TenantConfig = getTenant(),
): OfficeRollupRow[] {
  if (scope.level !== "bureau" && scope.level !== "office") return []
  return officeRollupRows(scopedSubmissions(scope, submissions), scope.businessUnit, tenant)
}

export type DashboardMetrics = {
  scope: DashboardScope
  pipelineStatus: PipelineStatusCard
  readiness: ReadinessDistributionCard
  highImpact: HighImpactCard
  awaitingSignoff: AwaitingSignoffCard
  ombReportability: OmbReportabilityCard
  crossBureauDuplicates: CrossBureauDuplicatesCard
  bureauRollup: BureauRollupRow[]
  officeRollup: OfficeRollupRow[]
  rmfRollup: RmfRollupCard
}

/** Computes every Command Center card for one scope in a single pass. */
export function getDashboardMetrics(
  scope: DashboardScope,
  submissions: Submission[],
  tenant: TenantConfig = getTenant(),
): DashboardMetrics {
  return {
    scope,
    pipelineStatus: pipelineStatusCounts(scope, submissions),
    readiness: readinessDistribution(scope, submissions),
    highImpact: highImpactCount(scope, submissions),
    awaitingSignoff: awaitingSignoff(scope, submissions, tenant),
    ombReportability: ombReportabilitySummary(scope, submissions),
    crossBureauDuplicates: crossBureauDuplicatesSummary(scope, submissions, tenant),
    bureauRollup: bureauRollupRows(scope, submissions, tenant),
    officeRollup: officeRollupRowsForScope(scope, submissions, tenant),
    rmfRollup: rmfRollupSummary(scope, submissions, tenant),
  }
}
