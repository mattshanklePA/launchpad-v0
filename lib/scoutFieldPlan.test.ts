import { describe, it, expect } from "vitest"
import { scoutFieldsForStep, draftFieldFallback, SCOUT_STEP_FIELD_PLAN } from "@/lib/scoutFieldPlan"

describe("scoutFieldsForStep", () => {
  it("returns all planned fields for Propose-a-Solution (step 3) when nothing is disabled", () => {
    const fields = scoutFieldsForStep(3)
    expect(fields.map((f) => f.key)).toEqual(["solutionSummary", "userValue", "businessValue"])
  })

  it("drops a field the admin turned off in the form config", () => {
    const fields = scoutFieldsForStep(3, { businessValue: false })
    expect(fields.map((f) => f.key)).toEqual(["solutionSummary", "userValue"])
  })

  it("keeps a field absent from the enabled map (default-enabled)", () => {
    const fields = scoutFieldsForStep(3, { someOtherField: false })
    expect(fields).toHaveLength(3)
  })

  it("returns an empty list for a step with no planned fields", () => {
    expect(scoutFieldsForStep(999)).toEqual([])
  })

  it("covers every step the assistant panel renders on (2, 3, 4)", () => {
    expect(Object.keys(SCOUT_STEP_FIELD_PLAN).map(Number).sort()).toEqual([2, 3, 4])
  })
})

describe("draftFieldFallback", () => {
  it("preserves the submitter's seed text verbatim and appends bracketed placeholders", () => {
    const result = draftFieldFallback("Solution Summary", "We'd build a triage assistant.")
    expect(result.value.startsWith("We'd build a triage assistant.")).toBe(true)
    expect(result.value).toMatch(/\[.*\]/)
  })

  it("never invents specifics when there is no seed text", () => {
    const result = draftFieldFallback("Expected User Benefit")
    expect(result.value).toMatch(/^\[.*\]$/)
  })

  it("always flags the rationale as a non-AI fallback", () => {
    const result = draftFieldFallback("Technical Constraints", "some notes")
    expect(result.rationale).toMatch(/unavailable/i)
  })
})
