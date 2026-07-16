"use client"

// KPI card grid — the Command Center's top row of at-a-glance metrics.
// Each card is interactive: hovering/focusing it previews up to
// `KPI_HOVER_PREVIEW_LIMIT` compact "baseball cards" of the submissions
// behind its count (a HoverCard — a pointer/focus enhancement only; Radix
// never fires it on touch, so it's never the sole way to reach anything),
// and clicking it opens a Dialog listing every underlying item, each linking
// to its read-only `/submissions/{id}` detail view. The Dialog is the
// accessible primary path: the whole card renders as a real `<button>`, so
// Enter/Space and touch both reach the full list without ever hovering.
// `duplicates` is cluster-shaped (lib/dashboard/drilldown.ts) — its rows
// link to the cluster's lead submission, whose detail page already renders
// the cross-bureau rationalization section for the whole cluster.
//
// Presentation only: `items` (a card's `getKpiDrilldown` list) is an
// optional prop so existing callers/tests that only pass label/value/delta/
// status keep rendering the plain, non-interactive card exactly as before.

import Link from "next/link"
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import {
  kpiStatusAccentClass,
  kpiStatusSurfaceClass,
  kpiIsActionable,
  kpiTrendTextClass,
  sortKpiCardsByPriority,
  isDuplicateClusterEntry,
  previewKpiDrilldownEntries,
  kpiDrilldownOverflowCount,
  kpiDrilldownEntryHref,
  kpiDrilldownEntriesFor,
  presentCardField,
  type KpiCardData,
  type KpiTrendDirection,
  type KpiDrilldownEntry,
} from "./kpi-card-data"
import type { KpiDrilldown } from "@/lib/dashboard/drilldown"

const TREND_ICON: Record<KpiTrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

function memberCountLabel(item: KpiDrilldownEntry): string | null {
  if (!isDuplicateClusterEntry(item)) return null
  return `${item.memberIds.length} submission${item.memberIds.length === 1 ? "" : "s"}`
}

/** One compact "baseball card" in the hover preview. */
function BaseballCard({ item }: { item: KpiDrilldownEntry }) {
  const memberCount = memberCountLabel(item)
  return (
    <div className="min-w-0 rounded-md border bg-card p-2 text-card-foreground">
      <p className="line-clamp-1 text-xs font-medium" title={item.title}>
        {item.title}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <Badge variant="outline" className="rounded px-1.5 py-0 text-[10px] font-normal">
          {item.bureauLabel}
        </Badge>
        <Badge variant="outline" className="rounded px-1.5 py-0 text-[10px] font-normal">
          {item.stage}
        </Badge>
        {memberCount && (
          <Badge variant="outline" className="rounded px-1.5 py-0 text-[10px] font-normal">
            {memberCount}
          </Badge>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{item.cardField}</p>
    </div>
  )
}

/** One full row in the click-through drill-down dialog. */
function DrilldownRow({ item }: { item: KpiDrilldownEntry }) {
  const cluster = isDuplicateClusterEntry(item)
  const memberCount = memberCountLabel(item)
  const { badge, descriptor } = presentCardField(item)
  return (
    <li className="min-w-0 rounded-md border p-2.5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1 basis-64">
          <p className="truncate text-sm font-medium" title={item.title}>
            {item.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{item.bureauLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{item.stage}</span>
            {memberCount && (
              <>
                <span aria-hidden="true">·</span>
                <span>{memberCount}</span>
              </>
            )}
            {badge && (
              <Badge variant="outline" className="rounded px-1.5 py-0 text-[10px] font-normal">
                {badge}
              </Badge>
            )}
          </div>
          {descriptor && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{descriptor}</p>}
        </div>
        <Link
          href={kpiDrilldownEntryHref(item)}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-uspto-blue-primary hover:underline"
        >
          {cluster ? "Open cluster" : "Open submission"}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </li>
  )
}

function KpiCardBody({ label, value, delta, status }: Omit<KpiCardData, "id">) {
  const TrendIcon = delta ? TREND_ICON[delta.direction] : null
  const actionable = kpiIsActionable(status)
  return (
    <CardContent className="space-y-0.5 p-3">
      <p
        className={cn(
          "flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide",
          actionable ? "text-foreground/70" : "text-muted-foreground",
        )}
      >
        {status === "critical" && <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />}
        {label}
      </p>
      <p
        className={cn(
          "leading-tight",
          actionable ? "text-2xl font-bold text-foreground" : "text-xl font-semibold text-foreground/90",
        )}
      >
        {value}
      </p>
      {delta && TrendIcon && (
        <p className={cn("flex items-center gap-1 text-[11px] font-medium", kpiTrendTextClass(delta.direction))}>
          <TrendIcon className="h-3 w-3" />
          {delta.value}
        </p>
      )}
    </CardContent>
  )
}

export function KpiCard({ label, value, delta, status = "neutral", items }: KpiCardData & { items?: KpiDrilldownEntry[] }) {
  const cardClassName = cn(
    "shadow-none",
    kpiIsActionable(status) ? "border-l-4" : "border-l-[3px]",
    kpiStatusAccentClass(status),
    kpiStatusSurfaceClass(status),
  )

  if (!items) {
    return (
      <Card className={cardClassName}>
        <KpiCardBody label={label} value={value} delta={delta} status={status} />
      </Card>
    )
  }

  const preview = previewKpiDrilldownEntries(items)
  const overflow = kpiDrilldownOverflowCount(items)

  return (
    <Dialog>
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-haspopup="dialog"
              className={cn(
                "w-full rounded-lg border bg-card text-left text-card-foreground transition-colors hover:border-primary/50",
                cardClassName,
              )}
            >
              <KpiCardBody label={label} value={value} delta={delta} status={status} />
            </button>
          </DialogTrigger>
        </HoverCardTrigger>
        {preview.length > 0 && (
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              {preview.map((item) => (
                <BaseballCard key={item.id} item={item} />
              ))}
              {overflow > 0 && <p className="text-xs text-muted-foreground">+{overflow} more — click to see all</p>}
            </div>
          </HoverCardContent>
        )}
      </HoverCard>

      <DialogContent className="max-h-[80vh] overflow-x-hidden overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            {items.length} item{items.length === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing here right now.</p>
        ) : (
          <ul className="min-w-0 space-y-2">
            {items.map((item) => (
              <DrilldownRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function KpiCardGrid({ cards, drilldown }: { cards: KpiCardData[]; drilldown?: KpiDrilldown }) {
  if (cards.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {sortKpiCardsByPriority(cards).map((card) => (
        <KpiCard key={card.id} {...card} items={drilldown && kpiDrilldownEntriesFor(card.id, drilldown)} />
      ))}
    </div>
  )
}

export type { KpiCardData, KpiDelta, KpiTrendDirection, KpiStatus } from "./kpi-card-data"
