import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReadinessResult } from "@/components/steps/readiness-result"

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

function buttonsNamed(el: HTMLElement, name: RegExp): HTMLButtonElement[] {
  return Array.from(el.querySelectorAll("button")).filter((b) => name.test(b.textContent ?? ""))
}

function buttonNamed(el: HTMLElement, name: RegExp): HTMLButtonElement {
  const match = buttonsNamed(el, name)[0]
  if (!match) throw new Error(`no button matching ${name}`)
  return match
}

function click(b: HTMLElement) {
  act(() => {
    b.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

const SUMMARY = "The problem is grounded but the expected business benefit has no measured baseline."
const EXEC = "An anomaly model would score invoices and route the risky ones to analysts."

function renderResult(props: Partial<Parameters<typeof ReadinessResult>[0]> = {}) {
  return render(
    <ReadinessResult
      readinessScore="needs_work"
      readinessSummary={SUMMARY}
      readinessFindings={[]}
      executiveSummary={EXEC}
      isAssessing={false}
      onJumpToStep={() => {}}
      onReassess={() => {}}
      {...props}
    />,
  )
}

describe("ReadinessResult", () => {
  it("renders one hyperlinked Fix in step button per finding and jumps to that step number", () => {
    const onJumpToStep = vi.fn()
    const el = renderResult({
      readinessFindings: [
        { step: 2, message: "Name how many hours a week the manual triage costs." },
        { step: 3, message: "Say what the model would do with a flagged invoice." },
      ],
      onJumpToStep,
    })

    const fixButtons = buttonsNamed(el, /Fix in step/)
    expect(fixButtons.length).toBe(2)
    expect(fixButtons[0].textContent).toContain("Fix in step 2: Business Problem & Opportunity")
    expect(fixButtons[1].textContent).toContain("Fix in step 3: Proposed Solution & Benefits")
    expect(el.textContent).toContain("Name how many hours a week the manual triage costs.")

    click(fixButtons[1])
    expect(onJumpToStep).toHaveBeenCalledTimes(1)
    expect(onJumpToStep).toHaveBeenCalledWith(3)
  })

  it("says nothing is blocking when the score is ready and there are no findings", () => {
    const el = renderResult({ readinessScore: "ready", readinessFindings: [] })
    expect(el.textContent).toContain("Nothing is blocking this.")
    expect(el.textContent).toContain("Ready for a reviewer.")
    expect(buttonsNamed(el, /Fix in step/).length).toBe(0)
  })

  // An older record, or the pre-ES2-14 shape, has no findings key at all.
  it("renders no findings line at all when the score is not ready and findings are absent", () => {
    const el = renderResult({ readinessScore: "needs_work", readinessFindings: undefined })
    expect(el.textContent).not.toContain("Nothing is blocking this.")
    expect(buttonsNamed(el, /Fix in step/).length).toBe(0)
    expect(el.textContent).toContain("Close the items below, then submit.")
  })

  it("keeps Detailed analysis closed by default and opens it onto the readiness summary", () => {
    const el = renderResult()
    expect(el.textContent).toContain("Detailed analysis")
    expect(el.textContent).not.toContain(SUMMARY)

    click(buttonNamed(el, /Detailed analysis/))
    expect(el.textContent).toContain(SUMMARY)
  })

  it("keeps the Executive Summary (Preview) disclosure, also closed by default", () => {
    const el = renderResult()
    expect(el.textContent).toContain("Executive Summary (Preview)")
    expect(el.textContent).not.toContain(EXEC)

    click(buttonNamed(el, /Executive Summary \(Preview\)/))
    expect(el.textContent).toContain(EXEC)
  })

  it("keeps Re-assess Readiness last and wired", () => {
    const onReassess = vi.fn()
    const el = renderResult({ onReassess })
    const all = Array.from(el.querySelectorAll("button"))
    expect(all[all.length - 1].textContent).toContain("Re-assess Readiness")
    click(all[all.length - 1])
    expect(onReassess).toHaveBeenCalledTimes(1)
  })
})
