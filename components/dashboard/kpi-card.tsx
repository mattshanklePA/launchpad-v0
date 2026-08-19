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
  drilldownFooterHint,
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
        <Badge variant="outline" className="rounded px-1.5 py-0 font-mono text-[10px] uppercase tracking-[0.06em] font-normal">
          {item.bureauLabel}
        </Badge>
        <Badge variant="outline" className="rounded px-1.5 py-0 font-mono text-[10px] uppercase tracking-[0.06em] font-normal">
          {item.stage}
        </Badge>
        {memberCount && (
          <Badge variant="outline" className="rounded px-1.5 py-0 font-mono text-[10px] uppercase tracking-[0.06em] font-normal">
            {memberCount}
          </Badge>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{item.cardField}</p>
    </div>
  )
}

/** One full row in the click-through drill-down dialog. */
function DrilldownRow({ item }: { item: KpiDrilldownEntry }) {
  const cluster = isDuplicateClusterEntry(item)
  const memberCount = memberCountLabel(item)
  const { badge, descriptor } = presentCardField(item)
  return (
    <li className="min-w-0 px-6 py-3.5 hover:bg-muted/30">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
        <div className="min-w-0 flex-1 basis-64">
          <p className="truncate text-[14.5px] font-semibold text-foreground" title={item.title}>
            {item.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
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
              <Badge variant="outline" className="rounded px-1.5 py-0 font-mono text-[10px] uppercase tracking-[0.06em] font-normal">
                {badge}
              </Badge>
            )}
          </div>
          {descriptor && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{descriptor}</p>}
        </div>
        <Link
          href={kpiDrilldownEntryHref(item)}
          className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
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
 *
 * `id` keys the footer hint (`drilldownFooterHint`, kpi-card-data.ts) — a
 * KPI card's own id, or the matching Action Center item's id for the two
 * rows with no KPI card of their own (unassigned, needs-info); either falls
 * back to the same default hint when it names nothing more specific.
 */
export function DrilldownDialogContent({ label, items, id = "" }: { label: string; items: KpiDrilldownEntry[]; id?: string }) {
  const empty = items.length === 0
  return (
    <DialogContent
      overlayClassName="bg-[rgba(42,51,60,0.55)]"
      className="max-h-[80vh] gap-0 overflow-x-hidden overflow-y-auto rounded-xl p-0 shadow-lg sm:max-w-[640px]"
    >
      <DialogHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b px-6 py-5">
        <div>
          <p className="ks-microlabel mb-1">{label}</p>
          <DialogTitle className="font-heading text-2xl font-black leading-none tracking-[-0.02em] text-foreground">
            {items.length} use case{items.length === 1 ? "" : "s"}
          </DialogTitle>
        </div>
        <DialogDescription className="sr-only">
          {empty ? "Nothing here right now." : `${items.length} record${items.length === 1 ? "" : "s"} behind ${label}.`}
        </DialogDescription>
      </DialogHeader>
      {empty ? (
        <div className="flex flex-col items-center gap-2 px-6 py-11 text-center">
          <p className="font-heading text-base font-bold text-foreground">Nothing off-plumb</p>
          <p className="max-w-[40ch] text-[13.5px] text-muted-foreground">
            Every use case behind this number is inside its gates. Check back after the next intake.
          </p>
        </div>
      ) : (
        <ul className="min-w-0 divide-y divide-border-subtle">
          {items.map((item) => (
            <DrilldownRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      <p className="border-t px-6 py-3 text-[12.5px] text-foreground-faint">{drilldownFooterHint(id)}</p>
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
      {subtitle && <p className="text-[13px] leading-snug text-muted-foreground">{subtitle}</p>}
      {delta && TrendIcon && (
        <p className={cn("flex items-center gap-1 text-[13px] font-medium", kpiTrendTextClass(delta.direction))}>
          <TrendIcon className="h-3 w-3" />
          {delta.value}
        </p>
      )}
    </CardContent>
  )
}

export function KpiCard({
  id,
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

        <DrilldownDialogContent label={label} items={items} id={id} />
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

/**
 * Compact rail variant (RD-1, mocks 01/02's "Where the portfolio stands" /
 * "{code} at a glance" rail) — label eyebrow + subtitle on the left, the
 * Chivo 900 number on the right, a 3px status-accent stripe instead of the
 * grid card's 3-4px border. The whole card opens the same drill-down dialog
 * as the grid card (`DrilldownDialogContent`); no hover-card preview at this
 * size. `enterpriseValue` (RD-1 item 7) adds a second "of N enterprise-wide"
 * line under the subtitle for a scoped view's rail — the matching
 * department-scope card's own value, computed by the caller.
 */
export function KpiRailCard({
  id,
  label,
  value,
  status = "neutral",
  subtitle,
  items,
  enterpriseValue,
}: KpiCardData & { items?: KpiDrilldownEntry[]; enterpriseValue?: string | number }) {
  const body = (
    <div className="flex min-w-0 items-center justify-between gap-3 px-[15px] py-[13px]">
      <div className="min-w-0">
        <p className="ks-microlabel truncate">{label}</p>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{subtitle}</p>}
        {enterpriseValue !== undefined && (
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">of {enterpriseValue} enterprise-wide</p>
        )}
      </div>
      <div className="shrink-0 font-heading text-[26px] font-black leading-none tracking-[-0.02em] text-foreground">{value}</div>
    </div>
  )

  const cardClassName = cn("shadow-none border-l-[3px] hover:border-strong", kpiStatusAccentClass(status))

  if (!items) return <Card className={cardClassName}>{body}</Card>

  return (
    <Dialog>
      <Card className={cardClassName}>
        <DialogTrigger asChild>
          <button type="button" aria-haspopup="dialog" aria-label={`${label} — view details`} className="w-full text-left">
            {body}
          </button>
        </DialogTrigger>
      </Card>
      <DrilldownDialogContent label={label} items={items} id={id} />
    </Dialog>
  )
}

export function KpiRailList({
  cards,
  drilldown,
  enterpriseCardsById,
}: {
  cards: KpiCardData[]
  drilldown?: KpiDrilldown
  enterpriseCardsById?: Record<string, KpiCardData>
}) {
  if (cards.length === 0) return null
  return (
    <div className="flex flex-col gap-2.5">
      {sortKpiCardsByPriority(cards).map((card) => (
        <KpiRailCard
          key={card.id}
          {...card}
          items={drilldown && kpiDrilldownEntriesFor(card.id, drilldown)}
          enterpriseValue={enterpriseCardsById?.[card.id]?.value}
        />
      ))}
    </div>
  )
}

export type { KpiCardData, KpiDelta, KpiTrendDirection, KpiStatus } from "./kpi-card-data"
