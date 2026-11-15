"use client"

// F5-2 (#319): the executive AI portfolio report, below the band. Presentation
// only. Every number comes in on `data.report` (lib/portfolioReport.ts); this file
// formats, sorts and filters what it is given and never works a figure out
// itself. Ordering follows docs/design/cockpit/Portfolio-Report.dc.html.

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { SectionTitle } from "@/components/cockpit/section-title"
import { MeasurePanel, MeasureRow } from "@/components/cockpit/measure-panel"
import { SquareTag, Track, type SquareTagTone } from "@/components/cockpit/square-tag"
import { tenantCopy } from "@/lib/tenant/copy"
import type { TenantConfig } from "@/lib/tenant"
import type { ReportResponse } from "@/lib/portfolioReportApi"
import type { PortfolioIdea, OfficeRow } from "@/lib/portfolioReport"
import { formatKeystoneDate } from "@/lib/dateFormat"
import { formatDays } from "@/lib/timeToDecision"

type Copy = ReturnType<typeof tenantCopy>

export const FIRST_ROWS = 10

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
const LINK = `font-semibold text-[var(--ks-active-blue-dark)] underline-offset-2 hover:underline ${FOCUS}`
const TH =
  "border-b border-[var(--ks-limestone-dark)] bg-white px-3 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]"
const TD = "border-b border-[var(--ks-limestone)] p-3 align-middle text-sm text-[var(--ks-ink-900)]"
const BOX = "overflow-x-auto rounded-lg border border-[var(--ks-limestone-dark)] bg-white"
const FIELD = `border border-[var(--ks-limestone-dark)] bg-white px-2.5 py-1.5 text-[13px] text-[var(--ks-ink-900)] ${FOCUS}`

export const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

type RiskFilter = "" | "high" | "medium" | "low" | "unknown"
type Filters = { risk: RiskFilter; office: string; noPriority: boolean; decided: boolean; overlap: boolean }
const NO_FILTERS: Filters = { risk: "", office: "", noPriority: false, decided: false, overlap: false }

type SortKey = "idea" | "status" | "risk" | "days" | "decidedBy"
type Sort = { key: SortKey; dir: "ascending" | "descending" }
const RANK = { high: 0, medium: 1, low: 2, unknown: 3 } as const

function compare(key: SortKey, a: PortfolioIdea, b: PortfolioIdea): number {
  switch (key) {
    case "idea":
      return a.title.localeCompare(b.title)
    case "status":
      return a.status.localeCompare(b.status)
    case "decidedBy":
      return a.decidedBy.localeCompare(b.decidedBy)
    case "days":
      return (a.daysValue ?? -1) - (b.daysValue ?? -1)
    default:
      return RANK[a.riskLevel] - RANK[b.riskLevel] || (b.daysValue ?? -1) - (a.daysValue ?? -1)
  }
}

function riskTone(level: PortfolioIdea["riskLevel"]): SquareTagTone {
  return level === "high" ? "alert" : level === "medium" ? "attention" : "neutral"
}

export function sortIdeas(ideas: PortfolioIdea[], sort: Sort): PortfolioIdea[] {
  const sign = sort.dir === "ascending" ? 1 : -1
  return [...ideas].sort((a, b) => sign * compare(sort.key, a, b) || a.id.localeCompare(b.id))
}

function Bar({ percent }: { percent: number }) {
  return (
    <span className="block h-2 w-full bg-[var(--ks-limestone)]" aria-hidden="true">
      <span className="block h-2 bg-[var(--ks-basalt)]" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </span>
  )
}

function Table({ min, children, label }: { min: number; children: ReactNode; label: string }) {
  return (
    <div className={BOX} tabIndex={0} role="region" aria-label={label}>
      <table className="w-full border-collapse" style={{ minWidth: min }}>
        {children}
      </table>
    </div>
  )
}

export function ReportView({
  data,
  tenant,
  note,
  briefing,
}: {
  data: ReportResponse
  tenant: TenantConfig
  /** Plumb's note section (F5-5). Without one, only the section title is drawn. */
  note?: ReactNode
  /** The kept Decision Center briefing section, under the note (F5-5). */
  briefing?: ReactNode
}) {
  const copy = tenantCopy(tenant)
  const { report } = data
  const { risk, decisions, overlap, dataCheck } = report.summary
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [sort, setSort] = useState<Sort>({ key: "risk", dir: "ascending" })
  const [showAll, setShowAll] = useState(false)

  const realRows = report.offices.rows.filter((r) => r.id !== "")
  const withIdeas = realRows.filter((r) => r.ideas > 0).length
  const total = report.ideas.length
  const ideasWord = count(total, "idea", "ideas")

  const jump = (next: Partial<Filters>) => () => {
    setFilters({ ...NO_FILTERS, ...next })
    setShowAll(false)
  }

  const filtered = useMemo(
    () =>
      report.ideas.filter(
        (i) =>
          (!filters.risk || i.riskLevel === filters.risk) &&
          (!filters.office || i.office === filters.office) &&
          (!filters.noPriority || i.priority.labels.length === 0) &&
          (!filters.decided || i.decided) &&
          (!filters.overlap || i.inOverlap),
      ),
    [report.ideas, filters],
  )

  const groups = useMemo(() => {
    const order = report.offices.rows.map((r) => r.label)
    const sorted = sortIdeas(filtered, sort)
    const byOffice = new Map<string, PortfolioIdea[]>()
    for (const i of sorted) byOffice.set(i.office, [...(byOffice.get(i.office) ?? []), i])
    const names = [...order.filter((n) => byOffice.has(n)), ...[...byOffice.keys()].filter((n) => !order.includes(n))]
    let left = showAll ? Infinity : FIRST_ROWS
    return names
      .map((name) => {
        const all = byOffice.get(name)!
        const rows = all.slice(0, Math.max(0, left))
        left -= rows.length
        return { name, all, rows }
      })
      .filter((g) => g.rows.length > 0)
  }, [filtered, sort, showAll, report.offices.rows])

  const sortLabel: Record<SortKey, string> = {
    idea: copy.reportColIdea.toLowerCase(),
    status: copy.reportIdeasColStatus.toLowerCase(),
    risk: copy.reportFilterRisk.toLowerCase() + ", " + (sort.dir === "ascending" ? "highest first" : "lowest first"),
    days: copy.reportIdeasColDays.toLowerCase(),
    decidedBy: copy.reportIdeasColDecidedBy.toLowerCase(),
  }

  const heading = (key: SortKey, label: string) => (
    <th
      key={key}
      scope="col"
      aria-sort={sort.key === key ? sort.dir : "none"}
      className={TH}
    >
      <button
        type="button"
        onClick={() =>
          setSort((s) => (s.key === key ? { key, dir: s.dir === "ascending" ? "descending" : "ascending" } : { key, dir: "ascending" }))
        }
        className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${FOCUS}`}
      >
        {label}
        <span aria-hidden="true">{sort.key === key ? (sort.dir === "ascending" ? " ↑" : " ↓") : ""}</span>
      </button>
    </th>
  )

  const medianText =
    decisions.medianDays === undefined ? copy.timeToDecisionEmpty : fill(copy.reportDecisionsMedian, { days: formatDays(decisions.medianDays) })
  const officeNames = (names: string[]) => names.join(", ")
  const preparedOn = formatKeystoneDate(new Date(data.now).toISOString())
  const holderKind = (k: "reviewer" | "office") => (k === "reviewer" ? copy.reportHolderReviewer : copy.reportHolderOffice)
  const anyFilter = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)

  return (
    <div className="flex flex-col gap-7">
      <SectionTitle
        title={report.scopeLabel ?? copy.reportScopeWhole}
        context={fill(copy.reportContext, {
          ideas: ideasWord,
          offices: withIdeas,
          total: realRows.length,
          period: report.period.label,
        })}
      />

      <MeasureRow>
        <MeasurePanel
          number={1}
          title={copy.reportRiskTitle}
          accent="amber"
          tag={risk.high > 0 ? <SquareTag tone="attention">{copy.reportRiskTag.toUpperCase()}</SquareTag> : undefined}
          question={copy.reportRiskQuestion}
          bigNumber={risk.high}
          meaning={
            <>
              {fill(copy.reportRiskMeaning, { total: risk.total })}
              {risk.topReason ? (
                <>
                  {" "}
                  {fill(copy.reportRiskTopReason, { reason: risk.topReason.text, count: risk.topReason.count, high: risk.high })}
                </>
              ) : null}
            </>
          }
          track={
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label={`${copy.portfolioRiskHigh} ${risk.high}, ${copy.portfolioRiskMedium} ${risk.medium}, ${copy.portfolioRiskLow} ${risk.low}`}>
              {(
                [
                  [copy.portfolioRiskHigh, risk.high, "var(--ks-alert)"],
                  [copy.portfolioRiskMedium, risk.medium, "var(--ks-ink-700)"],
                  [copy.portfolioRiskLow, risk.low, "var(--ks-limestone-dark)"],
                ] as const
              ).map(([word, n, color]) => (
                <li key={word} className="flex items-center gap-2.5 text-xs">
                  <span className="w-[70px]">{word}</span>
                  <span className="h-2" style={{ width: `${risk.total ? Math.round((n / risk.total) * 50) : 0}%`, minWidth: n ? 4 : 0, background: color }} aria-hidden="true" />
                  <span className="font-mono">{n}</span>
                </li>
              ))}
            </ul>
          }
          action={
            <a href="#report-ideas" onClick={jump({ risk: "high" })} className={`w-fit text-sm ${LINK}`}>
              {copy.reportRiskLink}
            </a>
          }
        />
        <MeasurePanel
          number={2}
          title={copy.reportDecisionsTitle}
          question={copy.reportDecisionsQuestion}
          bigNumber={decisions.decided}
          meaning={fill(copy.reportDecisionsMeaning, {
            total: total,
            approved: decisions.approved,
            notApproved: decisions.notApproved,
          })}
          track={<Track label={medianText} actualPercent={total ? (decisions.decided / total) * 100 : 0} />}
          action={
            <a href="#report-ideas" onClick={jump({ decided: true })} className={`w-fit text-sm ${LINK}`}>
              {copy.reportDecisionsLink}
            </a>
          }
        />
        <MeasurePanel
          number={3}
          title={copy.reportOverlapTitle}
          accent="blue"
          question={copy.reportOverlapQuestion}
          bigNumber={overlap.groups}
          meaning={
            overlap.groups === 0
              ? copy.reportOverlapNone
              : fill(copy.reportOverlapMeaning, {
                  groups: count(overlap.groups, "group", "groups"),
                  ideas: count(overlap.ideas, "idea", "ideas"),
                  offices: count(overlap.offices, "office", "offices"),
                })
          }
          track={
            overlap.largest ? (
              <p className="m-0 text-[13px] text-[var(--ks-ink-700)]">
                {fill(copy.reportOverlapLargest, { title: overlap.largest.title, offices: officeNames(overlap.largest.offices) })}
              </p>
            ) : undefined
          }
          action={
            overlap.groups > 0 ? (
              <a href="#report-ideas" onClick={jump({ overlap: true })} className={`w-fit text-sm ${LINK}`}>
                {copy.reportOverlapLink}
              </a>
            ) : undefined
          }
        />
      </MeasureRow>

      <p data-report="data-check" className="m-0 rounded-lg border border-[var(--ks-limestone-dark)] bg-white px-4 py-3 text-[13px] text-[var(--ks-ink-900)]">
        <strong>{copy.reportDataCheckLabel}</strong>{" "}
        {fill(copy.reportDataCheckComplete, { count: dataCheck.withOfficeAndRisk, total })}
        {" · "}
        {dataCheck.noMeasure === 1
          ? copy.reportDataCheckNoMeasureOne
          : fill(copy.reportDataCheckNoMeasure, { count: dataCheck.noMeasure })}
        {dataCheck.officesWithNoIdeas > 0 ? (
          <>
            {" · "}
            {fill(dataCheck.officesWithNoIdeas === 1 ? copy.reportDataCheckEmptyOfficesOne : copy.reportDataCheckEmptyOffices, {
              count: dataCheck.officesWithNoIdeas,
              names: officeNames(dataCheck.officesWithNoIdeasLabels),
            })}
          </>
        ) : null}
        {dataCheck.noPriority > 0 ? (
          <>
            {" · "}
            <a href="#report-ideas" onClick={jump({ noPriority: true })} className={LINK}>
              {dataCheck.noPriority === 1
                ? copy.reportDataCheckNoPriorityOne
                : fill(copy.reportDataCheckNoPriority, { count: dataCheck.noPriority })}
            </a>
          </>
        ) : null}
      </p>

      <section aria-label={copy.reportLeaderTitle} className="flex flex-col gap-3.5">
        <SectionTitle
          title={copy.reportLeaderTitle}
          context={fill(copy.reportLeaderContext, { count: report.needsLeader.items.length, open: report.needsLeader.openCount })}
        />
        {report.needsLeader.items.length === 0 ? (
          <p className="m-0 rounded-lg border border-[var(--ks-limestone-dark)] bg-white px-4 py-3.5 text-sm">{copy.reportLeaderEmpty}</p>
        ) : (
          <Table min={820} label={copy.reportLeaderTitle}>
            <thead>
              <tr>
                <th scope="col" className={TH}>{copy.reportColIdea}</th>
                <th scope="col" className={TH}>{copy.reportColWhy}</th>
                <th scope="col" className={TH}>{copy.reportColHolder}</th>
                <th scope="col" className={TH}>{copy.reportColDays}</th>
                <th scope="col" className={TH}>{copy.reportColOpen}</th>
              </tr>
            </thead>
            <tbody>
              {report.needsLeader.items.map((it) => (
                <tr key={`${it.kind}-${it.id}`}>
                  <th scope="row" className={`${TD} text-left font-semibold`}>{it.title}</th>
                  <td className={TD}>{it.why}</td>
                  <td className={TD}>
                    <div className="font-semibold">{it.heldBy}</div>
                    <div className="text-xs text-[var(--ks-ink-700)]">{holderKind(it.heldByKind)}</div>
                  </td>
                  <td className={`${TD} font-mono text-[13px]`}>{formatDays(it.daysWaiting)}</td>
                  <td className={TD}>
                    <Link href={it.href} className={LINK} aria-label={`${copy.reportOpenLink}: ${it.title}`}>
                      {copy.reportOpenLink}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section aria-label={copy.reportOfficesTitle} className="flex flex-col gap-3.5">
        <SectionTitle title={copy.reportOfficesTitle} context={copy.reportOfficesContext} />
        <Table min={820} label={copy.reportOfficesTitle}>
          <thead>
            <tr>
              <th scope="col" className={TH}>{copy.reportOfficesColOffice}</th>
              <th scope="col" className={TH}>{copy.reportOfficesColIdeas}</th>
              <th scope="col" className={TH}>{copy.reportOfficesColHigh}</th>
              <th scope="col" className={TH}>{copy.reportOfficesColReview}</th>
              <th scope="col" className={TH}>{copy.reportOfficesColDecided}</th>
              <th scope="col" className={TH}>{copy.reportOfficesColMedian}</th>
              <th scope="col" className={TH} style={{ width: 240 }}>{copy.reportOfficesColShare}</th>
            </tr>
          </thead>
          <tbody>
            {report.offices.rows.map((r) => (
              <OfficeLine key={r.id || "none"} row={r} copy={copy} />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className={`${TD} text-left font-bold`}>{copy.reportOfficesTotal}</th>
              <td className={`${TD} font-mono`}>{report.offices.totals.ideas}</td>
              <td className={`${TD} font-mono`}>{report.offices.totals.highRisk}</td>
              <td className={`${TD} font-mono`}>{report.offices.totals.inReview}</td>
              <td className={`${TD} font-mono`}>{report.offices.totals.decided}</td>
              <td className={`${TD} font-mono`}>{report.offices.totals.medianDays ?? "–"}</td>
              <td className={TD} />
            </tr>
          </tfoot>
        </Table>
      </section>

      <section id="report-ideas" aria-label={copy.reportIdeasTitle} className="flex scroll-mt-24 flex-col gap-3.5">
        <SectionTitle
          title={copy.reportIdeasTitle}
          context={fill(copy.reportIdeasContext, { ideas: count(filtered.length, "idea", "ideas"), sort: sortLabel[sort.key] })}
        />
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <label className="flex items-center gap-2">
            {copy.reportFilterRisk}
            <select
              className={FIELD}
              value={filters.risk}
              onChange={(e) => setFilters((f) => ({ ...f, risk: e.target.value as RiskFilter }))}
            >
              <option value="">{copy.reportFilterAll}</option>
              <option value="high">{copy.portfolioRiskHigh}</option>
              <option value="medium">{copy.portfolioRiskMedium}</option>
              <option value="low">{copy.portfolioRiskLow}</option>
              <option value="unknown">{copy.portfolioRiskUnassessed}</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            {copy.reportFilterOffice}
            <select className={FIELD} value={filters.office} onChange={(e) => setFilters((f) => ({ ...f, office: e.target.value }))}>
              <option value="">{copy.reportFilterAll}</option>
              {report.offices.rows.map((r) => (
                <option key={r.id || "none"} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.noPriority} onChange={(e) => setFilters((f) => ({ ...f, noPriority: e.target.checked }))} />
            {copy.reportFilterNoPriority}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.decided} onChange={(e) => setFilters((f) => ({ ...f, decided: e.target.checked }))} />
            {copy.reportFilterDecided}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.overlap} onChange={(e) => setFilters((f) => ({ ...f, overlap: e.target.checked }))} />
            {copy.reportFilterOverlap}
          </label>
          {anyFilter ? (
            <button type="button" onClick={jump({})} className={`text-sm ${LINK}`}>
              {copy.reportFilterClear}
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <p role="status" className="m-0 rounded-lg border border-[var(--ks-limestone-dark)] bg-white px-4 py-3.5 text-sm">
            {copy.reportIdeasNone}
          </p>
        ) : (
          <Table min={980} label={copy.reportIdeasTitle}>
            <thead>
              <tr>
                {heading("idea", copy.reportColIdea)}
                {heading("status", copy.reportIdeasColStatus)}
                {heading("risk", copy.reportIdeasColRisk)}
                {heading("days", copy.reportIdeasColDays)}
                {heading("decidedBy", copy.reportIdeasColDecidedBy)}
                <th scope="col" className={TH}>{copy.reportIdeasColPriority}</th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.name} data-report-group={g.name}>
                <tr>
                  <th scope="rowgroup" colSpan={6} className="border-b border-[var(--ks-limestone-dark)] bg-[var(--ks-limestone)] px-4 py-3 text-left">
                    <span className="block font-[family-name:var(--font-head)] text-base font-bold text-[var(--ks-ink-900)]">{g.name}</span>
                    <span className="block text-xs font-normal text-[var(--ks-ink-700)]">
                      {fill(copy.reportGroupSummary, {
                        ideas: count(g.all.length, "idea", "ideas"),
                        high: g.all.filter((i) => i.riskLevel === "high").length,
                        decided: g.all.filter((i) => i.decided).length,
                      })}
                    </span>
                  </th>
                </tr>
                {g.rows.map((i) => (
                  <tr key={i.id} data-report-idea={i.id}>
                    <th scope="row" className={`${TD} text-left font-normal`}>
                      <Link href={i.href} className={`font-semibold ${LINK}`}>
                        {i.title}
                      </Link>
                      <div className="mt-[3px] text-xs text-[var(--ks-ink-700)]">{[i.id, i.program].filter(Boolean).join(" · ")}</div>
                    </th>
                    <td className={TD}>{i.status}</td>
                    <td className={TD}>
                      <SquareTag tone={riskTone(i.riskLevel)}>{i.risk}</SquareTag> <span className="text-[13px]">{i.reason}</span>
                    </td>
                    <td className={`${TD} font-mono text-[13px]`}>{i.days}</td>
                    <td className={`${TD} text-[13px]`}>{i.decidedBy}</td>
                    <td className={`${TD} text-[13px]`}>{i.priority.text}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </Table>
        )}
        {filtered.length > FIRST_ROWS ? (
          <button type="button" onClick={() => setShowAll((v) => !v)} className={`w-fit text-sm ${LINK}`}>
            {showAll ? fill(copy.reportShowFewer, { count: FIRST_ROWS }) : fill(copy.reportShowAll, { count: filtered.length })}
          </button>
        ) : null}
      </section>

      {note ?? (
        <section aria-label={copy.reportNoteTitle} className="flex flex-col gap-3.5">
          <SectionTitle title={copy.reportNoteTitle} context={copy.reportNoteContext} />
        </section>
      )}
      {briefing}

      <footer className="border-t border-[var(--ks-limestone-dark)] pt-4 text-xs text-[var(--ks-ink-700)]">
        {fill(copy.reportFooter, { date: preparedOn })}
        {data.demo ? ` ${copy.reportFooterDemo}` : ""}
      </footer>
    </div>
  )
}

function OfficeLine({ row, copy }: { row: OfficeRow; copy: Copy }) {
  if (row.ideas === 0) {
    return (
      <tr>
        <th scope="row" className={`${TD} text-left font-bold`}>{row.label}</th>
        <td className={`${TD} text-[var(--ks-ink-700)]`} colSpan={6}>
          {copy.reportOfficesNone}
        </td>
      </tr>
    )
  }
  return (
    <tr>
      <th scope="row" className={`${TD} text-left font-bold`}>{row.label}</th>
      <td className={`${TD} font-mono`}>{row.ideas}</td>
      <td className={`${TD} font-mono`}>{row.highRisk}</td>
      <td className={`${TD} font-mono`}>{row.inReview}</td>
      <td className={`${TD} font-mono`}>{row.decided}</td>
      <td className={`${TD} font-mono`}>{row.medianDays ?? "–"}</td>
      <td className={TD}>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Bar percent={row.share * 100} />
          </div>
          <span className="font-mono text-xs">{Math.round(row.share * 100)}%</span>
        </div>
      </td>
    </tr>
  )
}
