import { describe, it, expect, afterEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { KpiCard } from "./kpi-card"
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

function item(id: string): KpiDrilldownItem {
  return { id, title: `Idea ${id}`, bureau: "uspto", bureauLabel: "USPTO", stage: "Submitted", cardField: "field" }
}

describe("KpiCard", () => {
  it("keeps the glossary tooltip trigger outside the drill-down button — no <button> nested in a <button>", () => {
    const el = render(
      <KpiCard id="omb-reportable" label="OMB reportable" value={3} glossary="ombReportability" items={[item("1")]} />,
    )
    const buttons = el.querySelectorAll("button")
    expect(buttons.length).toBe(2) // the glossary "?" trigger + the drill-down button
    for (const button of Array.from(buttons)) {
      expect(button.querySelector("button")).toBeNull()
    }
  })

  it("shows the subtitle alongside the value", () => {
    const el = render(<KpiCard id="pipeline" label="In pipeline" value={5} subtitle="Every use case in this view" />)
    expect(el.textContent).toContain("Every use case in this view")
  })

  it("keeps the formal label visible on the tooltip trigger", () => {
    const el = render(<KpiCard id="readiness" label="Ready" value={2} glossary="readinessReady" />)
    const button = el.querySelector("button")
    expect(button?.textContent).toContain("Ready")
  })

  it("renders a plain, non-interactive card when no glossary/subtitle/items are given", () => {
    const el = render(<KpiCard id="high-impact" label="Recommended high-impact" value={0} />)
    expect(el.querySelector("button")).toBeNull()
    expect(el.textContent).toContain("Recommended high-impact")
  })
})
