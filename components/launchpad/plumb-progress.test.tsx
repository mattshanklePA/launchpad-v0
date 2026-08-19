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
    // "Step 3 of 4" once read+similar resolve — the first still-active stage is drafting governance.
    expect(el.textContent).toContain("Step 3 of 4")
  })

  it("marks governance and recommendation done once their promises resolve", () => {
    const el = render(<PlumbProgress assistantName="Plumb" governanceDone recommendationDone />)
    expect(el.textContent).toContain("Step 4 of 4")
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
