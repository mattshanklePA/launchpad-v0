import { describe, it, expect, vi } from "vitest"
import { act } from "react"
import { render } from "@/components/cockpit/test-utils"
import { ReportView } from "./report-view"
import { buildReportResponse, type ReportResponse } from "@/lib/portfolioReportApi"
import { es2 } from "@/lib/tenant/es2"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { getBusinessUnit } from "@/lib/reviewWorkflow"
import type { SessionClaims } from "@/lib/session/token"

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

// F5-2 (#319): the report screen body, from one fixed report object.
const NOW = Date.parse("2026-12-10T17:00:00Z")
const admin = { userId: "u", email: "a@es2.demo", name: "A", role: "admin", businessUnit: null, office: null, iat: 0, exp: 0 } as SessionClaims
function data(office: string | null = null): ReportResponse {
  const r = buildReportResponse(es2SeedSubmissions, admin, es2, office, NOW)
  if (r.status !== 200) throw new Error("no report")
  return r.body
}

const text = (el: Element) => el.textContent ?? ""
const click = (el: Element) => act(() => void (el as HTMLElement).click())
const rows = (c: HTMLElement) => [...c.querySelectorAll("[data-report-idea]")]
const heading = (c: HTMLElement, name: string) =>
  [...c.querySelectorAll("th[aria-sort]")].find((h) => text(h).toLowerCase().includes(name))!

describe("ReportView (ES2)", () => {
  it("renders the three measure panels with their questions and plain sentences from the report", () => {
    const d = data()
    const { risk, decisions, overlap } = d.report.summary
    const c = render(<ReportView data={d} tenant={es2} />)
    const panels = [...c.querySelectorAll('[data-cockpit="measure-panel"]')]
    expect(panels).toHaveLength(3)
    expect(text(panels[0])).toContain("Which ideas carry high risk, and why?")
    expect(text(panels[0])).toContain(`of ${risk.total} ideas are high risk.`)
    expect(text(panels[0]).startsWith("1Risk")).toBe(true)
    expect(text(panels[1])).toContain("Are leaders deciding, and how fast?")
    expect(text(panels[1])).toContain(`of ${d.report.ideas.length} decided. ${decisions.approved} approved, ${decisions.notApproved} not approved.`)
    expect(text(panels[2])).toContain("Are offices building the same thing twice?")
    expect(text(panels[2])).toContain(`covering ${overlap.ideas} ideas`)
    expect(text(panels[2])).toContain("Largest:")
    // Risk is printed as words, never colour alone.
    for (const w of ["High", "Medium", "Low"]) expect(text(panels[0])).toContain(w)
  })

  it("prints the context line, the data check and the footer with the demo note", () => {
    const d = data()
    const c = render(<ReportView data={d} tenant={es2} />)
    const offices = d.report.offices.rows.filter((r) => r.id)
    expect(text(c)).toContain(
      `${d.report.ideas.length} ideas from ${offices.filter((r) => r.ideas > 0).length} of ${offices.length} program offices · ${d.report.period.label}`,
    )
    expect(text(c)).toContain("Data check:")
    expect(text(c)).toContain("Prepared from Keystone on 10 Dec 2026. Internal. Not an official Army record. Demo data.")
    expect(text(c)).not.toContain("Since 1 Sep")
  })

  it("leaves out the demo note when the data is not demo data", () => {
    const c = render(<ReportView data={{ ...data(), demo: false }} tenant={es2} />)
    expect(text(c.querySelector("footer")!)).not.toContain("Demo data.")
  })

  it("the office table lists every office, including one with no ideas, and a totals row", () => {
    // The seed has no empty office, so take one office's ideas out.
    const gone = getBusinessUnit(es2SeedSubmissions[0])
    const left = es2SeedSubmissions.filter((s) => getBusinessUnit(s) !== gone)
    const r = buildReportResponse(left, admin, es2, null, NOW)
    if (r.status !== 200) throw new Error("no report")
    const d = r.body
    const c = render(<ReportView data={d} tenant={es2} />)
    expect(text(c.querySelector('[data-report="data-check"]')!)).toMatch(/has no ideas yet|have no ideas yet/)
    const table = c.querySelector('[aria-label="By program office"] table')!
    const body = [...table.querySelectorAll("tbody tr")]
    expect(body.map((r) => text(r.querySelector("th")!))).toEqual(d.report.offices.rows.map((r) => r.label))
    const empty = d.report.offices.rows.find((r) => r.ideas === 0)
    expect(empty).toBeTruthy()
    expect(text(body.find((r) => text(r).startsWith(empty!.label))!)).toContain("No ideas yet")
    expect(text(table.querySelector("tfoot")!)).toContain(String(d.report.offices.totals.ideas))
  })

  it("the idea table shows 10 rows, then every idea", () => {
    const d = data()
    expect(d.report.ideas.length).toBeGreaterThan(10)
    const c = render(<ReportView data={d} tenant={es2} />)
    expect(rows(c)).toHaveLength(10)
    const more = [...c.querySelectorAll("button")].find((b) => text(b) === `Show all ${d.report.ideas.length} ideas`)!
    click(more)
    expect(rows(c)).toHaveLength(d.report.ideas.length)
  })

  it("groups ideas by office with a heading each, and each title links to the record", () => {
    const c = render(<ReportView data={data()} tenant={es2} />)
    const group = c.querySelector("[data-report-group]")!
    expect(group.querySelector('th[scope="rowgroup"]')).toBeTruthy()
    const first = rows(c)[0]
    const link = first.querySelector("a")!
    expect(link.getAttribute("href")).toMatch(/^\/submissions\//)
  })

  it("sorting changes the order and aria-sort", () => {
    const c = render(<ReportView data={data()} tenant={es2} />)
    click([...c.querySelectorAll("button")].find((b) => text(b).startsWith("Show all"))!)
    expect(heading(c, "risk").getAttribute("aria-sort")).toBe("ascending")
    expect(heading(c, "idea").getAttribute("aria-sort")).toBe("none")
    click(heading(c, "idea").querySelector("button")!)
    expect(heading(c, "idea").getAttribute("aria-sort")).toBe("ascending")
    expect(heading(c, "risk").getAttribute("aria-sort")).toBe("none")
    const titles = (g: Element) => [...g.querySelectorAll("[data-report-idea] th a")].map(text)
    const asc = [...c.querySelectorAll("[data-report-group]")].map(titles)
    for (const t of asc) expect(t).toEqual([...t].sort((a, b) => a.localeCompare(b)))
    click(heading(c, "idea").querySelector("button")!)
    expect(heading(c, "idea").getAttribute("aria-sort")).toBe("descending")
    const desc = [...c.querySelectorAll("[data-report-group]")].map(titles)
    for (const t of desc) expect(t).toEqual([...t].sort((a, b) => b.localeCompare(a)))
  })

  it('the "No priority" link filters the table to ideas with no priority', () => {
    const d = data()
    const n = d.report.summary.dataCheck.noPriority
    const c = render(<ReportView data={d} tenant={es2} />)
    const link = [...c.querySelectorAll('[data-report="data-check"] a')].find((a) => text(a).endsWith("to no priority"))
    if (n === 0) {
      expect(link).toBeUndefined()
      return
    }
    expect(text(link!)).toBe(n === 1 ? "1 idea ties to no priority" : `${n} ideas tie to no priority`)
    click(link!)
    const all = [...c.querySelectorAll("button")].find((b) => text(b).startsWith("Show all"))
    if (all) click(all)
    expect(rows(c)).toHaveLength(n)
  })

  it("the No priority filter and the risk filter narrow the table", () => {
    const d = data()
    const c = render(<ReportView data={d} tenant={es2} />)
    click([...c.querySelectorAll("button")].find((b) => text(b).startsWith("Show all"))!)
    const box = [...c.querySelectorAll("label")].find((l) => text(l).includes("No priority only"))!.querySelector("input")!
    click(box)
    const none = d.report.ideas.filter((i) => i.priority.labels.length === 0)
    expect(rows(c)).toHaveLength(none.length)
    for (const r of rows(c)) expect(text(r)).toContain("No priority")
    click(box)
    const select = [...c.querySelectorAll("label")].find((l) => text(l).startsWith("Risk"))!.querySelector("select")!
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!
      setter.call(select, "high")
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    const high = d.report.ideas.filter((i) => i.riskLevel === "high")
    expect(rows(c)).toHaveLength(Math.min(high.length, 100))
    for (const r of rows(c)) expect(text(r)).toContain("High")
  })

  it("the panel links filter the table below", () => {
    const d = data()
    const c = render(<ReportView data={d} tenant={es2} />)
    click([...c.querySelectorAll('[data-cockpit="measure-panel"] a')].find((a) => text(a) === "See the high-risk ideas")!)
    const all = [...c.querySelectorAll("button")].find((b) => text(b).startsWith("Show all"))
    if (all) click(all)
    expect(rows(c)).toHaveLength(d.report.summary.risk.high)
  })

  it("renders who holds each waiting idea, and the empty sentence when none wait", () => {
    const d = data()
    const c = render(<ReportView data={d} tenant={es2} />)
    const section = c.querySelector('section[aria-label="Needs a leader\'s decision"]')!
    expect(d.report.needsLeader.items.length).toBeGreaterThan(0)
    const first = d.report.needsLeader.items[0]
    expect(text(section)).toContain(first.heldBy)
    expect(text(section)).toContain("Who holds it")
    expect(text(section)).toContain(first.heldByKind === "reviewer" ? "Reviewer" : "Program office")
    const none = { ...d, report: { ...d.report, needsLeader: { items: [], openCount: 0 } } }
    const c2 = render(<ReportView data={none} tenant={es2} />)
    expect(text(c2)).toContain("Nothing is waiting on a leader today.")
  })

  it("holds Plumb's note place, shows what it is given there, and uses th scope on every table heading", () => {
    const c = render(<ReportView data={data()} tenant={es2} note={<p>THE NOTE</p>} briefing={<p>THE BRIEFING</p>} />)
    expect(text(c)).toContain("THE NOTE")
    expect(text(c)).toContain("THE BRIEFING")
    const bare = render(<ReportView data={data()} tenant={es2} />)
    expect(text(bare)).toContain("Plumb's portfolio note")
    expect(text(bare)).not.toContain("added in the next step")
    for (const th of c.querySelectorAll("th")) expect(th.getAttribute("scope")).toMatch(/^(col|row|rowgroup)$/)
    expect(c.querySelectorAll("h1")).toHaveLength(0)
    expect(c.querySelectorAll('[role="region"][tabindex="0"]').length).toBeGreaterThanOrEqual(3)
  })

  // NL-15 (#335): no raw record IDs on screen; the program name only.
  it("prints the program name under each idea and never the record ID", () => {
    const d = data()
    const c = render(<ReportView data={d} tenant={es2} />)
    expect(rows(c).length).toBeGreaterThan(0)
    for (const row of rows(c)) {
      const id = row.getAttribute("data-report-idea")!
      const idea = d.report.ideas.find((i) => i.id === id)!
      expect(text(row), id).not.toContain(id)
      expect(text(row), id).not.toMatch(/es2-[a-z0-9-]+/)
      if (idea.program) expect(text(row), id).toContain(idea.program)
    }
  })
})

