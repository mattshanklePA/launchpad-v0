// Pure assembly logic for the Department Dashboard (CC-4) — pulled out of
// department-dashboard.tsx so it's unit-testable without rendering React,
// the same split every other components/dashboard/* piece uses. Nothing
// here fetches; every function takes CC-2's DashboardMetrics/DashboardScope
// plus the active tenant and returns view-model values.

import type { TenantConfig } from "@/lib/tenant"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { isLevelAllowed } from "@/lib/dashboard/scope"
import type { DashboardMetrics } from "@/lib/dashboard/metrics"
import type { DashboardAction } from "@/lib/dashboard/actions"
import { sendDashboardActionNotification } from "@/app/dashboard-actions"
import type { KpiCardData } from "./kpi-card-data"
import type { ActionItem, ActionOutcome } from "./action-center-data"
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
 * Sends (or, per the guard, drafts) a batch of same-kind dashboard actions
 * through the one Notifier wiring (app/dashboard-actions.ts ->
 * lib/notifier.ts) and turns the result into the toast copy ActionCenter
 * shows. Both wired buttons (sign-off nudge, request info) call this same
 * function — the guard that decides whether anything actually sends lives in
 * lib/dashboard/actions.ts's `canAutoSend`, not here.
 */
async function notifyDashboardActions(actions: DashboardAction[], draftReason: string): Promise<ActionOutcome> {
  const result = await sendDashboardActionNotification(actions)
  return result.sent
    ? { status: "sent", description: `Notified ${result.count} reviewer${result.count === 1 ? "" : "s"} via Slack.` }
    : { status: "drafted", description: draftReason }
}

/**
 * Executive Action Center items — the KPI-card-driven summaries (duplicates,
 * OMB review) stay informational, unchanged from CC-4. `dashboardActions`
 * (lib/dashboard/actions.ts, CC-5) adds the two wired items — sign-off nudge
 * and request info — plus an informational unassigned-submissions item; all
 * three are `[]`/absent when there's nothing of that kind in scope. Passing
 * no `dashboardActions` (the CC-4 callers, and every existing test) reproduces
 * the prior inert-item behavior exactly.
 */
export function buildActionItems(
  metrics: DashboardMetrics,
  bureauTier: boolean,
  dashboardActions: DashboardAction[] = [],
): ActionItem[] {
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
    const signoffActions = dashboardActions.filter((a) => a.kind === "signoff_nudge")
    items.push({
      id: "signoff",
      title: `${n} approved use case${n === 1 ? "" : "s"} awaiting bureau sign-off`,
      severity: "warning",
      actionLabel: "Nudge sign-off",
      onAction:
        signoffActions.length > 0
          ? () =>
              notifyDashboardActions(
                signoffActions,
                "No reviewer is on file for these bureaus yet — assign one from Pipeline before nudging.",
              )
          : undefined,
    })
  }

  const needsInfoActions = dashboardActions.filter((a) => a.kind === "needs_info")
  if (needsInfoActions.length > 0) {
    const n = needsInfoActions.length
    items.push({
      id: "needs-info",
      title: `${n} submission${n === 1 ? "" : "s"} waiting on submitter follow-up`,
      severity: "warning",
      actionLabel: "Request info",
      onAction: () =>
        notifyDashboardActions(
          needsInfoActions,
          "Reminders to a submitter aren't sent over Slack — open the submission and use Request info to message them directly.",
        ),
    })
  }

  const unassignedActions = dashboardActions.filter((a) => a.kind === "unassigned")
  if (unassignedActions.length > 0) {
    const n = unassignedActions.length
    items.push({
      id: "unassigned",
      title: `${n} submission${n === 1 ? "" : "s"} with no reviewer assigned`,
      severity: "warning",
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
