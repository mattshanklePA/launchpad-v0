// F5-4 (#321): the portfolio report's numbers as one plain CSV, for offices that
// rebuild the view in their own approved dashboard tool. Three sections, one
// file: summary figures, by program office with totals, every idea. Every value
// is read off the report object (lib/portfolioReport.ts); nothing is worked out
// here, so the file and the screen cannot disagree. Numbers are written bare,
// with no units or formatting.

import { csvLine } from "@/lib/csv"
import { DISPLAY_TIME_ZONE, formatKeystoneDate } from "@/lib/dateFormat"
import { tenantCopy } from "@/lib/tenant/copy"
import type { TenantConfig } from "@/lib/tenant"
import type { PortfolioReport } from "@/lib/portfolioReport"

const SECTION_SUMMARY = "Summary figures"
const SECTION_OFFICES = "By program office"
const SECTION_IDEAS = "Every idea"

/** keystone-portfolio-report-<date>.pdf and keystone-portfolio-numbers-<date>.csv, the date in the fixed display zone. */
export function portfolioReportFileName(kind: "pdf" | "csv", now: number): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: DISPLAY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now))
  return kind === "pdf" ? `keystone-portfolio-report-${day}.pdf` : `keystone-portfolio-numbers-${day}.csv`
}

const FORMULA_START = /^[=+\-@\t\r]/

/** Text a spreadsheet would run as a formula is kept as text, also when spaces come first. Numbers never pass through here. */
function safe(text: string): string {
  return FORMULA_START.test(text) || FORMULA_START.test(text.trim()) ? `'${text}` : text
}

const num = (n: number | undefined) => (n === undefined ? "" : String(n))

export function buildPortfolioReportCsv(report: PortfolioReport, options: { now: number; tenant?: TenantConfig }): string {
  const copy = tenantCopy(options.tenant)
  const split = (s: string) => s.split("|")
  const { risk, decisions, overlap, dataCheck } = report.summary

  const values = [
    report.scopeLabel ?? copy.reportScopeWhole,
    report.period.label,
    formatKeystoneDate(new Date(options.now).toISOString()),
    num(risk.total),
    num(risk.high),
    num(risk.medium),
    num(risk.low),
    num(decisions.decided),
    num(decisions.approved),
    num(decisions.notApproved),
    num(decisions.medianDays),
    num(overlap.groups),
    num(overlap.ideas),
    num(overlap.offices),
    num(dataCheck.withOfficeAndRisk),
    num(dataCheck.noMeasure),
    num(dataCheck.officesWithNoIdeas),
    num(dataCheck.noPriority),
  ]
  const figures = split(copy.reportCsvFigures)

  const out: string[] = []
  out.push(csvLine([SECTION_SUMMARY]), csvLine(split(copy.reportCsvColumnsSummary)))
  figures.forEach((f, i) => out.push(csvLine([f, safe(values[i] ?? "")])))

  out.push("", csvLine([SECTION_OFFICES]), csvLine(split(copy.reportCsvColumnsOffices)))
  for (const r of report.offices.rows) {
    out.push(csvLine([safe(r.label), num(r.ideas), num(r.highRisk), num(r.inReview), num(r.decided), num(r.medianDays), num(Math.round(r.share * 100))]))
  }
  const t = report.offices.totals
  out.push(csvLine([copy.reportOfficesTotal, num(t.ideas), num(t.highRisk), num(t.inReview), num(t.decided), num(t.medianDays), num(Math.round(t.share * 100))]))

  out.push("", csvLine([SECTION_IDEAS]), csvLine(split(copy.reportCsvColumnsIdeas)))
  for (const i of report.ideas) {
    out.push(
      csvLine([i.id, i.title, i.office, i.program, i.status, i.risk, i.reason, i.days, num(i.daysValue), i.decidedBy, i.priority.text].map(safe)),
    )
  }
  return out.join("\n") + "\n"
}

/** Browser only: hands the file to the person as a download. */
export function downloadPortfolioReportCsv(report: PortfolioReport, options: { now: number; tenant?: TenantConfig }): void {
  const blob = new Blob(["﻿", buildPortfolioReportCsv(report, options)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = portfolioReportFileName("csv", options.now)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
