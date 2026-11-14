// Issue #213 item 9: the eyebrow used to read "Use case {slugTail} · {kind}"
// — a literal "Use case" prefix that disagreed with the kind label itself on
// any unapproved record (e.g. "Use case ... Idea"). The kind label is the
// only authoritative statement of what the record is; the prefix just
// duplicated (and sometimes contradicted) it.

import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReviewerHeader } from "./reviewer-header"

const tenantFlag = vi.hoisted(() => ({ on: true }))
vi.mock("@/lib/tenant", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tenant")>()
  const base = actual.ALL_TENANTS.find((t) => t.id === "es2")!
  return { ...actual, getTenant: () => ({ ...base, features: { ...base.features, timeToDecision: tenantFlag.on } }) }
})

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

describe("ReviewerHeader decided-in line (#270)", () => {
  const decided = (days?: number) => (
    <ReviewerHeader
      slugTail="X"
      lifecycleStage="use_case"
      title="T"
      unitLabel="U"
      submitterName="Jane"
      submittedAt="2026-11-01T15:00:00.000Z"
      status="approved"
      decision="approved"
      decidedAt="2026-11-03T15:00:00.000Z"
      daysToDecision={days}
    />
  )

  it("renders 'Decided in N days' next to the decision date", () => {
    tenantFlag.on = true
    expect(render(decided(2)).textContent).toContain("Decided in 2 days")
  })

  it("renders nothing extra when the tenant feature is off", () => {
    tenantFlag.on = false
    expect(render(decided(2)).textContent).not.toContain("Decided in")
  })

  it("renders nothing extra when there is no day count", () => {
    tenantFlag.on = true
    expect(render(decided(undefined)).textContent).not.toContain("Decided in")
  })
})
