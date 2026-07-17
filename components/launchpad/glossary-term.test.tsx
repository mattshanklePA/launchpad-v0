import { describe, it, expect, afterEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { GlossaryTerm } from "@/components/launchpad/glossary-term"
import { GLOSSARY } from "@/lib/glossary"

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

describe("GlossaryTerm", () => {
  it("renders the formal term unchanged, with a focusable trigger", () => {
    const el = render(<GlossaryTerm term="advisory" />)
    const button = el.querySelector("button")
    expect(button).not.toBeNull()
    expect(button!.textContent).toContain(GLOSSARY.advisory.term)
  })

  it("lets a caller override the visible label without changing the definition looked up", () => {
    const el = render(<GlossaryTerm term="advisory">advisory only</GlossaryTerm>)
    const button = el.querySelector("button")
    expect(button!.textContent).toContain("advisory only")
  })

  it("shows the plain-language definition on keyboard focus", () => {
    const el = render(<GlossaryTerm term="tokenOverlapMatch" />)
    const button = el.querySelector("button") as HTMLButtonElement
    act(() => button.focus())
    expect(document.body.textContent).toContain(GLOSSARY.tokenOverlapMatch.definition)
    expect(button.getAttribute("aria-describedby")).toBeTruthy()
  })

  it("dismisses the definition on Escape", () => {
    const el = render(<GlossaryTerm term="advisory" />)
    const button = el.querySelector("button") as HTMLButtonElement
    act(() => button.focus())
    expect(document.body.textContent).toContain(GLOSSARY.advisory.definition)

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })
    expect(document.body.textContent).not.toContain(GLOSSARY.advisory.definition)
  })
})
