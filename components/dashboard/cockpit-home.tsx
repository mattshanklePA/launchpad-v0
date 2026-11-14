"use client"

// NL-3 (#284): the ES2 (`features.cockpitLook`) body of "My work". Re-skin
// only: CommandCenter computes every item, number, link and drilldown exactly
// as before and hands them here; this file only lays them out in the cockpit
// kit (lead block, K5 ranked table, K4 measure panels, K3 section titles, K6
// square tags). No new data, metric or link. Other tenants never mount this.

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { TenantConfig } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import type { KpiDrilldown } from "@/lib/dashboard/drilldown"
import { MeasurePanel, MeasureRow, RankedTable, SectionTitle, SquareTag, type SquareTagTone } from "@/components/cockpit"
import { DrilldownDialogContent } from "./kpi-card"
import { countFromTitle, splitLeadingCount } from "./command-center-data"
import { sortActionItemsBySeverity, type ActionItem } from "./action-center-data"
import { kpiDrilldownEntriesFor, kpiDrilldownEntryHref, kpiMeaningLine, kpiStatusKeystone, sortKpiCardsByPriority, type KpiCardData } from "./kpi-card-data"
import { STATUS_DEFAULT_LABEL, type KeystoneStatus } from "@/lib/statusTokens"

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
const LINK = `text-sm font-semibold text-[var(--ks-active-blue-dark)] underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50 ${FOCUS}`

/** Same three shapes as ActionCenter: drilldown dialog, async action, or no control at all. */
function ActionControl({ item, className }: { item: ActionItem; className?: string }) {
  const { toast } = useToast()
  const [pending, setPending] = useState(false)
  const cls = className ?? LINK

  const run = async () => {
    if (!item.onAction) return
    setPending(true)
    try {
      const outcome = await item.onAction()
      toast({ title: outcome.status === "sent" ? "Notification sent" : "Drafted, not sent", description: outcome.description })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error instanceof Error ? error.message : "Something went wrong. Try again.",
      })
    } finally {
      setPending(false)
    }
  }

  if (item.drilldown) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className={cls}>
            {item.actionLabel || "Review"}
          </button>
        </DialogTrigger>
        <DrilldownDialogContent label={item.drilldown.label} items={item.drilldown.items} id={item.id} />
      </Dialog>
    )
  }
  if (item.onAction) {
    return (
      <button type="button" className={cls} disabled={pending} onClick={run}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Working" /> : item.actionLabel || "Review"}
      </button>
    )
  }
  return null
}

const SEVERITY_TONE: Record<NonNullable<ActionItem["severity"]>, KeystoneStatus> = {
  critical: "alert",
  warning: "attention",
  info: "neutral",
}

const STATUS_WORD = STATUS_DEFAULT_LABEL

/** Existing item text only: a description if the item has one, else the label of the list behind it. */
function whyText(item: ActionItem): string {
  return item.description ?? item.drilldown?.label ?? ""
}

export type CockpitScopedRow = {
  id: string
  title: string
  meta: string
  href: string
  statusKeystone: KeystoneStatus
  statusLabel: string
}

export function CockpitHome({
  tenant,
  actionItems,
  kpiCards,
  drilldown,
  enterpriseKpiById,
  banner,
  headerMeta,
  decisionCenter,
  scopedRows,
  scopedRowsTitle,
  railEyebrow,
  rollupLabel,
  plumb,
}: {
  tenant: TenantConfig
  actionItems: ActionItem[]
  kpiCards: KpiCardData[]
  drilldown: KpiDrilldown
  enterpriseKpiById?: Record<string, KpiCardData>
  banner?: ReactNode
  headerMeta: string
  decisionCenter?: { count: number }
  scopedRows?: CockpitScopedRow[]
  scopedRowsTitle?: string
  railEyebrow: string
  rollupLabel: string
  plumb: ReactNode
}) {
  const copy = tenantCopy(tenant)
  const sorted = sortActionItemsBySeverity(actionItems)
  const [lead, ...rest] = sorted
  const cards = sortKpiCardsByPriority(kpiCards)
  const rows = chunk(cards, 3)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
      {banner}

      <section aria-label={copy.homeLeadLabel} className="flex flex-col gap-4">
        <SectionTitle title={copy.homeLeadLabel} context={headerMeta} />
        {lead ? (
          <LeadBlock item={lead} label={copy.homeLeadLabel} />
        ) : (
          <p className="text-sm text-[var(--ks-ink-700)]">Nothing needs attention right now.</p>
        )}
        {rest.length > 0 && (
          <RankedTable
            groups={[{ id: "actions", rows: rest }]}
            columns={[
              {
                key: "why",
                header: copy.homeColWhy,
                render: (item) => (
                  // Clicks on the control must not open the row.
                  <span className="flex flex-wrap items-center justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className="flex items-center gap-2">
                      <SquareTag tone={SEVERITY_TONE[item.severity || "info"]}>{STATUS_WORD[SEVERITY_TONE[item.severity || "info"]]}</SquareTag>
                      {whyText(item)}
                    </span>
                    <ActionControl item={item} />
                  </span>
                ),
              },
            ]}
            getRowId={(item) => item.id}
            getRank={(item) => countFromTitle(item.title)}
            getName={(item) => splitLeadingCount(item.title)[1]}
            // A row opens only when it has more to show: the ideas behind its count.
            getDetails={(item) =>
              item.drilldown && item.drilldown.items.length > 0
                ? [
                    {
                      label: item.drilldown.label,
                      value: (
                        <ul className="m-0 list-none space-y-1 p-0">
                          {item.drilldown.items.map((entry) => (
                            <li key={entry.id}>
                              <Link href={kpiDrilldownEntryHref(entry)} className={LINK}>
                                {entry.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ),
                    },
                  ]
                : []
            }
            rankHeader={copy.homeColCount}
            nameHeader={copy.homeColWhat}
            skipEmptyDetails
            expandAllLabel={copy.homeExpandAll}
            collapseAllLabel={copy.homeCollapseAll}
          />
        )}
      </section>

      {decisionCenter && (
        <div className="flex items-center gap-3.5 border border-[var(--ks-limestone-dark)] bg-white p-4">
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-head)] text-[15px] font-bold text-[var(--ks-ink-900)]">Decision Center</p>
            <p className="mt-0.5 text-[13px] text-[var(--ks-ink-700)]">
              {decisionCenter.count} candidate{decisionCenter.count === 1 ? "" : "s"} ready to compare. Generate an executive briefing.
            </p>
          </div>
          <Link href="/decisions" className={cn(LINK, "shrink-0")}>
            Open
          </Link>
        </div>
      )}

      {scopedRows && scopedRowsTitle && (
        <section className="flex flex-col gap-4">
          <SectionTitle title={scopedRowsTitle} />
          <RankedTable
            groups={[{ id: "scoped", rows: scopedRows }]}
            columns={[
              {
                key: "status",
                header: copy.listColStatus,
                render: (row) => <SquareTag tone={row.statusKeystone as SquareTagTone}>{row.statusLabel}</SquareTag>,
              },
              {
                key: "open",
                header: copy.listColLink,
                render: (row) => (
                  // Clicks on the link must not open the row.
                  <span onClick={(e) => e.stopPropagation()}>
                    <Link href={row.href} className={cn(LINK, "shrink-0")}>
                      Open
                    </Link>
                  </span>
                ),
              },
            ]}
            getRowId={(row) => row.id}
            getRank={(row) => String(scopedRows.indexOf(row) + 1)}
            getName={(row) => row.title}
            getReference={(row) => row.meta}
            // The row already shows the idea, its status and its link; nothing more to open.
            getDetails={() => []}
            rankHeader={copy.listColNo}
            nameHeader={copy.listColIdea}
            skipEmptyDetails
            expandAllLabel={copy.homeExpandAll}
            collapseAllLabel={copy.homeCollapseAll}
          />
        </section>
      )}

      {cards.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle title={railEyebrow} context="Every number opens the list behind it." />
          {rows.map((group, g) => (
            <MeasureRow key={g}>
              {group.map((card, i) => (
                <KpiPanel
                  key={card.id}
                  n={g * 3 + i + 1}
                  card={card}
                  drilldown={drilldown}
                  enterprise={enterpriseKpiById?.[card.id]?.value}
                />
              ))}
            </MeasureRow>
          ))}
          <Link href="/rollup" className={cn(LINK, "w-fit")}>
            {rollupLabel} →
          </Link>
        </section>
      )}

      <p className="border-t border-[var(--ks-limestone-dark)] pt-4 text-[13px] leading-relaxed text-[var(--ks-ink-900)]">
        <span className="mr-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em]">Plumb</span>
        {plumb}
      </p>
    </div>
  )
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function LeadBlock({ item, label }: { item: ActionItem; label: string }) {
  const [count, rest] = splitLeadingCount(item.title)
  const why = whyText(item)
  return (
    <div
      data-cockpit="lead-block"
      className="flex flex-col gap-4 border border-[var(--ks-limestone-dark)] border-l-[6px] border-l-[var(--ks-amber)] bg-white p-6 md:flex-row md:items-center"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ks-amber-dark)]">{label}</p>
        <h2 className="font-[family-name:var(--font-head)] text-2xl font-black leading-tight text-[var(--ks-ink-900)]">
          {count && <span>{count} </span>}
          {rest}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <SquareTag tone={SEVERITY_TONE[item.severity || "info"]}>{STATUS_WORD[SEVERITY_TONE[item.severity || "info"]]}</SquareTag>
          {why && <span className="text-sm text-[var(--ks-ink-700)]">{why}</span>}
        </div>
      </div>
      <div className="shrink-0">
        <ActionControl
          item={item}
          className={`inline-flex border border-[var(--ks-basalt)] bg-[var(--ks-basalt)] px-4 py-2 text-sm font-semibold text-[var(--ks-chalk)] hover:bg-[var(--ks-basalt-800)] disabled:opacity-50 ${FOCUS}`}
        />
      </div>
    </div>
  )
}

function KpiPanel({
  n,
  card,
  drilldown,
  enterprise,
}: {
  n: number
  card: KpiCardData
  drilldown: KpiDrilldown
  enterprise?: string | number
}) {
  const items = drilldown ? kpiDrilldownEntriesFor(card.id, drilldown) : undefined
  const tone = kpiStatusKeystone(card.status)
  const number = items ? (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${card.label} — view details`}
          className={`underline-offset-4 hover:underline ${FOCUS}`}
        >
          {card.value}
        </button>
      </DialogTrigger>
      <DrilldownDialogContent label={card.label} items={items} id={card.id} />
    </Dialog>
  ) : (
    card.value
  )
  const meaning = kpiMeaningLine(card, enterprise)
  return (
    <MeasurePanel
      number={n}
      title={card.label}
      tag={<SquareTag tone={tone}>{STATUS_WORD[tone]}</SquareTag>}
      question={card.subtitle ?? ""}
      bigNumber={number}
      meaning={meaning}
    />
  )
}
