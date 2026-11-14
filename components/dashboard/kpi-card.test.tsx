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

// NL-4 (#285): the drilldown dialog on ES2 only.
import { Dialog } from "@/components/ui/dialog"
import { DrilldownDialogContent } from "./kpi-card"

function withTenant(id: string, run: () => void) {
  const prev = process.env.NEXT_PUBLIC_TENANT
  process.env.NEXT_PUBLIC_TENANT = id
  try {
    run()
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
    else process.env.NEXT_PUBLIC_TENANT = prev
  }
}

describe("DrilldownDialogContent (NL-4)", () => {
  const items = [item("1"), item("2")]
  const open = () =>
    render(
      <Dialog open>
        <DrilldownDialogContent label="High-impact" items={items} id="high-impact" />
      </Dialog>,
    )
  const dialog = () => document.body.querySelector('[role="dialog"]') as HTMLElement

  it("es2: K3 title, K5 rows, K6 tags, square, no shadow, same links", () => {
    withTenant("es2", () => {
      open()
      const d = dialog()
      expect(d.querySelector('[data-cockpit="section-title"]')).not.toBeNull()
      expect(d.querySelector('[data-cockpit="drilldown-table"]')).not.toBeNull()
      expect(d.querySelectorAll('[data-cockpit="square-tag"]').length).toBeGreaterThanOrEqual(items.length)
      expect(d.className).not.toMatch(/rounded-(lg|xl)|shadow-(sm|md|lg|xl)/)
      expect(d.className).toContain("shadow-none")
      const hrefs = Array.from(d.querySelectorAll("a")).map((a) => a.getAttribute("href"))
      expect(hrefs).toEqual(items.map((i) => `/submissions/${i.id}`))
      expect(d.textContent).toContain("2 use cases")
    })
  })

  it("doc: renders as today", () => {
    withTenant("doc", () => {
      open()
      const d = dialog()
      expect(d.querySelector('[data-cockpit="section-title"]')).toBeNull()
      expect(d.querySelector('[data-cockpit="square-tag"]')).toBeNull()
      expect(d.className).toContain("rounded-xl")
      expect(d.className).toContain("shadow-lg")
    })
  })
})
