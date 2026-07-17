import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { useIntakeModePreference } from "./use-intake-mode-preference"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SESSION_KEY = "launchpad-session"

function setSession(userId: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, loggedInAt: "2026-07-17T00:00:00.000Z" }))
}

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

function Probe() {
  const { mode, hasStoredPreference, setMode } = useIntakeModePreference()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="stored">{String(hasStoredPreference)}</span>
      <button onClick={() => setMode("form")}>choose form</button>
      <button onClick={() => setMode("guided")}>choose guided</button>
    </div>
  )
}

describe("useIntakeModePreference", () => {
  it("defaults a brand-new submitter to guided with no stored preference", () => {
    setSession("user-1")
    const el = render(<Probe />)
    expect(el.querySelector("[data-testid=mode]")!.textContent).toBe("guided")
    expect(el.querySelector("[data-testid=stored]")!.textContent).toBe("false")
  })

  it("switching to form updates state and persists the choice", () => {
    setSession("user-1")
    const el = render(<Probe />)
    const formButton = el.querySelectorAll("button")[0] as HTMLButtonElement
    act(() => formButton.click())
    expect(el.querySelector("[data-testid=mode]")!.textContent).toBe("form")
    expect(el.querySelector("[data-testid=stored]")!.textContent).toBe("true")
    expect(localStorage.getItem("aid-intake-mode:user-1")).toBe("form")
  })

  it("a fresh mount honors the previously persisted choice", () => {
    setSession("user-1")
    localStorage.setItem("aid-intake-mode:user-1", "form")
    const el = render(<Probe />)
    expect(el.querySelector("[data-testid=mode]")!.textContent).toBe("form")
    expect(el.querySelector("[data-testid=stored]")!.textContent).toBe("true")
  })

  it("scopes the preference per signed-in user", () => {
    setSession("user-1")
    localStorage.setItem("aid-intake-mode:user-1", "form")
    setSession("user-2")
    const el = render(<Probe />)
    expect(el.querySelector("[data-testid=mode]")!.textContent).toBe("guided")
  })
})
