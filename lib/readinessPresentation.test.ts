import { describe, it, expect } from "vitest"
import { readinessVerdictSentence, findingStepName } from "@/lib/readinessPresentation"
import { getFormSteps } from "@/lib/steps"

// ES2-14: the verdict sentence is derived from the score, never from the
// model, so it is a pure map and testable without rendering.
describe("readinessVerdictSentence", () => {
  it("maps all three scores to their own sentence", () => {
    expect(readinessVerdictSentence("ready")).toBe("Ready for a reviewer.")
    expect(readinessVerdictSentence("needs_work")).toBe("Close the items below, then submit.")
    expect(readinessVerdictSentence("early_stage")).toBe("Keep refining before you submit.")
  })

  it("says nothing when no assessment has been run", () => {
    expect(readinessVerdictSentence("")).toBe("")
    expect(readinessVerdictSentence(undefined)).toBe("")
  })
})

describe("findingStepName", () => {
  it("maps a finding with step 3 to step 3's name from getFormSteps", () => {
    const fromFlow = getFormSteps().find((s) => s.step === 3)?.name
    expect(findingStepName(3)).toBe(fromFlow)
    expect(findingStepName(3)).toBe("Proposed Solution & Benefits")
  })

  it("maps the other two steps a finding is allowed to name", () => {
    expect(findingStepName(2)).toBe("Business Problem & Opportunity")
    expect(findingStepName(5)).toBe("Idea Overview")
  })

  it("returns an empty name for a step that is not in the flow", () => {
    expect(findingStepName(99)).toBe("")
  })
})
