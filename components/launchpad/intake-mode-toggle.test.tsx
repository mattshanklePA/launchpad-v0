import { describe, it, expect, afterEach, beforeEach } from "vitest"
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
  // The switch markup is the look every tenant but ES2 keeps; pinned to doc so
  // the ES2 test run does not read the segmented control by mistake (NL-11).
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TENANT = "doc"
  })

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

describe("IntakeModeToggle on ES2 (NL-11)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
  })

  it("is a two-option square segmented control, not a switch", () => {
    const el = render(<IntakeModeToggle mode="guided" onChange={() => {}} />)
    expect(el.querySelector('[role="switch"]')).toBeNull()
    const buttons = Array.from(el.querySelectorAll("button"))
    expect(buttons.map((b) => b.textContent)).toEqual(["Guided", "As a form"])
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false"])
    expect(el.innerHTML).not.toMatch(/rounded/)
  })

  it("calls onChange with the other mode, and not for the current one", () => {
    const seen: IntakeMode[] = []
    const el = render(<IntakeModeToggle mode="guided" onChange={(m) => seen.push(m)} />)
    const [guided, form] = Array.from(el.querySelectorAll("button"))
    act(() => guided.click())
    expect(seen).toEqual([])
    act(() => form.click())
    expect(seen).toEqual(["form"])
  })
})
