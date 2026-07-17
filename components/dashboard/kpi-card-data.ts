// Pure types + helpers for the KPI card grid, pulled out of kpi-card.tsx so
// they're unit-testable without rendering React (same split as
// lib/officeRollup.ts / components/admin/office-rollup.tsx).

import type { KpiDrilldown, KpiDrilldownItem, DuplicateClusterDrilldownItem } from "@/lib/dashboard/drilldown"
import type { GlossaryTermKey } from "@/lib/glossary"

export type KpiTrendDirection = "up" | "down" | "flat"
export type KpiStatus = "neutral" | "good" | "warning" | "critical"

export type KpiDelta = { value: string; direction: KpiTrendDirection }

export type KpiCardData = {
  id: string
  label: string
  value: string | number
  delta?: KpiDelta
  status?: KpiStatus
  /** Glossary key (lib/glossary.ts) behind the label's "?" tooltip — omitted for self-explanatory labels. */
  glossary?: GlossaryTermKey
  /** Short always-visible plain-language line under the value, for jargon labels a tooltip alone won't reach on touch. */
  subtitle?: string
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

/** One underlying item behind a KPI card — a plain submission or (for `duplicates`) a cluster. */
export type KpiDrilldownEntry = KpiDrilldownItem | DuplicateClusterDrilldownItem

/** How many baseball cards the hover preview shows before falling back to "+N more". */
export const KPI_HOVER_PREVIEW_LIMIT = 4

/**
 * True when a drill-down entry is a cross-bureau duplicate cluster rather
 * than a single submission — clusters carry `memberIds` (lib/dashboard/drilldown.ts),
 * plain items never do.
 */
export function isDuplicateClusterEntry(item: KpiDrilldownEntry): item is DuplicateClusterDrilldownItem {
  return "memberIds" in item
}

/** The `getKpiDrilldown` list for one KPI card id, `[]` if the card has no drill-down (or none loaded yet). */
export function kpiDrilldownEntriesFor(id: string, drilldown?: KpiDrilldown): KpiDrilldownEntry[] {
  if (!drilldown) return []
  return (drilldown as unknown as Record<string, KpiDrilldownEntry[]>)[id] ?? []
}

/** The first `limit` entries for the hover-card preview; the dialog always lists every entry. */
export function previewKpiDrilldownEntries(
  items: KpiDrilldownEntry[],
  limit: number = KPI_HOVER_PREVIEW_LIMIT,
): KpiDrilldownEntry[] {
  return items.slice(0, limit)
}

/** How many entries the hover-card preview truncates — 0 once every entry fits, driving the "+N more" affordance. */
export function kpiDrilldownOverflowCount(items: KpiDrilldownEntry[], limit: number = KPI_HOVER_PREVIEW_LIMIT): number {
  return Math.max(0, items.length - limit)
}

export type CardFieldPresentation = { badge: string | null; descriptor: string | null }

/** Above this word count, `cardField` reads as prose (e.g. high-impact rationale) rather than a short tag. */
const MAX_BADGE_WORDS = 3

/**
 * Splits a drill-down entry's free-form `cardField` (`lib/dashboard/drilldown.ts`)
 * into a short classification for a compact `Badge` and, when there's more to
 * say, a one-line descriptor — so a long repeated sentence never has to carry
 * both. `omb-reportable`'s `"<reason> (<Individual|Consolidated>)"` shape yields
 * both a badge and a descriptor; short categorical values (`"Ready"`, `"Decided"`,
 * `"Pending rationalization"`) become badge-only; long rationale text (`high-impact`)
 * stays a bare descriptor. A badge that would just repeat `item.stage` (pipeline's
 * `cardField` is literally its `STATUS_LABEL`, already shown next to it) is dropped
 * as redundant.
 */
export function presentCardField(item: KpiDrilldownEntry): CardFieldPresentation {
  const cardField = item.cardField.trim()
  const trailingParen = cardField.match(/^(.*\S)\s*\(([^()]+)\)$/)
  if (trailingParen) {
    return { badge: trailingParen[2], descriptor: trailingParen[1] }
  }
  if (cardField.length > 0 && cardField.split(/\s+/).length <= MAX_BADGE_WORDS) {
    return cardField.toLowerCase() === item.stage.trim().toLowerCase()
      ? { badge: null, descriptor: null }
      : { badge: cardField, descriptor: null }
  }
  return { badge: null, descriptor: cardField || null }
}

/**
 * Read-only detail route a drill-down entry's "Open" link should point at.
 * A duplicate cluster's `id` is already its lead submission's id (`toItem(lead, ...)`
 * in lib/dashboard/drilldown.ts), and that submission's own detail page renders
 * the cross-bureau rationalization section for the whole cluster — so every
 * entry, cluster or not, resolves to the same `/submissions/{id}` shape.
 */
export function kpiDrilldownEntryHref(item: KpiDrilldownEntry): string {
  return `/submissions/${item.id}`
}
