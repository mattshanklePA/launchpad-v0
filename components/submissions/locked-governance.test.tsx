import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { LockedGovernanceChecklist } from "@/components/submissions/locked-governance"
import { DecisionTab } from "@/components/submissions/decision-tab"
import { tenantCopy } from "@/lib/tenant/copy"
import { uspto } from "@/lib/tenant/uspto"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { es2 } from "@/lib/tenant/es2"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  container?.remove()
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

const profile = { functions: {}, overall: "attention", rationale: "r", flags: [] } as never
const unconfirmed = { profile, review: undefined, effectiveOverall: "attention", isProposal: true } as never
const confirmed = {
  profile,
  isProposal: false,
  effectiveOverall: "attention",
  review: { decision: "confirmed", proposedOverall: "attention", byName: "Priya", byEmail: "p@x.gov", at: "2026-02-01T12:00:00.000Z" },
} as never

const buttons = (el: HTMLElement) => Array.from(el.querySelectorAll("button")).map((b) => b.textContent)

describe("LockedGovernanceChecklist", () => {
  const props = { decision: "approved" as const, highImpact: "not_high_impact", fieldsSentence: "12 of 12 fields answered." }

  it("has no Confirm, Override, determination or edit controls", () => {
    const el = render(<LockedGovernanceChecklist {...props} resolvedRmf={unconfirmed} notConfirmedLabel="Not confirmed before approval" />)
    expect(el.querySelectorAll("button, textarea, input")).toHaveLength(0)
    expect(el.textContent).not.toMatch(/Confirm\b(?! before)|Override|Reviewer determination/)
    expect(el.textContent).toContain("Not high-impact")
  })

  it("an unconfirmed risk framework on an approved record says so, as a note", () => {
    const el = render(<LockedGovernanceChecklist {...props} resolvedRmf={unconfirmed} notConfirmedLabel={tenantCopy(doc).rmfNotConfirmedApproved} />)
    const note = el.querySelector('[data-testid="rmf-not-confirmed"]')
    expect(note?.textContent).toBe("Not confirmed before approval")
    expect(el.textContent).not.toContain("awaiting reviewer")
    expect(el.textContent).not.toContain("Proposed")
  })

  it("a confirmed risk framework shows who confirmed it and when", () => {
    const el = render(<LockedGovernanceChecklist {...props} resolvedRmf={confirmed} notConfirmedLabel="x" />)
    expect(el.textContent).toContain("Confirmed as proposed by Priya")
    expect(el.querySelector('[data-testid="rmf-not-confirmed"]')).toBeNull()
  })

  it("uses the same wording on all four tenants", () => {
    for (const t of [uspto, doc, dow, es2]) {
      expect(tenantCopy(t).rmfNotConfirmedApproved).toBe("Not confirmed before approval")
    }
  })
})

describe("DecisionTab on a decided record", () => {
  it("offers no Send & request info or Draft, but keeps the conversation and the reopen line", () => {
    const el = render(
      <DecisionTab
        reasonText="Because."
        decision="approved"
        status="approved"
        busy={false}
        onApprove={() => {}}
        onReject={() => {}}
        onRequestInfo={() => {}}
        reversibilityText="Signed off Nov 1; contact the office to reopen."
        showDispositionButtons={false}
        assistantName="Plumb"
        assisting={false}
        assist={null}
        comments={[{ id: "c1", body: "Earlier question", authorName: "Dana", authorRole: "reviewer", createdAt: "2026-01-01T00:00:00.000Z" } as never]}
        submitterFirstName="Alex"
        onSeeAllConversation={() => {}}
      />,
    )
    expect(el.textContent).not.toContain("Send & request info")
    expect(el.textContent).not.toContain("Draft with")
    expect(el.querySelector("textarea")).toBeNull()
    expect(buttons(el).join("|")).not.toMatch(/Confirm|Override/)
    expect(el.textContent).toContain("Earlier question")
    expect(el.textContent).toContain("contact the office to reopen")
  })
})

describe("DecisionTab saved Plumb read (issue #272)", () => {
  const props = {
    reasonText: "Because.", decision: "approved" as const, status: "approved" as const, busy: false,
    onApprove: () => {}, onReject: () => {}, onRequestInfo: () => {}, reversibilityText: "x",
    showDispositionButtons: false, assisting: false, comments: [], submitterFirstName: "Alex", onSeeAllConversation: () => {},
  }
  const read = { verdict: "Looks solid.", strengths: [], gaps: [], suggestedDisposition: "approve" as const, draftRequestInfo: "" }

  it("renders the saved read with its date, using each tenant's assistant name", () => {
    for (const name of ["Plumb", "Scout"]) {
      const el = render(<DecisionTab {...props} assistantName={name} assist={read} assistSavedAt="2026-10-01T12:00:00.000Z" />)
      expect(el.textContent).toMatch(new RegExp(`${name}'s read from .*2026`))
      expect(el.textContent).toContain("Looks solid.")
    }
  })
  it("shows No saved read with a button when none exists", () => {
    const onProduceRead = vi.fn()
    const el = render(<DecisionTab {...props} assistantName="Plumb" assist={null} onProduceRead={onProduceRead} />)
    expect(el.textContent).toContain("No saved read")
    const btn = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Produce a read")!
    btn.click()
    expect(onProduceRead).toHaveBeenCalledTimes(1)
  })
})

