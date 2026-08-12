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
  delete process.env.NEXT_PUBLIC_TENANT
})

// The sign-off stage names the tenant's middle org tier (`tierLabels.unit`),
// so the bureau-tier case has to run as a bureau-tier tenant to read "Bureau".
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
    withTenant("doc", () => {
      const el = render(<OrientationBanner bureauTier={true} />)
      expect(el.textContent).toContain("Bureau sign-off")
    })
  })

  it("names the sign-off stage with the tenant's own tier label", () => {
    withTenant("dow", () => {
      const el = render(<OrientationBanner bureauTier={true} />)
      expect(el.textContent).toContain("Command sign-off")
      expect(el.textContent).not.toContain("Bureau sign-off")
    })
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
