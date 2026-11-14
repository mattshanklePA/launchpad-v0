import { describe, it, expect, afterEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { KpiCard } from "./kpi-card"
import { buildKpiCards } from "./department-dashboard-data"
import { ALL_TENANTS } from "@/lib/tenant"
import type { DashboardMetrics } from "@/lib/dashboard/metrics"
import type { KpiDrilldownItem } from "@/lib/dashboard/drilldown"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
})
function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

const es2 = ALL_TENANTS.find((t) => t.id === "es2")!
function tile(medianDays: number | null, decisions: number) {
  const metrics = {
    pipelineStatus: { counts: {}, total: 0 },
    readiness: { ready: 0, needs_work: 0, early_stage: 0, not_assessed: 0, total: 0 },
    highImpact: { count: 0, total: 0 },
    ombReportability: { reportable: 0, excluded: 0, review: 0, consolidated: 0, individual: 0 },
    crossBureauDuplicates: { clusterCount: 0, pendingCount: 0 },
    awaitingSignoff: { count: 0, total: 0 },
    rmfRollup: { on_track: 0, attention: 0, at_risk: 0, unknown: 0, total: 0 },
    timeToDecision: { medianDays, decisions },
  } as unknown as DashboardMetrics
  return buildKpiCards(metrics, true, true, es2).find((c) => c.id === "time-to-decision")!
}

const item: KpiDrilldownItem = { id: "1", title: "Idea 1", bureau: "x", bureauLabel: "X", stage: "Approved", cardField: "2 days" }

describe("Median time to decision tile (ES2)", () => {
  it("renders 'N days' and 'across M decisions'", () => {
    const el = render(<KpiCard {...tile(2, 5)} />)
    expect(el.textContent).toContain("Median time to decision")
    expect(el.textContent).toContain("2 days")
    expect(el.textContent).toContain("across 5 decisions")
  })

  it("renders 'No decisions yet' when there are none", () => {
    const el = render(<KpiCard {...tile(null, 0)} />)
    expect(el.textContent).toContain("No decisions yet")
    expect(el.textContent).not.toContain("across")
  })

  it("opens the decided list from the tile like the other tiles", () => {
    const el = render(<KpiCard {...tile(2, 1)} items={[item]} />)
    expect(el.querySelector('button[aria-haspopup="dialog"]')).not.toBeNull()
  })
})
