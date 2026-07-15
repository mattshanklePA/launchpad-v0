// Pure types + helpers for the Executive Action Center, pulled out of
// action-center.tsx so ordering logic is unit-testable without rendering
// React.

export type ActionSeverity = "info" | "warning" | "critical"

export type ActionItem = {
  id: string
  title: string
  description?: string
  severity?: ActionSeverity
  actionLabel?: string
  // Inert placeholder this story (CC-3) — when omitted, the rendered button
  // is disabled. CC-5 wires real handlers in.
  onAction?: () => void
}

const SEVERITY_RANK: Record<ActionSeverity, number> = { critical: 0, warning: 1, info: 2 }

/** Most-severe-first ordering; stable for equal severities. */
export function sortActionItemsBySeverity(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => SEVERITY_RANK[a.severity || "info"] - SEVERITY_RANK[b.severity || "info"])
}
