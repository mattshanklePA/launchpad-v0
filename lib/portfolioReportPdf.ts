// F5-4 (#321): the executive portfolio report as a PDF. Input is the object
// from buildPortfolioReport (F5-1); this file never works out a number, it
// lays out what it is given. Follows the patterns in lib/pdfGenerator.ts and
// docs/design/11b Portfolio Report PDF.dc.html.
//
// Drawn from data with the PDF library's own text and line calls. Never
// render HTML into the PDF and never use the library's HTML path (a test
// reads this file and fails if it does).
//
// Page 1: title block, the three measure sentences and the data check, what
// needs a leader, by program office, and Plumb's note only when one is given.
// Later pages: every idea, header row repeated, no row split across a page.
// Every page: the footer and "Page N of M". Only black, grays and white, so it
// reads well printed in black and white; risk is always the printed word.

import { jsPDF } from "jspdf"
import { formatKeystoneDate } from "@/lib/dateFormat"
import { formatDays } from "@/lib/timeToDecision"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import type { PortfolioReport } from "@/lib/portfolioReport"
import { portfolioReportFileName } from "@/lib/portfolioReportCsv"

export { portfolioReportFileName }

export type PortfolioPdfOptions = {
  /** Epoch ms the report was prepared; the date printed is this one. */
  now: number
  /** Sample data is on: the footer says so. */
  demo: boolean
  /** Plumb's note for this session (F5-5). No note, no block. */
  plumbNote?: string
  tenant?: TenantConfig
}

// ── Page plan (pure) ──

export type PagePlan = {
  /** For each page after page 1, the indexes of the ideas on it, in order. */
  pages: number[][]
  /** Page 1 plus the idea pages. */
  pageCount: number
}

/**
 * Which ideas sit on which page. `rowHeights` is the drawn height of each idea
 * row; `bodyHeight` is the room a page leaves for rows under the repeated
 * header. A row that does not fit moves whole to the next page; a row taller
 * than a page gets a page of its own.
 */
export function layoutIdeaPages(rowHeights: number[], bodyHeight: number): PagePlan {
  const pages: number[][] = []
  let current: number[] = []
  let used = 0
  rowHeights.forEach((h, i) => {
    if (current.length > 0 && used + h > bodyHeight) {
      pages.push(current)
      current = []
      used = 0
    }
    current.push(i)
    used += h
  })
  if (current.length > 0) pages.push(current)
  return { pages, pageCount: 1 + pages.length }
}

// ── Drawing ──

const INK: [number, number, number] = [30, 37, 44]
const GRAY: [number, number, number] = [95, 102, 110]
const RULE: [number, number, number] = [190, 190, 190]

const MARGIN = 48
const PAGE_W = 612
const PAGE_H = 792
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_Y = PAGE_H - 36
const BOTTOM = PAGE_H - 56
const CELL_PAD = 4

const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function buildPortfolioReportPDF(report: PortfolioReport, options: PortfolioPdfOptions): jsPDF {
  const tenant = options.tenant ?? getTenant()
  const copy = tenantCopy(tenant)
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const preparedOn = formatKeystoneDate(new Date(options.now).toISOString())
  const { risk, decisions, overlap, dataCheck } = report.summary
  const total = report.ideas.length

  const font = (style: "normal" | "bold", size: number, color: [number, number, number] = INK) => {
    doc.setFont("helvetica", style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }
  const wrap = (text: string, width: number) => doc.splitTextToSize(text, width) as string[]
  const rule = (y: number, weight = 0.5, color = RULE) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(weight)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  }
  /** Draws wrapped text, returns the y below it. */
  const paragraph = (text: string, x: number, y: number, width: number, size: number, style: "normal" | "bold" = "normal") => {
    font(style, size)
    const lh = size * 1.35
    const rows = wrap(text, width)
    rows.forEach((row, i) => doc.text(row, x, y + size + i * lh))
    return y + rows.length * lh + 2
  }
  const heading = (text: string, y: number, context?: string) => {
    font("bold", 13)
    doc.text(text, MARGIN, y + 13)
    if (context) {
      font("normal", 9, GRAY)
      doc.text(context, MARGIN + doc.getTextWidth(text) + 8 + 0, y + 13)
    }
    return y + 22
  }

  // ── Page 1: title block ──
  const scope = report.scopeLabel ?? tenant.orgName
  font("normal", 8, GRAY)
  doc.text(fill(copy.reportPdfKicker, { period: report.period.label }), MARGIN, MARGIN + 8)
  font("bold", 20)
  const titleRows = wrap(fill(copy.reportPdfTitle, { title: copy.reportTitle, scope }), CONTENT_W - 110)
  titleRows.forEach((row, i) => doc.text(row, MARGIN, MARGIN + 34 + i * 24))
  font("normal", 9)
  doc.text(copy.reportPdfInternal, PAGE_W - MARGIN, MARGIN + 8, { align: "right" })
  doc.text(fill(copy.reportPdfPrepared, { date: preparedOn }), PAGE_W - MARGIN, MARGIN + 21, { align: "right" })
  let y = MARGIN + 34 + (titleRows.length - 1) * 24 + 12
  rule(y, 1.5, INK)
  y += 12

  if (report.scopeLabel) {
    y = paragraph(fill(copy.reportPdfOfficeOnly, { office: report.scopeLabel }), MARGIN, y, CONTENT_W, 10.5, "bold") + 4
  }

  // The three measure sentences, then the data check.
  const sentences = [
    `${risk.high} ${fill(copy.reportRiskMeaning, { total: risk.total })}${
      risk.topReason ? ` ${fill(copy.reportRiskTopReason, { reason: risk.topReason.text, count: risk.topReason.count, high: risk.high })}` : ""
    }`,
    `${decisions.decided} ${fill(copy.reportDecisionsMeaning, { total, approved: decisions.approved, notApproved: decisions.notApproved })}${
      decisions.medianDays === undefined ? "" : ` ${fill(copy.reportDecisionsMedian, { days: formatDays(decisions.medianDays) })}.`
    }`,
    overlap.groups === 0
      ? copy.reportOverlapNone
      : `${fill(copy.reportOverlapMeaning, {
          groups: count(overlap.groups, "group", "groups"),
          ideas: count(overlap.ideas, "idea", "ideas"),
          offices: count(overlap.offices, "office", "offices"),
        })}${
          overlap.largest ? ` ${fill(copy.reportOverlapLargest, { title: overlap.largest.title, offices: overlap.largest.offices.join(", ") })}` : ""
        }`,
  ]
  for (const s of sentences) y = paragraph(s, MARGIN, y, CONTENT_W, 10.5)

  const checks = [
    fill(copy.reportDataCheckComplete, { count: dataCheck.withOfficeAndRisk, total }),
    dataCheck.noMeasure === 1 ? copy.reportDataCheckNoMeasureOne : fill(copy.reportDataCheckNoMeasure, { count: dataCheck.noMeasure }),
  ]
  if (dataCheck.officesWithNoIdeas > 0) {
    checks.push(
      fill(dataCheck.officesWithNoIdeas === 1 ? copy.reportDataCheckEmptyOfficesOne : copy.reportDataCheckEmptyOffices, {
        count: dataCheck.officesWithNoIdeas,
        names: dataCheck.officesWithNoIdeasLabels.join(", "),
      }),
    )
  }
  if (dataCheck.noPriority > 0) {
    checks.push(dataCheck.noPriority === 1 ? copy.reportDataCheckNoPriorityOne : fill(copy.reportDataCheckNoPriority, { count: dataCheck.noPriority }))
  }
  y = paragraph(`${copy.reportDataCheckLabel} ${checks.join(" · ")}`, MARGIN, y + 2, CONTENT_W, 9) + 10

  // ── Needs a leader's decision ──
  y = heading(copy.reportLeaderTitle, y, fill(copy.reportLeaderContext, { count: report.needsLeader.items.length, open: report.needsLeader.openCount }))
  if (report.needsLeader.items.length === 0) {
    y = paragraph(copy.reportLeaderEmpty, MARGIN, y, CONTENT_W, 10) + 4
  }
  report.needsLeader.items.forEach((it, n) => {
    const line = fill(copy.reportPdfLeaderLine, {
      title: it.title,
      why: it.why,
      holder: it.heldBy,
      kind: it.heldByKind === "reviewer" ? copy.reportHolderReviewer : copy.reportHolderOffice,
      days: formatDays(it.daysWaiting),
    })
    font("normal", 10)
    doc.text(`${n + 1}.`, MARGIN, y + 10)
    y = paragraph(line, MARGIN + 18, y, CONTENT_W - 18, 10) + 3
  })
  y += 8

  // ── By program office ──
  y = heading(copy.reportOfficesTitle, y)
  const oc = [CONTENT_W - 5 * 64, 64, 64, 64, 64, 64]
  const ox = oc.reduce<number[]>((acc, w, i) => [...acc, i === 0 ? MARGIN : acc[i - 1] + oc[i - 1]], [])
  const oHead = [copy.reportOfficesColOffice, copy.reportOfficesColIdeas, copy.reportOfficesColHigh, copy.reportOfficesColReview, copy.reportOfficesColDecided, copy.reportOfficesColMedian]
  font("bold", 7.5, GRAY)
  oHead.forEach((h, i) => {
    const rows = wrap(h.toUpperCase(), oc[i] - CELL_PAD * 2)
    rows.forEach((r, k) => (i === 0 ? doc.text(r, ox[i], y + 8 + k * 9) : doc.text(r, ox[i] + oc[i] - CELL_PAD, y + 8 + k * 9, { align: "right" })))
  })
  y += 26
  rule(y - 4, 1, INK)
  const t = report.offices.totals
  const officeRows: { label: string; cells: (number | undefined)[]; bold: boolean }[] = [
    ...report.offices.rows.map((r) => ({ label: r.label, cells: [r.ideas, r.highRisk, r.inReview, r.decided, r.medianDays], bold: false })),
    { label: copy.reportOfficesTotal, cells: [t.ideas, t.highRisk, t.inReview, t.decided, t.medianDays], bold: true },
  ]
  officeRows.forEach((r, n) => {
    if (r.bold) rule(y - 3, 1, INK)
    const labelRows = wrap(r.label, oc[0] - CELL_PAD)
    font(r.bold ? "bold" : "normal", 9.5)
    labelRows.forEach((l, k) => doc.text(l, ox[0], y + 9 + k * 11))
    r.cells.forEach((v, i) => doc.text(v === undefined ? "–" : String(v), ox[i + 1] + oc[i + 1] - CELL_PAD, y + 9, { align: "right" }))
    y += labelRows.length * 11 + 5
    if (!r.bold && n < officeRows.length - 2) rule(y - 3)
  })
  y += 8

  // ── Plumb's note: only when one exists for this session ──
  if (options.plumbNote && options.plumbNote.trim()) {
    const noteRows = wrap(options.plumbNote.trim(), CONTENT_W)
    const need = 24 + noteRows.length * 14
    if (y + need > BOTTOM) {
      doc.addPage()
      y = MARGIN
    }
    rule(y)
    y += 8
    font("bold", 8, GRAY)
    doc.text(fill(copy.reportPdfPlumbNote, { assistant: tenant.assistantName, date: preparedOn }), MARGIN, y + 8)
    y += 16
    y = paragraph(options.plumbNote.trim(), MARGIN, y, CONTENT_W, 10.5)
  }

  // ── Every idea ──
  const ic = [150, 56, 128, 54, 62, CONTENT_W - 150 - 56 - 128 - 54 - 62]
  const ix = ic.reduce<number[]>((acc, w, i) => [...acc, i === 0 ? MARGIN : acc[i - 1] + ic[i - 1]], [])
  const iHead = [copy.reportColIdea, copy.reportIdeasColStatus, copy.reportIdeasColRisk, copy.reportIdeasColDays, copy.reportIdeasColDecidedBy, copy.reportIdeasColPriority]
  const LH = 10
  const cellWidth = (i: number) => ic[i] - CELL_PAD * 2

  type Row = { idea: string[]; sub: string[]; status: string[]; riskWord: string; reason: string[]; days: string[]; by: string[]; priority: string[]; height: number }
  font("normal", 8)
  const rows: Row[] = report.ideas.map((i) => {
    font("bold", 8.5)
    const idea = wrap(i.title, cellWidth(0))
    font("normal", 7.5)
    const sub = wrap([i.office, i.program].filter(Boolean).join(", "), cellWidth(0))
    font("normal", 8)
    const status = wrap(i.status, cellWidth(1))
    const reason = wrap(i.reason, cellWidth(2))
    const days = wrap(i.days, cellWidth(3))
    const by = wrap(i.decidedBy, cellWidth(4))
    const priority = wrap(i.priority.text, cellWidth(5))
    const lines = Math.max(idea.length + sub.length, status.length, 1 + reason.length, days.length, by.length, priority.length)
    return { idea, sub, status, riskWord: i.risk, reason, days, by, priority, height: lines * LH + CELL_PAD * 2 + 1 }
  })

  const TABLE_TOP = MARGIN + 44
  const HEADER_H = 22
  const plan = layoutIdeaPages(rows.map((r) => r.height), BOTTOM - TABLE_TOP - HEADER_H)
  plan.pages.forEach((indexes) => {
    doc.addPage()
    font("bold", 13)
    doc.text(copy.reportIdeasTitle, MARGIN, MARGIN + 13)
    font("normal", 9, GRAY)
    doc.text(report.scopeLabel ?? tenant.orgName, PAGE_W - MARGIN, MARGIN + 13, { align: "right" })
    let ry = TABLE_TOP
    font("bold", 7.5, GRAY)
    iHead.forEach((h, i) => wrap(h.toUpperCase(), cellWidth(i)).slice(0, 2).forEach((r, k) => doc.text(r, ix[i] + CELL_PAD, ry + 8 + k * 9)))
    rule(ry + HEADER_H - 3, 1, INK)
    ry += HEADER_H
    for (const n of indexes) {
      const r = rows[n]
      font("bold", 8.5)
      r.idea.forEach((l, k) => doc.text(l, ix[0] + CELL_PAD, ry + CELL_PAD + 8 + k * LH))
      font("normal", 7.5, GRAY)
      r.sub.forEach((l, k) => doc.text(l, ix[0] + CELL_PAD, ry + CELL_PAD + 8 + (r.idea.length + k) * LH))
      font("normal", 8)
      r.status.forEach((l, k) => doc.text(l, ix[1] + CELL_PAD, ry + CELL_PAD + 8 + k * LH))
      font("bold", 8)
      doc.text(r.riskWord, ix[2] + CELL_PAD, ry + CELL_PAD + 8)
      font("normal", 8)
      r.reason.forEach((l, k) => doc.text(l, ix[2] + CELL_PAD, ry + CELL_PAD + 8 + (k + 1) * LH))
      r.days.forEach((l, k) => doc.text(l, ix[3] + CELL_PAD, ry + CELL_PAD + 8 + k * LH))
      r.by.forEach((l, k) => doc.text(l, ix[4] + CELL_PAD, ry + CELL_PAD + 8 + k * LH))
      r.priority.forEach((l, k) => doc.text(l, ix[5] + CELL_PAD, ry + CELL_PAD + 8 + k * LH))
      ry += r.height
      rule(ry - 1)
    }
  })

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages()
  const footer = `${fill(copy.reportFooter, { date: preparedOn })}${options.demo ? ` ${copy.reportFooterDemo}` : ""}`
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n)
    rule(FOOTER_Y - 12, 1, INK)
    font("normal", 8)
    doc.text(footer, MARGIN, FOOTER_Y)
    doc.text(fill(copy.reportPdfPage, { page: n, pages }), PAGE_W - MARGIN, FOOTER_Y, { align: "right" })
  }
  return doc
}

/** Builds the report PDF and hands it to the browser as a download. */
export function generatePortfolioReportPDF(report: PortfolioReport, options: PortfolioPdfOptions): void {
  buildPortfolioReportPDF(report, options).save(portfolioReportFileName("pdf", options.now))
}
