import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ActionCenter } from "./action-center"
import type { ActionItem } from "./action-center-data"
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

function entry(id: string, title: string): KpiDrilldownItem {
  return { id, title, bureau: "noaa", bureauLabel: "NOAA", stage: "In review", cardField: "Pending" }
}

/** The row whose title text matches. */
function rowFor(el: HTMLElement, title: string): HTMLElement {
  const row = Array.from(el.querySelectorAll("[data-action-row]")).find((d) => (d.textContent ?? "").includes(title))
  if (!row) throw new Error(`no Action Center row titled ${title}`)
  return row as HTMLElement
}

describe("ActionCenter", () => {
  // ES2-12 B: a disabled button labelled "Review" told the reviewer there was
  // something to click when nothing was wired. No button is the honest render.
  it("renders no button at all for an item with neither drilldown nor onAction", () => {
    const items: ActionItem[] = [{ id: "inert", title: "3 submissions with no reviewer assigned", severity: "warning" }]
    const el = render(<ActionCenter items={items} />)
    const row = rowFor(el, "3 submissions with no reviewer assigned")
    expect(row.querySelectorAll('[role="button"], button')).toHaveLength(0)
  })

  it("runs onAction when the item carries one", async () => {
    const onAction = vi.fn().mockResolvedValue({ status: "sent" as const, description: "Notified 1 reviewer." })
    const items: ActionItem[] = [
      { id: "signoff", title: "1 use case awaiting sign-off", severity: "warning", actionLabel: "Nudge sign-off", onAction },
    ]
    const el = render(<ActionCenter items={items} />)
    const button = rowFor(el, "1 use case awaiting sign-off").querySelector("button")!
    expect(button.textContent).toContain("Nudge sign-off")
    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it("opens a dialog listing the item's drilldown entries", async () => {
    const items: ActionItem[] = [
      {
        id: "duplicates",
        title: "2 cross-bureau duplicate clusters pending rationalization",
        severity: "critical",
        actionLabel: "Rationalize",
        drilldown: {
          label: "Cross-bureau duplicate clusters",
          items: [entry("s1", "Coastal flood model"), entry("s2", "Storm surge model")],
        },
      },
    ]
    const el = render(<ActionCenter items={items} />)
    const trigger = rowFor(el, "duplicate clusters pending rationalization").querySelector("button")!
    expect(trigger.textContent).toContain("Rationalize")
    expect(trigger.disabled).toBe(false)

    await act(async () => {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog!.textContent).toContain("Cross-bureau duplicate clusters")
    expect(dialog!.textContent).toContain("Coastal flood model")
    expect(dialog!.textContent).toContain("Storm surge model")
    expect(dialog!.querySelector('a[href="/submissions/s1"]')).not.toBeNull()
  })

  it("still opens the dialog when the drilldown list is empty, rather than lying about it", async () => {
    const items: ActionItem[] = [
      {
        id: "omb-review",
        title: "1 submission needs an OMB reportability review",
        severity: "info",
        actionLabel: "Review",
        drilldown: { label: "OMB reportable", items: [] },
      },
    ]
    const el = render(<ActionCenter items={items} />)
    const trigger = rowFor(el, "OMB reportability review").querySelector("button")!
    await act(async () => {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain("Nothing here right now.")
  })
})
