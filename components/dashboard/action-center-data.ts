// Pure types + helpers for the Executive Action Center, pulled out of
// action-center.tsx so ordering logic is unit-testable without rendering
// React.

export type ActionSeverity = "info" | "warning" | "critical"

// What actually happened when an item's button was pressed (CC-5): "sent"
// once the underlying Notifier call went through (lib/notifier.ts), "drafted"
// when the action's own guard kept it from auto-sending (see
// lib/dashboard/actions.ts's `canAutoSend`) — both are successful outcomes,
// just worded differently; a thrown error is the only failure case.
export type ActionOutcome = { status: "sent" | "drafted"; description?: string }

export type ActionItem = {
  id: string
  title: string
  description?: string
  severity?: ActionSeverity
  actionLabel?: string
  // Omitted -> the rendered button is disabled (no wired handler for this
  // item, e.g. an informational-only item). Present -> ActionCenter shows a
  // pending state while it resolves and a success/failure toast after.
  onAction?: () => Promise<ActionOutcome>
}

const SEVERITY_RANK: Record<ActionSeverity, number> = { critical: 0, warning: 1, info: 2 }

/** Most-severe-first ordering; stable for equal severities. */
export function sortActionItemsBySeverity(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => SEVERITY_RANK[a.severity || "info"] - SEVERITY_RANK[b.severity || "info"])
}
