import { describe, it, expect } from "vitest"
import { act } from "react"
import { CockpitHome } from "./cockpit-home"
import { es2 } from "@/lib/tenant/es2"
import { render } from "@/components/cockpit/test-utils"
import type { KpiDrilldown } from "@/lib/dashboard/drilldown"
import type { KpiCardData } from "./kpi-card-data"
import { kpiMeaningLine } from "./kpi-card-data"
import { doc } from "@/lib/tenant/doc"
import type { ActionItem } from "./action-center-data"

const drilldown = {
  pipeline: [{ id: "a", title: "Idea A", bureau: "x", bureauLabel: "X", stage: "In review", cardField: "f" }],
  readiness: [],
  "high-impact": [],
  "omb-reportable": [],
  "omb-review": [],
  signoff: [],
  duplicates: [],
  rmf: [],
  "time-to-decision": [],
} as unknown as KpiDrilldown

const cards: KpiCardData[] = [
  { id: "pipeline", label: "In the pipeline", value: 12, status: "neutral", subtitle: "use cases" },
  { id: "time-to-decision", label: "Median time to decision", value: "9 days", status: "neutral", subtitle: "across 4 decisions" },
]

function renderHome(items = [] as Parameters<typeof CockpitHome>[0]["actionItems"]) {
  return render(
    <CockpitHome
      tenant={es2}
      actionItems={items}
      kpiCards={cards}
      drilldown={drilldown}
      headerMeta="all offices"
      railEyebrow="Where the portfolio stands"
      rollupLabel="Program roll-up"
      plumb="Nothing is blocked."
    />,
  )
}

describe("CockpitHome (NL-3, #284)", () => {
  it("shows the all-clear sentence and no lead or table when there are no items", () => {
    const el = renderHome()
    expect(el.textContent).toContain("Nothing needs attention right now.")
    expect(el.querySelector('[data-cockpit="lead-block"]')).toBeNull()
    expect(el.querySelector('[data-cockpit="ranked-table"]')).toBeNull()
  })

  it("keeps each KPI's number, label and drilldown, lead panel first, with no track (no goal exists)", async () => {
    const el = renderHome()
    const panels = el.querySelectorAll('[data-cockpit="measure-panel"]')
    expect(panels).toHaveLength(2)
    expect(panels[0].textContent).toContain("In the pipeline")
    expect(panels[0].textContent).toContain("12")
    expect(panels[1].textContent).toContain("9 days")
    expect(panels[1].textContent).toContain("across 4 decisions")
    expect(el.querySelector('[data-cockpit="track"]')).toBeNull()
    const open = panels[0].querySelector("button")!
    expect(open.getAttribute("aria-label")).toBe("In the pipeline — view details")
    await act(async () => {
      open.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Idea A")
  })

  it("every status word is a square tag with text", () => {
    const el = renderHome([{ id: "x", title: "1 thing", severity: "critical" }])
    const tags = el.querySelectorAll('[data-cockpit="square-tag"]')
    expect(tags.length).toBeGreaterThan(0)
    tags.forEach((t) => expect(t.textContent?.trim()).not.toBe(""))
  })

  it("one program or office: its ideas as a K5 table with the same title, status and link (NL-4, #285)", () => {
    const el = render(
      <CockpitHome
        tenant={es2}
        actionItems={[]}
        kpiCards={cards}
        drilldown={drilldown}
        headerMeta="of 3 enterprise-wide"
        scopedRows={[
          { id: "s1", title: "Idea One", meta: "Pat · submitted 1 Jan 2026", href: "/submissions/s1", statusKeystone: "neutral", statusLabel: "In review" },
          { id: "s2", title: "Idea Two", meta: "Sam · in duplicate cluster", href: "/clusters/c1", statusKeystone: "alert", statusLabel: "Blocked" },
        ]}
        scopedRowsTitle="Use cases in this program office"
        railEyebrow="ACWS at a glance"
        rollupLabel="Program roll-up"
        plumb="Nothing is blocked."
      />,
    )
    const table = el.querySelector('[data-cockpit="ranked-table"]')!
    expect(table).not.toBeNull()
    expect(table.textContent).toContain("Idea One")
    expect(table.textContent).toContain("Pat · submitted 1 Jan 2026")
    expect(table.textContent).toContain("In review")
    expect(table.textContent).toContain("Blocked")
    expect(Array.from(table.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual(["/submissions/s1", "/clusters/c1"])
    expect(table.querySelectorAll('[data-cockpit="square-tag"]')).toHaveLength(2)
  })
})

describe("CockpitHome rows and panels (NL-12, #313)", () => {
  const withList: ActionItem = {
    id: "unassigned",
    title: "9 submissions with no reviewer assigned",
    severity: "warning",
    drilldown: {
      label: "No reviewer assigned",
      items: [{ id: "s1", title: "Idea One", bureau: "x", bureauLabel: "X", stage: "Unassigned", cardField: "f" }],
    },
  }
  const noList: ActionItem = { id: "signoff", title: "2 approved use cases awaiting directorate sign-off", severity: "warning" }
  const lead: ActionItem = { id: "lead", title: "1 cluster pending", severity: "critical" }
  const inventory: ActionItem = {
    id: "omb-review",
    title: "Check if it goes in the AI inventory: 10 submissions",
    severity: "info",
    drilldown: { label: "Needs review", items: [{ id: "s2", title: "Idea Two", bureau: "x", bureauLabel: "X", stage: "s", cardField: "f" }] },
  }

  it("a row opens only when it has a list of ideas behind its count, and that list links to each idea", async () => {
    const el = renderHome([lead, withList, noList, inventory])
    const rows = Array.from(el.querySelectorAll("tbody tr"))
    const byText = (t: string) => rows.find((r) => r.textContent?.includes(t))!
    expect(byText("awaiting directorate").getAttribute("aria-expanded")).toBeNull()
    expect(byText("no reviewer assigned").getAttribute("aria-expanded")).toBe("false")
    await act(async () => {
      byText("no reviewer assigned").dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    const detail = el.querySelector("tbody tr[id]")!
    expect(detail.querySelector('a[href="/submissions/s1"]')?.textContent).toBe("Idea One")
    // The detail never repeats the row's own words.
    expect(detail.textContent).not.toContain("9 submissions with no reviewer assigned")
  })

  it("every Count cell shows its number, even when the number is not first", () => {
    const el = renderHome([lead, withList, noList, inventory])
    const counts = Array.from(el.querySelectorAll("tbody tr[tabindex], tbody tr:not([id])")).map((r) => r.querySelector("td")?.textContent)
    expect(counts).toEqual(["9", "2", "10"])
    expect(counts).not.toContain("–")
  })

  it("Expand all is absent when no row has anything to open", () => {
    const el = renderHome([lead, noList])
    expect(Array.from(el.querySelectorAll("button")).some((b) => b.textContent === "Expand all")).toBe(false)
  })

  it("the Risk framework panel's big number agrees with its line", () => {
    const rmf: KpiCardData = { id: "rmf", label: "Risk framework needs attention", value: 5, status: "warning", subtitle: "NIST AI RMF gap needs attention" }
    const el = render(
      <CockpitHome tenant={es2} actionItems={[]} kpiCards={[rmf]} drilldown={drilldown} headerMeta="x" railEyebrow="Where" rollupLabel="r" plumb="p" />,
    )
    const text = el.querySelector('[data-cockpit="measure-panel"]')!.textContent!
    expect(text).toContain("5")
    expect(text).toContain("use cases need attention on the risk framework")
    expect(text).not.toMatch(/\b0\b/)
  })

  it("every panel kind has a line, high-impact included", () => {
    for (const id of ["pipeline", "duplicates", "high-impact", "rmf", "time-to-decision"]) {
      expect(kpiMeaningLine({ id, label: id, value: 3 }).length).toBeGreaterThan(0)
    }
    expect(kpiMeaningLine({ id: "high-impact", label: "x", value: 2 })).toBe("use cases recommended as high-impact")
  })

  it("scoped idea rows do not open (their detail was a repeat)", () => {
    const el = render(
      <CockpitHome
        tenant={es2}
        actionItems={[]}
        kpiCards={cards}
        drilldown={drilldown}
        headerMeta="x"
        scopedRows={[{ id: "s1", title: "Idea One", meta: "m", href: "/submissions/s1", statusKeystone: "neutral", statusLabel: "In review" }]}
        scopedRowsTitle="Use cases in this program office"
        railEyebrow="r"
        rollupLabel="r"
        plumb="p"
      />,
    )
    expect(el.querySelector("tbody tr[aria-expanded]")).toBeNull()
  })

  it("doc keeps the old work-list and KPI rail, not the cockpit home", () => {
    expect(doc.features.cockpitLook).toBe(false)
  })
})
