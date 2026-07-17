import { describe, it, expect, afterEach, beforeEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { OrientationBanner } from "./orientation-banner"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
  localStorage.clear()
})

function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

describe("OrientationBanner", () => {
  it("shows the generic pipeline stages for a non-bureau-tier tenant", () => {
    const el = render(<OrientationBanner bureauTier={false} />)
    expect(el.textContent).toContain("Submitted")
    expect(el.textContent).toContain("OMB reportable")
    expect(el.textContent).not.toContain("Bureau sign-off")
  })

  it("adds the bureau sign-off stage for a bureau-tier tenant", () => {
    const el = render(<OrientationBanner bureauTier={true} />)
    expect(el.textContent).toContain("Bureau sign-off")
  })

  it("hides once dismissed, and stays dismissed across a fresh mount", () => {
    const el = render(<OrientationBanner bureauTier={false} />)
    const dismiss = el.querySelector("button") as HTMLButtonElement
    act(() => dismiss.click())
    expect(el.textContent).toBe("")

    if (root) act(() => root!.unmount())
    container!.remove()
    const el2 = render(<OrientationBanner bureauTier={false} />)
    expect(el2.textContent).toBe("")
  })
})
