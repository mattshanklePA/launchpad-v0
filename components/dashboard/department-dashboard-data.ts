// Pure assembly logic for the Department Dashboard (CC-4) — pulled out of
// department-dashboard.tsx so it's unit-testable without rendering React,
// the same split every other components/dashboard/* piece uses. Nothing
// here fetches; every function takes CC-2's DashboardMetrics/DashboardScope
// plus the active tenant and returns view-model values.

import { getTenant, type TenantConfig } from "@/lib/tenant"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { isLevelAllowed } from "@/lib/dashboard/scope"
import type { DashboardMetrics } from "@/lib/dashboard/metrics"
import type { DashboardAction } from "@/lib/dashboard/actions"
import type { KpiDrilldown, KpiDrilldownItem } from "@/lib/dashboard/drilldown"
import { STATUS_LABEL } from "@/lib/reviewWorkflow"
import { sendDashboardActionNotification } from "@/app/dashboard-actions"
import type { KpiCardData } from "./kpi-card-data"
import type { ActionDrilldown, ActionItem, ActionOutcome } from "./action-center-data"
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

/** Human-readable label for the currently-viewed scope (department name, bureau, or bureau, office). */
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
      return `${bureau?.label || scope.businessUnit}, ${office?.label || scope.office}`
    }
  }
}

/**
 * Top KPI row: pipeline size, readiness, recommended high-impact count, and
 * OMB reportability (with its consolidated/individual split) always render;
 * bureau sign-off and cross-bureau duplicate cards only for tenants with a
 * bureau tier (DoC) — always-zero/meaningless otherwise (see
 * lib/dashboard/metrics.ts's awaitingSignoff/crossBureauDuplicatesSummary);
 * the RMF rollup card only for tenants with `features.rmf` on (DoC) — same
 * gate `submission-detail.tsx`/`decision-center.tsx` use for their own RMF
 * surfaces.
 *
 * `tenant` supplies the org-tier vocabulary the bureau-tier cards read
 * (`tierLabels`, see docs/ARCHITECTURE.md). The `bureauTier` gate decides
 * *whether* those cards render, never *what words* they use — every
 * bureau-tier tenant (DoC today, ES2 next) needs its own.
 */
export function buildKpiCards(
  metrics: DashboardMetrics,
  bureauTier: boolean,
  rmfEnabled: boolean = false,
  tenant: TenantConfig = getTenant(),
): KpiCardData[] {
  const { pipelineStatus, readiness, highImpact, ombReportability, crossBureauDuplicates, awaitingSignoff, rmfRollup } = metrics
  const tiers = tenant.tierLabels

  const cards: KpiCardData[] = [
    {
      id: "pipeline",
      label: "In pipeline",
      value: pipelineStatus.total,
      status: "neutral",
      glossary: "inPipeline",
      subtitle: "Every use case in this view",
    },
    {
      id: "readiness",
      label: "Ready",
      value: readiness.ready,
      delta: { value: `${readiness.ready}/${readiness.total}`, direction: readiness.ready > 0 ? "up" : "flat" },
      status: readiness.total > 0 && readiness.ready === readiness.total ? "good" : "neutral",
      glossary: "readinessReady",
      subtitle: "Enough info for a decision",
    },
    {
      id: "high-impact",
      label: "Recommended high-impact",
      value: highImpact.count,
      status: highImpact.count > 0 ? "warning" : "neutral",
    },
    {
      id: "omb-reportable",
      label: `${tenant.inventoryShortLabel} reportable`,
      value: ombReportability.reportable,
      delta: {
        value: `${ombReportability.consolidated} consolidated / ${ombReportability.individual} individual`,
        direction: "flat",
      },
      status: ombReportability.review > 0 ? "warning" : "neutral",
      glossary: "ombReportability",
      subtitle: "Required for the annual AI inventory",
    },
  ]

  if (bureauTier) {
    cards.push({
      id: "signoff",
      label: `Awaiting ${tiers.unit.toLowerCase()} sign-off`,
      value: awaitingSignoff.count,
      status: awaitingSignoff.count > 0 ? "warning" : "neutral",
      glossary: "awaitingBureauSignOff",
      subtitle: `Approved, pending ${tiers.unit.toLowerCase()} confirmation`,
    })
    cards.push({
      id: "duplicates",
      label: `Cross-${tiers.unit.toLowerCase()} duplicate clusters`,
      value: crossBureauDuplicates.clusterCount,
      delta:
        crossBureauDuplicates.clusterCount > 0
          ? {
              value: `${crossBureauDuplicates.pendingCount} pending`,
              direction: crossBureauDuplicates.pendingCount > 0 ? "down" : "flat",
            }
          : undefined,
      status: crossBureauDuplicates.pendingCount > 0 ? "critical" : "neutral",
      glossary: "crossBureauRationalization",
      subtitle: "May be the same effort, built twice",
    })
  }

  if (rmfEnabled) {
    cards.push({
      id: "rmf",
      label: "RMF at risk",
      value: rmfRollup.at_risk,
      delta: rmfRollup.attention > 0 ? { value: `${rmfRollup.attention} need attention`, direction: "down" } : undefined,
      status: rmfRollup.at_risk > 0 ? "critical" : rmfRollup.attention > 0 ? "warning" : "neutral",
      glossary: "rmfAtRisk",
      subtitle: "NIST AI RMF gap needs attention",
    })
  }

  // A tenant may pin its strip to a subset (ES2-15): filter and order by that
  // list, after assembly, so every card is computed identically whether or not
  // it renders. `getKpiDrilldown` and `buildActionItems` are unaffected — the
  // Action Center rows for a card that is no longer drawn keep their lists.
  const pinned = tenant.dashboardKpiCardIds
  if (pinned) return pinned.map((id) => cards.find((c) => c.id === id)).filter((c): c is KpiCardData => !!c)

  return cards
}

/**
 * Sends (or, per the guard, drafts) a batch of same-kind dashboard actions
 * through the one Notifier wiring (app/dashboard-actions.ts ->
 * lib/notifier.ts) and turns the result into the toast copy ActionCenter
 * shows. The sign-off nudge is the only caller left (ES2-12 B retired the
 * request-info wiring, which `canAutoSend` could never let send) — the guard
 * that decides whether anything actually sends lives in
 * lib/dashboard/actions.ts's `canAutoSend`, not here.
 */
async function notifyDashboardActions(actions: DashboardAction[], draftReason: string): Promise<ActionOutcome> {
  const result = await sendDashboardActionNotification(actions)
  return result.sent
    ? { status: "sent", description: `Notified ${result.count} reviewer${result.count === 1 ? "" : "s"} via Slack.` }
    : { status: "drafted", description: draftReason }
}

/**
 * Turns a batch of same-kind `DashboardAction`s into KPI-drill-down rows, so
 * the two Action Center items with no KPI card of their own (unassigned,
 * needs-info) can open the same dialog the card-backed items do. `stage` and
 * `cardField` are the kind's own fixed vocabulary — a `DashboardAction`
 * carries no lifecycle status of its own, and every action in one of these
 * batches is in that kind by construction.
 */
function actionsAsDrilldownItems(actions: DashboardAction[], stage: string, cardField: string): KpiDrilldownItem[] {
  return actions.map((a) => ({
    id: a.submissionId,
    title: a.submissionTitle,
    bureau: a.bureau,
    bureauLabel: a.bureauLabel,
    stage,
    cardField,
  }))
}

/** `undefined` (-> no button) when the caller passed no drill-down, so the CC-4 callers degrade cleanly. */
function actionDrilldown(label: string, items: KpiDrilldownItem[] | undefined): ActionDrilldown | undefined {
  return items ? { label, items } : undefined
}

/**
 * Executive Action Center items. Every item that isn't a real, sendable
 * notification now opens the list of records behind its own count (ES2-12 B):
 * `drilldown` (the `getKpiDrilldown` lists the KPI cards already use, passed
 * through by the dashboard callers) makes the button a drill-down trigger,
 * and an item with neither `drilldown` nor `onAction` renders no button at
 * all. `dashboardActions` (lib/dashboard/actions.ts, CC-5) supplies the
 * unassigned and needs-info items and keeps the one genuinely wired action,
 * the sign-off nudge, on `onAction`. Passing no `dashboardActions`/`drilldown`
 * (the CC-4 callers, and the older tests) yields buttonless items.
 */
export function buildActionItems(
  metrics: DashboardMetrics,
  bureauTier: boolean,
  dashboardActions: DashboardAction[] = [],
  tenant: TenantConfig = getTenant(),
  drilldown?: KpiDrilldown,
): ActionItem[] {
  const items: ActionItem[] = []
  const tiers = tenant.tierLabels

  if (bureauTier && metrics.crossBureauDuplicates.pendingCount > 0) {
    const n = metrics.crossBureauDuplicates.pendingCount
    items.push({
      id: "duplicates",
      title: `${n} cross-${tiers.unit.toLowerCase()} duplicate cluster${n === 1 ? "" : "s"} pending rationalization`,
      severity: "critical",
      actionLabel: "Rationalize",
      // The same clusters the Duplicates KPI card opens — each row's "Open
      // cluster" link is the path the rationalization walkthrough already uses.
      drilldown: actionDrilldown(`Cross-${tiers.unit.toLowerCase()} duplicate clusters`, drilldown?.duplicates),
    })
  }

  if (bureauTier && metrics.awaitingSignoff.count > 0) {
    const n = metrics.awaitingSignoff.count
    const signoffActions = dashboardActions.filter((a) => a.kind === "signoff_nudge")
    items.push({
      id: "signoff",
      title: `${n} approved use case${n === 1 ? "" : "s"} awaiting ${tiers.unit.toLowerCase()} sign-off`,
      severity: "warning",
      actionLabel: "Nudge sign-off",
      onAction:
        signoffActions.length > 0
          ? () =>
              notifyDashboardActions(
                signoffActions,
                `No reviewer is on file for these ${tiers.unitPlural.toLowerCase()} yet — assign one from Pipeline before nudging.`,
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
      // Not wired to the Notifier: `canAutoSend` is false for every needs_info
      // action (lib/dashboard/actions.ts — there is no channel to a submitter
      // outside the product), so the button could only ever toast "Drafted,
      // not sent" and tell the reviewer to open the submission. The drill-down
      // takes them straight there instead. No send behavior is lost.
      drilldown: actionDrilldown(
        "Waiting on submitter follow-up",
        drilldown && actionsAsDrilldownItems(needsInfoActions, STATUS_LABEL.needs_info, "Waiting on submitter"),
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
      // "Assign" over "Review": assigning a reviewer is the thing that clears
      // this item, and it happens on the submission the drill-down opens.
      actionLabel: "Assign",
      drilldown: actionDrilldown(
        "No reviewer assigned",
        drilldown && actionsAsDrilldownItems(unassignedActions, "Unassigned", "No reviewer assigned"),
      ),
    })
  }

  if (metrics.ombReportability.review > 0) {
    const n = metrics.ombReportability.review
    items.push({
      id: "omb-review",
      title: `${n} submission${n === 1 ? " needs" : "s need"} an ${tenant.inventoryShortLabel} reportability review`,
      severity: "info",
      actionLabel: "Review",
      // The inventory-reportable KPI card's own list. Its length is the
      // `reportable` count, not the `review` count in this item's title — the
      // dialog states its own count, and this is the list a reportability
      // review is conducted against.
      drilldown: actionDrilldown(`${tenant.inventoryShortLabel} reportable`, drilldown?.["omb-reportable"]),
    })
  }

  return items
}

/**
 * UX #4 / RD-1: the one-line "worklist-first" headline the Command Center
 * header row reads (`.ks-section-head`) so an admin sees what needs them
 * before any metric — pluralizes, and reads as an all-clear rather than
 * "0 items" once nothing does. `scoped` appends "here" (RD-1 mock 02) for a
 * bureau/office view, so the line reads as "here" rather than claiming the
 * whole enterprise; the all-clear sentence doesn't vary by scope.
 */
export function worklistSummaryLabel(actionItems: ActionItem[], scoped: boolean = false): string {
  const n = actionItems.length
  if (n === 0) return "Today: nothing needs you right now."
  return `Today: ${n} item${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} you${scoped ? " here" : ""}`
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
