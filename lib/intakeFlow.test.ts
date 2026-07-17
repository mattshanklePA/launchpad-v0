import { describe, it, expect } from "vitest"
import { INTAKE_TOPICS, isTopicCaptured, nextIntakeTopic, intakeMinimumMet } from "@/lib/intakeFlow"
import { initialFormData, type FormData } from "@/lib/steps"

function withFields(patch: Partial<FormData>): FormData {
  return { ...initialFormData, ...patch }
}

describe("INTAKE_TOPICS", () => {
  it("covers exactly the bare-minimum idea fields named in issue #169, in order", () => {
    expect(INTAKE_TOPICS.map((t) => t.id)).toEqual(["problem", "affectedUnits", "audience", "solutionBenefits"])
  })
})

describe("isTopicCaptured", () => {
  it("is false when a topic's field is empty", () => {
    expect(isTopicCaptured(INTAKE_TOPICS[0], initialFormData)).toBe(false)
  })

  it("is true once the field has content", () => {
    const fd = withFields({ problemDefinition: "The backlog is growing." })
    expect(isTopicCaptured(INTAKE_TOPICS[0], fd)).toBe(true)
  })

  it("treats an empty array field as not captured", () => {
    const fd = withFields({ affectedBusinessUnits: [] })
    expect(isTopicCaptured(INTAKE_TOPICS[1], fd)).toBe(false)
  })

  it("requires every field on a multi-field topic before it counts as captured", () => {
    const solutionBenefits = INTAKE_TOPICS[3]
    const partial = withFields({ solutionSummary: "We'd build an assistant.", userValue: "Faster triage." })
    expect(isTopicCaptured(solutionBenefits, partial)).toBe(false)

    const full = withFields({ ...partial, businessValue: "Lower backlog costs." })
    expect(isTopicCaptured(solutionBenefits, full)).toBe(true)
  })
})

describe("nextIntakeTopic", () => {
  it("returns the first uncaptured topic", () => {
    expect(nextIntakeTopic(initialFormData)?.id).toBe("problem")
  })

  it("skips a topic captured out of order (e.g. via a manual record edit)", () => {
    const fd = withFields({ deliveryAudience: "internal" })
    expect(nextIntakeTopic(fd)?.id).toBe("problem")
  })

  it("returns null once every topic is captured", () => {
    const fd = withFields({
      problemDefinition: "Problem summary.",
      affectedBusinessUnits: ["patents"],
      deliveryAudience: "internal",
      solutionSummary: "Solution summary.",
      userValue: "User benefit.",
      businessValue: "Business benefit.",
    })
    expect(nextIntakeTopic(fd)).toBeNull()
  })
})

describe("intakeMinimumMet", () => {
  it("is false for a fresh form", () => {
    expect(intakeMinimumMet(initialFormData)).toBe(false)
  })

  it("is true once every light field has content", () => {
    const fd = withFields({
      problemDefinition: "Problem summary.",
      affectedBusinessUnits: ["patents"],
      deliveryAudience: "external",
      solutionSummary: "Solution summary.",
      userValue: "User benefit.",
      businessValue: "Business benefit.",
    })
    expect(intakeMinimumMet(fd)).toBe(true)
  })
})
