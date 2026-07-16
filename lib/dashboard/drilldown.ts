// KPI drill-down data layer (Roadmap #26) — per-card underlying-item lists for
// the Department Dashboard KPI row (`components/dashboard/kpi-card.tsx`,
// assembled by `buildKpiCards` in `department-dashboard-data.ts`). Today those
// cards show a count only; this module answers "which submissions make up
// that count" without inventing a second data model. Every predicate here is
// imported straight from `lib/dashboard/metrics.ts` (the KPI cards' own source
// of truth) rather than re-implemented, so a drill-down list can never
// disagree with the count on the card it explains. No UI change — this is the
// selector the hover/click follow-up will call.

import type { Submission } from "@/lib/submissions"
import { getStatus, getBusinessUnit, businessUnitLabel, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { determineHighImpact } from "@/lib/highImpactDetermination"
import { getBureauSignoff } from "@/lib/bureauSignoff"
import { determineReportability } from "@/lib/ombReportability"
import { determineConsolidation } from "@/lib/ombConsolidation"
import { clusterDuplicates, isRationalizationPending, tenantHasBureauTier } from "@/lib/rationalization"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { scopedSubmissions, readinessBucket } from "@/lib/dashboard/metrics"

/** One underlying submission behind a KPI count — the compact view model every non-cluster KPI list shares. */
export type KpiDrilldownItem = {
  id: string
  title: string
  bureau: string
  bureauLabel: string
  stage: string
  /** Card-specific value: high-impact rationale, reportability reason + consolidation status, readiness bucket, pipeline status, or sign-off info. */
  cardField: string
}

/** A cross-bureau duplicate cluster behind the `duplicates` KPI count — cluster-shaped, so it carries every member id rather than standing in for a single submission. */
export type DuplicateClusterDrilldownItem = KpiDrilldownItem & {
  memberIds: string[]
}

export type KpiDrilldown = {
  pipeline: KpiDrilldownItem[]
  readiness: KpiDrilldownItem[]
  "high-impact": KpiDrilldownItem[]
  "omb-reportable": KpiDrilldownItem[]
  signoff: KpiDrilldownItem[]
  duplicates: DuplicateClusterDrilldownItem[]
}

function toItem(s: Submission, cardField: string): KpiDrilldownItem {
  const bureau = getBusinessUnit(s)
  return {
    id: s.id,
    title: String((s.formData as Record<string, unknown>)?.useCaseTitle || "Untitled idea"),
    bureau,
    bureauLabel: businessUnitLabel(bureau),
    stage: STATUS_LABEL[getStatus(s)],
    cardField,
  }
}

/**
 * Per-KPI underlying-item lists for one scope, built on the exact predicates
 * `lib/dashboard/metrics.ts` uses for the matching card's count — each list's
 * length equals its `DashboardMetrics` counterpart:
 *   - `pipeline` <-> `pipelineStatusCounts(...).total`
 *   - `readiness` <-> `readinessDistribution(...).ready`
 *   - `high-impact` <-> `highImpactCount(...).count`
 *   - `omb-reportable` <-> `ombReportabilitySummary(...).reportable`
 *   - `signoff` <-> `awaitingSignoff(...).count`
 *   - `duplicates` <-> `crossBureauDuplicatesSummary(...).clusterCount`
 * `duplicates` mirrors that summary's own scoping rule: clustering runs over
 * the full, unscoped submission set (a bureau's half of a cross-bureau
 * duplicate must still resolve even though the bureau can't see the other
 * half), then only clusters with a member in this scope are returned.
 */
export function getKpiDrilldown(
  scope: DashboardScope,
  submissions: Submission[],
  tenant: TenantConfig = getTenant(),
): KpiDrilldown {
  const rows = scopedSubmissions(scope, submissions)

  const pipeline = rows.map((s) => toItem(s, STATUS_LABEL[getStatus(s)]))

  const readiness = rows.filter((s) => readinessBucket(s) === "ready").map((s) => toItem(s, "Ready"))

  const highImpact = rows
    .filter((s) => determineHighImpact(s.formData).recommendation === "yes")
    .map((s) => toItem(s, determineHighImpact(s.formData).reasons.join(" ")))

  const ombReportable = rows
    .filter((s) => determineReportability(s.formData).status === "reportable")
    .map((s) => {
      const { reason } = determineReportability(s.formData)
      const { status: consolidationStatus } = determineConsolidation(s.formData)
      return toItem(s, `${reason} (${consolidationStatus})`)
    })

  const signoff = tenantHasBureauTier(tenant)
    ? rows.filter((s) => getStatus(s) === "approved" && !getBureauSignoff(s)).map((s) => toItem(s, "Awaiting bureau sign-off"))
    : []

  const clusters = clusterDuplicates(submissions, tenant)
  const inScopeIds = new Set(rows.map((s) => s.id))
  const byId = new Map(submissions.map((s) => [s.id, s]))
  const duplicates: DuplicateClusterDrilldownItem[] = clusters
    .filter((c) => c.memberIds.some((id) => inScopeIds.has(id)))
    .map((c) => {
      const lead = byId.get(c.memberIds[0])!
      const pending = isRationalizationPending(lead, clusters)
      return {
        ...toItem(lead, pending ? "Pending rationalization" : "Decided"),
        bureau: c.bureaus.join(","),
        bureauLabel: c.bureaus.map(businessUnitLabel).join(" / "),
        memberIds: c.memberIds,
      }
    })

  return {
    pipeline,
    readiness,
    "high-impact": highImpact,
    "omb-reportable": ombReportable,
    signoff,
    duplicates,
  }
}
