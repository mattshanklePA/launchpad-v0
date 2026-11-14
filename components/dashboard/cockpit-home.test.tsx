import { describe, it, expect } from "vitest"
import { act } from "react"
import { CockpitHome } from "./cockpit-home"
import { es2 } from "@/lib/tenant/es2"
import { render } from "@/components/cockpit/test-utils"
import type { KpiDrilldown } from "@/lib/dashboard/drilldown"
import type { KpiCardData } from "./kpi-card-data"

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
})
