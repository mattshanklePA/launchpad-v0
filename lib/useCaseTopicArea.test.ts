import { describe, it, expect } from "vitest"
import { proposeUseCaseTopicArea, USE_CASE_TOPIC_AREAS } from "@/lib/useCaseTopicArea"

describe("proposeUseCaseTopicArea", () => {
  it("matches law enforcement / compliance language", () => {
    const result = proposeUseCaseTopicArea({
      coreProblem: "Investigators spend too long triaging compliance violations for enforcement action.",
    })
    expect(result.value).toBe("law_enforcement_compliance")
    expect(result.rationale).toMatch(/Law enforcement/i)
  })

  it("matches health & public safety language", () => {
    const result = proposeUseCaseTopicArea({
      coreProblem: "Staff need faster triage of public safety and emergency health reports.",
    })
    expect(result.value).toBe("health_safety")
  })

  it("returns an empty value with a flagged rationale when nothing matches", () => {
    const result = proposeUseCaseTopicArea({ coreProblem: "" })
    expect(result.value).toBe("")
    expect(result.rationale).toMatch(/couldn't confidently infer/i)
  })

  it("has no duplicate topic area ids", () => {
    const ids = USE_CASE_TOPIC_AREAS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
