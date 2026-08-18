// Pure types + helpers for the Executive Action Center, pulled out of
// action-center.tsx so ordering logic is unit-testable without rendering
// React.

import type { KpiDrilldownEntry } from "./kpi-card-data"

export type ActionSeverity = "info" | "warning" | "critical"

// What actually happened when an item's button was pressed (CC-5): "sent"
// once the underlying Notifier call went through (lib/notifier.ts), "drafted"
// when the action's own guard kept it from auto-sending (see
// lib/dashboard/actions.ts's `canAutoSend`) — both are successful outcomes,
// just worded differently; a thrown error is the only failure case.
export type ActionOutcome = { status: "sent" | "drafted"; description?: string }

/**
 * The list of underlying records an item's button opens (ES2-12 B) — the same
 * `KpiDrilldownEntry` rows the matching KPI card's dialog already lists
 * (components/dashboard/kpi-card.tsx's `DrilldownDialogContent`), so a
 * "Rationalize"/"Review" button lands the reviewer on exactly the records
 * behind the count it sits next to.
 */
export type ActionDrilldown = { label: string; items: KpiDrilldownEntry[] }

export type ActionItem = {
  id: string
  title: string
  description?: string
  severity?: ActionSeverity
  actionLabel?: string
  // `drilldown` and `onAction` are alternatives, never a pair, and an item
  // with neither renders NO button at all (ES2-12 B — a disabled "Review" told
  // the reviewer there was something to click when nothing was wired):
  //   drilldown -> the button is a DialogTrigger opening that list
  //   onAction  -> ActionCenter shows a pending state while it resolves and a
  //                success/failure toast after
  drilldown?: ActionDrilldown
  onAction?: () => Promise<ActionOutcome>
}

const SEVERITY_RANK: Record<ActionSeverity, number> = { critical: 0, warning: 1, info: 2 }

/** Most-severe-first ordering; stable for equal severities. */
export function sortActionItemsBySeverity(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => SEVERITY_RANK[a.severity || "info"] - SEVERITY_RANK[b.severity || "info"])
}
