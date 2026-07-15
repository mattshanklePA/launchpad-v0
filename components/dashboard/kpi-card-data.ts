// Pure types + helpers for the KPI card grid, pulled out of kpi-card.tsx so
// they're unit-testable without rendering React (same split as
// lib/officeRollup.ts / components/admin/office-rollup.tsx).

export type KpiTrendDirection = "up" | "down" | "flat"
export type KpiStatus = "neutral" | "good" | "warning" | "critical"

export type KpiDelta = { value: string; direction: KpiTrendDirection }

export type KpiCardData = {
  id: string
  label: string
  value: string | number
  delta?: KpiDelta
  status?: KpiStatus
}

const STATUS_ACCENT_CLASS: Record<KpiStatus, string> = {
  neutral: "border-l-border",
  good: "border-l-emerald-500",
  warning: "border-l-amber-500",
  critical: "border-l-red-500",
}

/** Left-border accent class for a KPI card's status. */
export function kpiStatusAccentClass(status: KpiStatus = "neutral"): string {
  return STATUS_ACCENT_CLASS[status]
}

const STATUS_SURFACE_CLASS: Record<KpiStatus, string> = {
  neutral: "",
  good: "",
  warning: "bg-amber-50/70 dark:bg-amber-950/20",
  critical: "bg-red-50/70 dark:bg-red-950/20",
}

/** Background tint for a KPI card's status — only actionable (warning/critical) statuses get one. */
export function kpiStatusSurfaceClass(status: KpiStatus = "neutral"): string {
  return STATUS_SURFACE_CLASS[status]
}

/** Whether a KPI's status represents something that needs attention, for sort order and emphasis. */
export function kpiIsActionable(status: KpiStatus = "neutral"): boolean {
  return status === "warning" || status === "critical"
}

const STATUS_SORT_RANK: Record<KpiStatus, number> = { critical: 0, warning: 1, good: 2, neutral: 3 }

/** Sorts KPI cards so actionable/at-risk cards lead and neutral counts trail. Stable within a status. */
export function sortKpiCardsByPriority(cards: KpiCardData[]): KpiCardData[] {
  return [...cards].sort((a, b) => STATUS_SORT_RANK[a.status ?? "neutral"] - STATUS_SORT_RANK[b.status ?? "neutral"])
}

const TREND_TEXT_CLASS: Record<KpiTrendDirection, string> = {
  // emerald-600 on white is 3.76:1 at this text size (fails WCAG 2.1 AA
  // 4.5:1); emerald-700 clears it while staying visually "green".
  up: "text-emerald-700 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  flat: "text-muted-foreground",
}

/** Text color class for a delta's trend direction. */
export function kpiTrendTextClass(direction: KpiTrendDirection): string {
  return TREND_TEXT_CLASS[direction]
}
