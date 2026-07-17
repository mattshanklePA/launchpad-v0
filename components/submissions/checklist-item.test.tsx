import { describe, it, expect, afterEach } from "vitest"
import { act, createRef, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ChecklistItem } from "@/components/submissions/checklist-item"

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

describe("ChecklistItem", () => {
  it("renders as a numbered list item with its title and status tag", () => {
    const el = render(
      <ol>
        <ChecklistItem index={2} title="High-impact determination" statusLabel="Not yet set" statusClassName="bg-amber-100">
          <p>body</p>
        </ChecklistItem>
      </ol>,
    )
    const li = el.querySelector("li")!
    expect(li.textContent).toContain("2")
    expect(li.textContent).toContain("High-impact determination")
    expect(li.textContent).toContain("Not yet set")
    expect(li.textContent).toContain("body")
  })

  it("applies a highlight ring when `highlighted`, so the decision header's focus jump is visible", () => {
    const el = render(
      <ol>
        <ChecklistItem index={1} title="Disposition" statusLabel="Submitted" statusClassName="" highlighted>
          <p>body</p>
        </ChecklistItem>
      </ol>,
    )
    const li = el.querySelector("li")!
    expect(li.className).toContain("ring-2")
  })

  it("forwards a ref to the <li> so a caller can scroll/focus it", () => {
    const ref = createRef<HTMLLIElement>()
    render(
      <ol>
        <ChecklistItem ref={ref} index={1} title="Disposition" statusLabel="Submitted" statusClassName="">
          <p>body</p>
        </ChecklistItem>
      </ol>,
    )
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe("LI")
  })
})
