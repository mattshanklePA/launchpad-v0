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

const TREND_TEXT_CLASS: Record<KpiTrendDirection, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  flat: "text-muted-foreground",
}

/** Text color class for a delta's trend direction. */
export function kpiTrendTextClass(direction: KpiTrendDirection): string {
  return TREND_TEXT_CLASS[direction]
}
