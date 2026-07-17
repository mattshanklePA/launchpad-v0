import { describe, it, expect, afterEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { IntakeModeToggle } from "./intake-mode-toggle"
import type { IntakeMode } from "@/hooks/use-intake-mode-preference"

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

describe("IntakeModeToggle", () => {
  it("is a labeled, keyboard-focusable control", () => {
    const el = render(<IntakeModeToggle mode="guided" onChange={() => {}} />)
    const group = el.querySelector('[role="group"]')
    expect(group?.getAttribute("aria-label")).toBe("Intake mode")
    const switchEl = el.querySelector('button[role="switch"]') as HTMLButtonElement
    expect(switchEl).toBeTruthy()
    expect(switchEl.getAttribute("aria-label")).toContain("Guided")
    expect(switchEl.tabIndex).not.toBe(-1)
  })

  it("reflects the current mode via aria-checked and calls onChange with the other mode when clicked", () => {
    let last: IntakeMode | null = null
    const el = render(<IntakeModeToggle mode="guided" onChange={(m) => (last = m)} />)
    const switchEl = el.querySelector('button[role="switch"]') as HTMLButtonElement
    expect(switchEl.getAttribute("aria-checked")).toBe("false")

    act(() => switchEl.click())
    expect(last).toBe("form")
  })

  it("shows form as checked when mode is form", () => {
    const el = render(<IntakeModeToggle mode="form" onChange={() => {}} />)
    const switchEl = el.querySelector('button[role="switch"]') as HTMLButtonElement
    expect(switchEl.getAttribute("aria-checked")).toBe("true")
  })
})
