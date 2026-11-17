import { describe, it, expect } from "vitest"
import { es2 } from "@/lib/tenant/es2"
import { tenantCopy } from "@/lib/tenant/copy"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { buildPortfolioReport, type PortfolioReport } from "@/lib/portfolioReport"
import { buildPortfolioReportCsv } from "@/lib/portfolioReportCsv"

// F5-4 (#321): the numbers as a spreadsheet. Same figures as the screen.
const NOW = Date.parse("2026-12-10T17:00:00Z")
const copy = tenantCopy(es2)
const report = (office?: string) => buildPortfolioReport(es2SeedSubmissions, es2, NOW, office)

/** Minimal RFC 4180 reader, so the test checks what a spreadsheet would see. */
function parse(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = "", q = false
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]
    if (q) {
      if (c === '"' && csv[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') {
        q = false
      } else {
        cell += c
      }
    } else if (c === '"') {
      q = true
    } else if (c === ",") {
      row.push(cell)
      cell = ""
    } else if (c === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else {
      cell += c
    }
  }
  return rows
}
const section = (rows: string[][], title: string) => {
  const at = rows.findIndex((r) => r.length === 1 && r[0] === title)
  expect(at).toBeGreaterThanOrEqual(0)
  const out: string[][] = []
  for (let i = at + 2; i < rows.length && !(rows[i].length === 1 && rows[i][0] === ""); i++) out.push(rows[i])
  return { header: rows[at + 1], body: out }
}

describe("buildPortfolioReportCsv", () => {
  it("has three sections with plain column names", () => {
    const rows = parse(buildPortfolioReportCsv(report(), { now: NOW }))
    expect(section(rows, "Summary figures").header).toEqual(["Figure", "Value"])
    expect(section(rows, "By program office").header[0]).toBe("Program office")
    expect(section(rows, "Every idea").header.slice(0, 3)).toEqual(["Idea ID", "Title", "Program office"])
  })

  it("totals equal the report's", () => {
    const r = report()
    const rows = parse(buildPortfolioReportCsv(r, { now: NOW }))
    const offices = section(rows, "By program office").body
    const total = offices[offices.length - 1]
    expect(total).toEqual([
      copy.reportOfficesTotal,
      String(r.offices.totals.ideas),
      String(r.offices.totals.highRisk),
      String(r.offices.totals.inReview),
      String(r.offices.totals.decided),
      r.offices.totals.medianDays === undefined ? "" : String(r.offices.totals.medianDays),
      String(Math.round(r.offices.totals.share * 100)),
    ])
    expect(offices).toHaveLength(r.offices.rows.length + 1)
    const sum = (i: number) => offices.slice(0, -1).reduce((n, row) => n + Number(row[i]), 0)
    expect(sum(1)).toBe(r.offices.totals.ideas)
    const figs = Object.fromEntries(section(rows, "Summary figures").body.map((x) => [x[0], x[1]]))
    expect(figs["Ideas"]).toBe(String(r.summary.risk.total))
    expect(figs["High risk ideas"]).toBe(String(r.summary.risk.high))
    expect(figs["Decided"]).toBe(String(r.summary.decisions.decided))
    expect(figs["Scope"]).toBe(copy.reportScopeWhole)
    expect(section(rows, "Every idea").body).toHaveLength(r.ideas.length)
  })

  it("an office-only file names the office", () => {
    const r = report("hrfm")
    const figs = Object.fromEntries(section(parse(buildPortfolioReportCsv(r, { now: NOW })), "Summary figures").body.map((x) => [x[0], x[1]]))
    expect(figs["Scope"]).toBe(r.scopeLabel)
  })

  it("escapes commas, quotes and line breaks", () => {
    const r: PortfolioReport = JSON.parse(JSON.stringify(report()))
    r.ideas[0].title = 'Supply "risk", scoring\nv2'
    const csv = buildPortfolioReportCsv(r, { now: NOW })
    expect(csv).toContain('"Supply ""risk"", scoring\nv2"')
    expect(section(parse(csv), "Every idea").body[0][1]).toBe('Supply "risk", scoring\nv2')
  })

  it("does not let a spreadsheet run a cell as a formula", () => {
    const r: PortfolioReport = JSON.parse(JSON.stringify(report()))
    r.ideas[0].title = "=HYPERLINK(\"x\")"
    expect(section(parse(buildPortfolioReportCsv(r, { now: NOW })), "Every idea").body[0][1]).toBe("'=HYPERLINK(\"x\")")
  })

  it.each(["  =1+1", " +1", "\u00a0-2", "   @SUM(A1)"])("keeps a cell with leading spaces then a formula sign as text: %j", (cell) => {
    const r: PortfolioReport = JSON.parse(JSON.stringify(report()))
    r.ideas[0].title = cell
    const out = section(parse(buildPortfolioReportCsv(r, { now: NOW })), "Every idea").body[0][1]
    expect(out.startsWith("'")).toBe(true)
    expect(out.slice(1)).toBe(cell)
  })

  it("leaves an ordinary cell with leading spaces alone", () => {
    const r: PortfolioReport = JSON.parse(JSON.stringify(report()))
    r.ideas[0].title = "  Plain title"
    expect(section(parse(buildPortfolioReportCsv(r, { now: NOW })), "Every idea").body[0][1]).toBe("  Plain title")
  })

  it("uses no banned word over the ES2 seed set", () => {
    const csv = buildPortfolioReportCsv(report(), { now: NOW })
    for (const re of [/\brequires\b/i, /RMF/, /rationalization/i, /reportability/i, /minimum practices/i, /—/, /claude|anthropic|openai|gpt|gemini/i]) {
      expect(csv).not.toMatch(re)
    }
  })
})
