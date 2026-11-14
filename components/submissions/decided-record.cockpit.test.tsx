// NL-7 (#288): the decided record on ES2 (cockpitLook) in the cockpit kit, and
// the doc tenant still rendering the old markup.

import { describe, it, expect, afterEach } from "vitest"
import { LockedGovernanceChecklist } from "@/components/submissions/locked-governance"
import { DecisionBlock, RecordBand } from "@/components/submissions/record-cockpit"
import { tenantCopy } from "@/lib/tenant/copy"
import { es2 } from "@/lib/tenant/es2"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import { dow } from "@/lib/tenant/dow"
import { render } from "@/components/cockpit/test-utils"

const prev = process.env.NEXT_PUBLIC_TENANT
afterEach(() => {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = prev
})

const profile = { functions: {}, overall: "attention", rationale: "r", flags: [] } as never
const unconfirmed = { profile, review: undefined, effectiveOverall: "attention", isProposal: true } as never
const confirmed = {
  profile,
  isProposal: false,
  effectiveOverall: "attention",
  review: { decision: "confirmed", proposedOverall: "attention", byName: "Priya", byEmail: "p@x.gov", at: "2026-02-01T12:00:00.000Z" },
} as never
const props = { decision: "approved" as const, highImpact: "not_high_impact", fieldsSentence: "12 of 12 fields answered." }

describe("decided record, review record table", () => {
  it("ES2 shows the record as a K5 table with step, answer, who, when", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const el = render(<LockedGovernanceChecklist {...props} cockpit resolvedRmf={confirmed} notConfirmedLabel="x" />)
    expect(el.querySelector('[data-testid="locked-governance"]')).not.toBeNull()
    expect(el.querySelector('[data-cockpit="ranked-table"]')).not.toBeNull()
    const heads = Array.from(el.querySelectorAll("th")).map((t) => t.textContent)
    expect(heads).toEqual(["No.", "Step", "Answer", "Who", "When"])
    expect(el.textContent).toContain("Not high-impact")
    expect(el.textContent).toContain("12 of 12 fields answered.")
    expect(el.textContent).toContain("Priya")
    expect(el.textContent).toContain("This record was approved.")
  })

  it("ES2 keeps the not-confirmed note and has no edit controls", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const el = render(<LockedGovernanceChecklist {...props} cockpit resolvedRmf={unconfirmed} notConfirmedLabel={tenantCopy(es2).rmfNotConfirmedApproved} />)
    expect(el.querySelector('[data-testid="rmf-not-confirmed"]')?.textContent).toBe("Not confirmed before approval")
    expect(el.querySelectorAll("textarea, input")).toHaveLength(0)
    expect(el.textContent).not.toMatch(/Override|Reviewer determination/)
    // The only button is the table's own open-all link.
    expect(Array.from(el.querySelectorAll("button")).map((b) => b.textContent)).toEqual(["Expand all"])
  })

  it("doc, uspto and dow render the old markup (no table)", () => {
    for (const t of [doc, uspto, dow]) {
      process.env.NEXT_PUBLIC_TENANT = t.id
      const el = render(<LockedGovernanceChecklist {...props} resolvedRmf={confirmed} notConfirmedLabel="x" />)
      expect(el.querySelector('[data-cockpit="ranked-table"]')).toBeNull()
      expect(el.querySelectorAll("button, textarea, input")).toHaveLength(0)
      expect(el.textContent).toContain("1 · High-impact determination")
    }
  })
})

describe("decided record, band and decision block", () => {
  it("band eyebrow reads office · record ID · DECIDED", () => {
    const el = render(<RecordBand unitLabel="Census" slugTail="ab12cd34" status="approved" statusLabel="Decided" title="Idea" />)
    expect(el.querySelector("header span")?.textContent).toBe("CENSUS · AB12CD34 · DECIDED")
    expect(el.querySelector("h2")?.textContent).toBe("Idea")
  })

  it("the decision block is a label and value grid with a Locked tag", () => {
    const c = tenantCopy(es2)
    const el = render(
      <DecisionBlock
        title={c.decisionBlockTitle}
        facts={[
          { label: c.decisionFactDecision, value: "Approved", tag: true, tone: "healthy" },
          { label: c.decisionFactBy, value: "Jane Reviewer" },
          { label: c.decisionFactLock, value: c.decisionLockedTag, tag: true, reason: "This decision is final; contact the office to reopen." },
        ]}
      />,
    )
    expect(el.textContent).toContain("The decision")
    const labels = Array.from(el.querySelectorAll("dt")).map((d) => d.textContent)
    expect(labels).toEqual(["Decision", "Decided by", "Lock"])
    const tags = Array.from(el.querySelectorAll('[data-cockpit="square-tag"]')).map((t) => t.textContent)
    expect(tags).toEqual(["Approved", "Locked"])
  })

  it("the new strings are ES2 copy and match the defaults", () => {
    expect(tenantCopy(es2).decisionBlockTitle).toBe("The decision")
    expect(tenantCopy(es2).decisionLockedTag).toBe("Locked")
    expect(tenantCopy(es2).decisionEyebrow).toBe("Decided")
  })
})
