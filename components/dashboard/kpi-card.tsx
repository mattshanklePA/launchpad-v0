"use client"

// KPI card grid — the Command Center's top row of at-a-glance metrics.
// Each card is interactive: hovering/focusing it previews up to
// `KPI_HOVER_PREVIEW_LIMIT` compact "baseball cards" of the submissions
// behind its count (a HoverCard — a pointer/focus enhancement only; Radix
// never fires it on touch, so it's never the sole way to reach anything),
// and clicking it opens a Dialog listing every underlying item, each linking
// to its read-only `/submissions/{id}` detail view. The Dialog is the
// accessible primary path: the card's value area renders as a real
// `<button>`, so Enter/Space and touch both reach the full list without ever
// hovering. `duplicates` is cluster-shaped (lib/dashboard/drilldown.ts) — its
// rows link to the cluster's lead submission, whose detail page already
// renders the cross-bureau rationalization section for the whole cluster.
//
// Presentation only: `items` (a card's `getKpiDrilldown` list) is an
// optional prop so existing callers/tests that only pass label/value/delta/
// status keep rendering the plain, non-interactive card exactly as before.
//
// UX #4: a jargon label can carry a `glossary` key (lib/glossary.ts), which
// wraps just the label text in the shared `GlossaryTerm` "?" tooltip, plus a
// short always-visible `subtitle` under the value for anyone who won't
// hover/tap the tooltip. The label row sits above, and outside, the card's
// click-through button — `GlossaryTerm` renders its own `<button>`, and HTML
// doesn't allow nesting one interactive control inside another, so the label
// can never move inside the value button without breaking that rule (and
// silently making the whole card's click target ambiguous between "show
// definition" and "open drill-down").

import Link from "next/link"
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowRight, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card"
import { GlossaryTerm } from "@/components/launchpad/glossary-term"
import { StatusPill } from "@/components/ui/status-pill"
import { cn } from "@/lib/utils"
import {
  kpiStatusAccentClass,
  kpiStatusKeystone,
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

/**
 * The click-through drill-down list — the dialog body a KPI card opens, and
 * (ES2-12 B) the one an Action Center row opens too. Extracted so the Action
 * Center's buttons navigate to the same list the matching KPI card already
 * shows rather than growing a second, divergent one. Caller supplies the
 * surrounding `<Dialog>`; this is only its `DialogContent`.
 */
export function DrilldownDialogContent({ label, items }: { label: string; items: KpiDrilldownEntry[] }) {
  return (
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
  )
}

/**
 * The label row, deliberately kept outside the card's clickable button below —
 * its glossary "?" (`GlossaryTerm`) renders its own `<button>`, and a `<button>`
 * can't validly nest another interactive control, so it can't live inside the
 * drill-down button an interactive card wraps everything else in.
 */
function KpiCardLabel({ label, status, glossary }: Pick<KpiCardData, "label" | "status" | "glossary">) {
  const actionable = kpiIsActionable(status)
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 px-3 pt-3">
      <p
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em]",
          actionable ? "text-foreground/70" : "text-muted-foreground",
        )}
      >
        {status === "critical" && <AlertTriangle className="h-3 w-3 shrink-0 text-alert" aria-hidden="true" />}
        {glossary ? (
          <GlossaryTerm term={glossary} className="normal-case tracking-normal">
            {label}
          </GlossaryTerm>
        ) : (
          label
        )}
      </p>
      <StatusPill status={kpiStatusKeystone(status)} />
    </div>
  )
}

function KpiCardBody({ value, delta, status, subtitle }: Pick<KpiCardData, "value" | "delta" | "status" | "subtitle">) {
  const TrendIcon = delta ? TREND_ICON[delta.direction] : null
  const actionable = kpiIsActionable(status)
  return (
    <CardContent className="space-y-0.5 px-3 pb-3 pt-0.5">
      <p
        className={cn(
          "leading-tight",
          actionable ? "text-2xl font-bold text-foreground" : "text-xl font-semibold text-foreground/90",
        )}
      >
        {value}
      </p>
      {subtitle && <p className="text-[10px] leading-snug text-muted-foreground">{subtitle}</p>}
      {delta && TrendIcon && (
        <p className={cn("flex items-center gap-1 text-[11px] font-medium", kpiTrendTextClass(delta.direction))}>
          <TrendIcon className="h-3 w-3" />
          {delta.value}
        </p>
      )}
    </CardContent>
  )
}

export function KpiCard({
  label,
  value,
  delta,
  status = "neutral",
  glossary,
  subtitle,
  items,
}: KpiCardData & { items?: KpiDrilldownEntry[] }) {
  const cardClassName = cn(
    "shadow-none",
    kpiIsActionable(status) ? "border-l-4" : "border-l-[3px]",
    kpiStatusAccentClass(status),
    items && "transition-colors hover:border-primary/50",
  )

  if (!items) {
    return (
      <Card className={cardClassName}>
        <KpiCardLabel label={label} status={status} glossary={glossary} />
        <KpiCardBody value={value} delta={delta} status={status} subtitle={subtitle} />
      </Card>
    )
  }

  const preview = previewKpiDrilldownEntries(items)
  const overflow = kpiDrilldownOverflowCount(items)

  return (
    <Card className={cardClassName}>
      <KpiCardLabel label={label} status={status} glossary={glossary} />
      <Dialog>
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`${label} — view details`}
                className="w-full rounded-b-lg text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <KpiCardBody value={value} delta={delta} status={status} subtitle={subtitle} />
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

        <DrilldownDialogContent label={label} items={items} />
      </Dialog>
    </Card>
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
