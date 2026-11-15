import { describe, it, expect, beforeEach, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// F5-4 (#321). The PDF is drawn from the report object with the library's own
// text and line calls. Nothing here asserts pixels, only the text asked for,
// on which page, and the page plan.
type TextCall = { text: string | string[]; x: number; y: number; page: number }
const { recorded, saved } = vi.hoisted(() => ({ recorded: [] as { text: string | string[]; x: number; y: number; page: number }[], saved: [] as string[] }))

vi.mock("jspdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jspdf")>()
  function RecordingPdf(...args: unknown[]) {
    const doc = new (actual.jsPDF as any)(...args)
    const realText = doc.text.bind(doc)
    doc.text = (...call: any[]) => {
      recorded.push({ text: call[0], x: call[1], y: call[2], page: doc.internal.getCurrentPageInfo().pageNumber })
      return realText(...call)
    }
    doc.save = (name: string) => {
      saved.push(name)
      return doc
    }
    return doc
  }
  return { ...actual, jsPDF: RecordingPdf }
})

import { es2 } from "@/lib/tenant/es2"
import { tenantCopy } from "@/lib/tenant/copy"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { buildPortfolioReport, type PortfolioReport, type PortfolioIdea } from "@/lib/portfolioReport"
import { buildPortfolioReportPDF, generatePortfolioReportPDF, layoutIdeaPages, portfolioReportFileName } from "@/lib/portfolioReportPdf"

const NOW = Date.parse("2026-12-10T17:00:00Z")
const copy = tenantCopy(es2)
const report = (office?: string) => buildPortfolioReport(es2SeedSubmissions, es2, NOW, office)
const lines = (calls: TextCall[]) => calls.flatMap((c) => (Array.isArray(c.text) ? c.text : [c.text]))
const pageText = (n: number) => lines(recorded.filter((c) => c.page === n)).join("\n")
const flat = (n: number) => pageText(n).replace(/\s+/g, " ")
const withIdeas = (r: PortfolioReport, n: number): PortfolioReport => ({
  ...r,
  ideas: Array.from({ length: n }, (_, i): PortfolioIdea => ({
    ...(r.ideas[i % Math.max(1, r.ideas.length)] ?? ({} as PortfolioIdea)),
    id: `x${i}`,
    title: `Idea ${i} ` + "with a very long title that has to wrap onto more than one line ".repeat(i % 3),
    reason: "A long plain reason that also has to wrap so that nothing runs off the page. ".repeat(1 + (i % 4)),
  })),
})

beforeEach(() => {
  recorded.length = 0
  saved.length = 0
})

describe("layoutIdeaPages (pure)", () => {
  const plan = (n: number, h = 40) => layoutIdeaPages(Array.from({ length: n }, () => h), 600)
  it("0 ideas: one page, no idea pages", () => {
    expect(plan(0)).toEqual({ pages: [], pageCount: 1 })
  })
  it("10 ideas fit on one idea page: two pages", () => {
    const p = plan(10)
    expect(p.pages).toHaveLength(1)
    expect(p.pages[0]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(p.pageCount).toBe(2)
  })
  it("42 ideas: 15 a page, so three idea pages, four in all; every row once, in order", () => {
    const p = plan(42)
    expect(p.pages.map((x) => x.length)).toEqual([15, 15, 12])
    expect(p.pageCount).toBe(4)
    expect(p.pages.flat()).toEqual(Array.from({ length: 42 }, (_, i) => i))
  })
  it("60 ideas: four idea pages, five in all", () => {
    const p = plan(60)
    expect(p.pages.map((x) => x.length)).toEqual([15, 15, 15, 15])
    expect(p.pageCount).toBe(5)
  })
  it("never splits a row: a row that does not fit moves whole to the next page", () => {
    const p = layoutIdeaPages([300, 250, 100, 100], 600)
    expect(p.pages).toEqual([[0, 1], [2, 3]])
  })
  it("a row taller than a page still gets a page of its own", () => {
    expect(layoutIdeaPages([900, 10], 600).pages).toEqual([[0], [1]])
  })
})

describe("generatePortfolioReportPDF", () => {
  it("page 1 text matches the report object", () => {
    const r = report()
    buildPortfolioReportPDF(r, { now: NOW, demo: true, tenant: es2 })
    const p1 = pageText(1)
    expect(flat(1)).toContain("AI portfolio, Enterprise Software and Services")
    expect(p1).toContain(r.period.label)
    expect(p1).toContain("Internal")
    expect(p1).toContain("Prepared 10 Dec 2026")
    expect(p1).toContain(`${r.summary.risk.high} of ${r.summary.risk.total} ideas are high risk.`)
    expect(p1).toContain(`${r.summary.decisions.decided} of ${r.ideas.length} decided.`)
    expect(p1).toContain(copy.reportLeaderTitle)
    for (const it of r.needsLeader.items) {
      expect(p1).toContain(it.title)
      expect(p1).toContain(it.heldBy)
    }
    expect(p1).toContain(copy.reportOfficesTitle)
    for (const row of r.offices.rows) expect(p1).toContain(row.label)
    expect(p1).toContain(copy.reportOfficesTotal)
    expect(p1).toContain(`${r.summary.dataCheck.withOfficeAndRisk} of ${r.ideas.length} ideas have an office and a risk level`)
  })

  it("every idea follows on the later pages with its risk as a printed word", () => {
    const r = report()
    const doc = buildPortfolioReportPDF(r, { now: NOW, demo: false, tenant: es2 })
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2)
    const later = [2, 3, 4, 5, 6].map(pageText).join("\n")
    for (const i of r.ideas) {
      expect(later).toContain(i.risk)
      expect(later).toContain(i.status)
    }
    expect(pageText(1)).not.toContain(r.ideas[r.ideas.length - 1].id)
  })

  it("an office-only report names the office", () => {
    const r = report("hrfm")
    buildPortfolioReportPDF(r, { now: NOW, demo: false, tenant: es2 })
    const label = es2.unit.options.find((o) => o.value === "hrfm")!.label
    expect(pageText(1)).toContain(`This report covers ${label} only.`)
    expect(flat(1)).toContain(`AI portfolio, ${label}`)
  })

  it("the whole portfolio does not say it covers one office", () => {
    buildPortfolioReportPDF(report(), { now: NOW, demo: false, tenant: es2 })
    expect(pageText(1)).not.toContain("This report covers")
  })

  it("no Plumb block without a note; with one, the block and its words appear", () => {
    buildPortfolioReportPDF(report(), { now: NOW, demo: false, tenant: es2 })
    expect(pageText(1)).not.toContain("advice, not a decision")
    recorded.length = 0
    buildPortfolioReportPDF(report(), { now: NOW, demo: false, tenant: es2, plumbNote: "Half of the high-risk ideas sit in one office." })
    expect(pageText(1)).toContain("Plumb's read · advice, not a decision · 10 Dec 2026")
    expect(pageText(1)).toContain("Half of the high-risk ideas sit in one office.")
  })

  it("footer on every page: prepared line, Demo data only in demo mode, Page N of M", () => {
    const r = withIdeas(report(), 42)
    const doc = buildPortfolioReportPDF(r, { now: NOW, demo: true, tenant: es2 })
    const m = doc.getNumberOfPages()
    expect(m).toBeGreaterThan(2)
    for (let n = 1; n <= m; n++) {
      expect(pageText(n)).toContain("Prepared from Keystone on 10 Dec 2026. Internal. Not an official Army record. Demo data.")
      expect(pageText(n)).toContain(`Page ${n} of ${m}`)
    }
    recorded.length = 0
    buildPortfolioReportPDF(r, { now: NOW, demo: false, tenant: es2 })
    expect(pageText(1)).not.toContain("Demo data.")
  })

  it("42 ideas: nothing is drawn below the footer line or off the right edge, and the header row repeats", () => {
    const r = withIdeas(report(), 42)
    const doc = buildPortfolioReportPDF(r, { now: NOW, demo: false, tenant: es2 })
    const w = doc.internal.pageSize.getWidth()
    const h = doc.internal.pageSize.getHeight()
    for (const c of recorded) {
      expect(c.y).toBeLessThanOrEqual(h - 20)
      expect(c.x).toBeLessThan(w - 20)
    }
    const pages = doc.getNumberOfPages()
    for (let n = 2; n <= pages; n++) expect(pageText(n)).toContain(copy.reportIdeasColStatus.toUpperCase())
    expect(new Set(recorded.map((c) => c.page)).size).toBe(pages)
  })

  it("saves under the dated file name", () => {
    generatePortfolioReportPDF(report(), { now: NOW, demo: false, tenant: es2 })
    expect(saved).toEqual(["keystone-portfolio-report-2026-12-10.pdf"])
    expect(portfolioReportFileName("pdf", NOW)).toBe("keystone-portfolio-report-2026-12-10.pdf")
  })

  it("uses no banned word over the ES2 seed set", () => {
    buildPortfolioReportPDF(report(), { now: NOW, demo: true, tenant: es2 })
    const all = lines(recorded).join("\n")
    for (const re of [/\brequires\b/i, /RMF/, /rationalization/i, /reportability/i, /minimum practices/i, /—/, /claude|anthropic|openai|gpt|gemini/i]) {
      expect(all).not.toMatch(re)
    }
  })
})

describe("the PDF library's HTML path stays out", () => {
  const src = readFileSync(join(__dirname, "portfolioReportPdf.ts"), "utf8")
  it("never calls .html(, never imports the sanitizer or the canvas renderer or the table plug-in's HTML reader", () => {
    expect(src).not.toMatch(/\.html\s*\(/)
    expect(src).not.toMatch(/dompurify|html2canvas|autotable|innerHTML|outerHTML/i)
    expect(src).not.toMatch(/\bhtml\s*:/)
  })
})
