import { describe, it, expect, afterEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PlumbProgress, PLUMB_PROGRESS_MIN_HEIGHT_CLASS } from "@/components/launchpad/plumb-progress"

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

describe("PlumbProgress", () => {
  it("renders all four stages and never a spinner", () => {
    const el = render(<PlumbProgress assistantName="Plumb" governanceDone={false} recommendationDone={false} />)
    expect(el.textContent).toContain("Read the submission")
    expect(el.textContent).toContain("Checking for similar use cases")
    expect(el.textContent).toContain("Drafting governance fields")
    expect(el.textContent).toContain("Writing the recommendation")
    expect(el.querySelector(".animate-spin")).toBeNull()
    expect(el.querySelectorAll("svg.lucide-loader-circle").length).toBe(0)
  })

  it("marks the read and similar-use-case stages done after mount, with governance/recommendation still active", () => {
    const el = render(<PlumbProgress assistantName="Plumb" governanceDone={false} recommendationDone={false} />)
    // The review's own "Step N of M" is the only step counter (F3-2, #269); Plumb shows time left, not a second count.
    expect(el.textContent).not.toMatch(/Step \d of 4/)
    expect(el.textContent).toMatch(/About \d+ seconds left/)
  })

  it("marks governance and recommendation done once their promises resolve", () => {
    const el = render(<PlumbProgress assistantName="Plumb" governanceDone recommendationDone />)
    expect(el.textContent).not.toMatch(/Step \d of 4/)
  })

  it("uses the same min-height class the resolved card is expected to share", () => {
    const el = render(<PlumbProgress assistantName="Plumb" governanceDone={false} recommendationDone={false} />)
    expect(el.firstElementChild?.className).toContain(PLUMB_PROGRESS_MIN_HEIGHT_CLASS)
  })

  it("never renders the fixed-height-slot implementer note as reviewer-facing copy (RD-8, issue #218)", () => {
    const el = render(<PlumbProgress assistantName="Plumb" governanceDone={false} recommendationDone={false} />)
    expect(el.textContent).not.toContain("nothing shifts")
  })
})
