// Pure assembly logic for the Department Dashboard (CC-4) — pulled out of
// department-dashboard.tsx so it's unit-testable without rendering React,
// the same split every other components/dashboard/* piece uses. Nothing
// here fetches; every function takes CC-2's DashboardMetrics/DashboardScope
// plus the active tenant and returns view-model values.

import type { TenantConfig } from "@/lib/tenant"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { isLevelAllowed } from "@/lib/dashboard/scope"
import type { DashboardMetrics } from "@/lib/dashboard/metrics"
import type { KpiCardData } from "./kpi-card-data"
import type { ActionItem } from "./action-center-data"
import type { EntitySelection } from "./entity-tree-data"

/**
 * Recomputes the effective dashboard scope from the viewer's base scope plus
 * an entity-tree selection (local state in the dashboard component). Drilling
 * only narrows — a selection outside what the base scope is broad enough to
 * see (`isLevelAllowed`) is ignored and the base scope is kept, so a viewer
 * can never use tree selection to escape their own roll-down.
 */
export function resolveDrillScope(base: DashboardScope, selection: EntitySelection | null): DashboardScope {
  if (!selection) return base
  const level = selection.office ? "office" : "bureau"
  if (!isLevelAllowed(base, level)) return base
  return selection.office
    ? { level: "office", businessUnit: selection.businessUnit, office: selection.office }
    : { level: "bureau", businessUnit: selection.businessUnit }
}

/** Human-readable label for the currently-viewed scope (department name, bureau, or bureau — office). */
export function scopeLabel(scope: DashboardScope, tenant: TenantConfig): string {
  switch (scope.level) {
    case "department":
    case "personal":
      return tenant.orgName
    case "bureau": {
      const bureau = tenant.unit.options.find((o) => o.value === scope.businessUnit)
      return bureau?.label || scope.businessUnit
    }
    case "office": {
      const bureau = tenant.unit.options.find((o) => o.value === scope.businessUnit)
      const office = bureau?.offices?.find((o) => o.value === scope.office)
      return `${bureau?.label || scope.businessUnit} — ${office?.label || scope.office}`
    }
  }
}

/**
 * Top KPI row: pipeline size, readiness, recommended high-impact count, and
 * OMB reportability (with its consolidated/individual split) always render;
 * bureau sign-off and cross-bureau duplicate cards only for tenants with a
 * bureau tier (DoC) — always-zero/meaningless otherwise (see
 * lib/dashboard/metrics.ts's awaitingSignoff/crossBureauDuplicatesSummary).
 */
export function buildKpiCards(metrics: DashboardMetrics, bureauTier: boolean): KpiCardData[] {
  const { pipelineStatus, readiness, highImpact, ombReportability, crossBureauDuplicates, awaitingSignoff } = metrics

  const cards: KpiCardData[] = [
    { id: "pipeline", label: "In pipeline", value: pipelineStatus.total, status: "neutral" },
    {
      id: "readiness",
      label: "Ready",
      value: readiness.ready,
      delta: { value: `${readiness.ready}/${readiness.total}`, direction: readiness.ready > 0 ? "up" : "flat" },
      status: readiness.total > 0 && readiness.ready === readiness.total ? "good" : "neutral",
    },
    {
      id: "high-impact",
      label: "Recommended high-impact",
      value: highImpact.count,
      status: highImpact.count > 0 ? "warning" : "neutral",
    },
    {
      id: "omb-reportable",
      label: "OMB reportable",
      value: ombReportability.reportable,
      delta: {
        value: `${ombReportability.consolidated} consolidated / ${ombReportability.individual} individual`,
        direction: "flat",
      },
      status: ombReportability.review > 0 ? "warning" : "neutral",
    },
  ]

  if (bureauTier) {
    cards.push({
      id: "signoff",
      label: "Awaiting bureau sign-off",
      value: awaitingSignoff.count,
      status: awaitingSignoff.count > 0 ? "warning" : "neutral",
    })
    cards.push({
      id: "duplicates",
      label: "Cross-bureau duplicate clusters",
      value: crossBureauDuplicates.clusterCount,
      delta:
        crossBureauDuplicates.clusterCount > 0
          ? {
              value: `${crossBureauDuplicates.pendingCount} pending`,
              direction: crossBureauDuplicates.pendingCount > 0 ? "down" : "flat",
            }
          : undefined,
      status: crossBureauDuplicates.pendingCount > 0 ? "critical" : "neutral",
    })
  }

  return cards
}

/**
 * Executive Action Center items surfaced from the same metrics — inert this
 * story (no `onAction`, see ActionItem/ActionCenter): CC-5 wires real
 * handlers in. Duplicate-cluster and sign-off items only surface for
 * bureau-tier tenants, matching the KPI cards above.
 */
export function buildActionItems(metrics: DashboardMetrics, bureauTier: boolean): ActionItem[] {
  const items: ActionItem[] = []

  if (bureauTier && metrics.crossBureauDuplicates.pendingCount > 0) {
    const n = metrics.crossBureauDuplicates.pendingCount
    items.push({
      id: "duplicates",
      title: `${n} cross-bureau duplicate cluster${n === 1 ? "" : "s"} pending rationalization`,
      severity: "critical",
      actionLabel: "Rationalize",
    })
  }

  if (bureauTier && metrics.awaitingSignoff.count > 0) {
    const n = metrics.awaitingSignoff.count
    items.push({
      id: "signoff",
      title: `${n} approved use case${n === 1 ? "" : "s"} awaiting bureau sign-off`,
      severity: "warning",
      actionLabel: "Review",
    })
  }

  if (metrics.ombReportability.review > 0) {
    const n = metrics.ombReportability.review
    items.push({
      id: "omb-review",
      title: `${n} submission${n === 1 ? " needs" : "s need"} an OMB reportability review`,
      severity: "info",
      actionLabel: "Review",
    })
  }

  return items
}

/**
 * A single 0-100 "pipeline health" scalar for the HealthGauge — ready
 * submissions count in full, needs-work count at half weight, early-stage
 * and not-assessed count as 0. `0` when the scope has no submissions yet
 * (nothing to assess), matching the gauge's own 0-100 scale.
 */
export function computeHealthScore(metrics: DashboardMetrics): number {
  const { ready, needs_work, total } = metrics.readiness
  if (total === 0) return 0
  return Math.round((ready * 100 + needs_work * 50) / total)
}
