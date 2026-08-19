// Issue #213 item 9: the eyebrow used to read "Use case {slugTail} · {kind}"
// — a literal "Use case" prefix that disagreed with the kind label itself on
// any unapproved record (e.g. "Use case ... Idea"). The kind label is the
// only authoritative statement of what the record is; the prefix just
// duplicated (and sometimes contradicted) it.

import { describe, it, expect, afterEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReviewerHeader } from "./reviewer-header"

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

function eyebrowText(el: HTMLElement): string {
  return el.querySelector(".ks-microlabel")?.textContent ?? ""
}

describe("ReviewerHeader eyebrow", () => {
  it("prints just the identifier and the kind label — no literal 'Use case' prefix — on an idea", () => {
    const el = render(
      <ReviewerHeader
        slugTail="SOURCE-SELECTION-SCORING"
        lifecycleStage="idea"
        title="Source Selection Scoring"
        unitLabel="Army Contract Writing System (ACWS)"
        submitterName="Jane Doe"
        submittedAt="2026-08-18T00:00:00.000Z"
        status="submitted"
      />,
    )
    expect(eyebrowText(el)).toBe("SOURCE-SELECTION-SCORING · Idea")
  })

  it("prints just the identifier and the kind label on an approved use case", () => {
    const el = render(
      <ReviewerHeader
        slugTail="SOURCE-SELECTION-SCORING"
        lifecycleStage="use_case"
        title="Source Selection Scoring"
        unitLabel="Army Contract Writing System (ACWS)"
        submitterName="Jane Doe"
        submittedAt="2026-08-18T00:00:00.000Z"
        status="approved"
      />,
    )
    expect(eyebrowText(el)).toBe("SOURCE-SELECTION-SCORING · Use Case")
  })
})
