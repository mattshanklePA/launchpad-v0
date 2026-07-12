import { describe, it, expect } from "vitest"
import { determineTopicArea, TOPIC_AREA_CATEGORIES } from "@/lib/useCaseTopicArea"

describe("determineTopicArea", () => {
  it("matches cybersecurity from problem/solution text", () => {
    const result = determineTopicArea({
      coreProblem: "Analysts spend hours triaging phishing alerts and potential intrusion attempts.",
      proposedSolution: "An AI tool that flags likely malware and cybersecurity threats for review.",
    })
    expect(result.value).toBe("cybersecurity")
    expect(result.categoryLabel).toBe("Cybersecurity")
    expect(result.reason).toMatch(/Cybersecurity/)
  })

  it("matches health and medical", () => {
    const result = determineTopicArea({
      coreProblem: "Clinical staff struggle to triage patient intake in the hospital.",
      solutionSummary: "An AI assistant that helps diagnose common conditions from patient history.",
    })
    expect(result.value).toBe("health_medical")
  })

  it("matches transportation", () => {
    const result = determineTopicArea({
      coreProblem: "Traffic planners can't predict highway congestion in real time.",
    })
    expect(result.value).toBe("transportation")
  })

  it("returns an empty value (never a guess) when nothing matches", () => {
    const result = determineTopicArea({
      coreProblem: "Something entirely unrelated to any listed category, in vague terms.",
    })
    expect(result.value).toBe("")
    expect(result.categoryLabel).toBeUndefined()
    expect(result.reason).toMatch(/no.*match/i)
  })

  it("returns an empty value when given no text at all", () => {
    const result = determineTopicArea({})
    expect(result.value).toBe("")
  })

  it("every category id is a valid non-empty FormData topicArea option", () => {
    for (const category of TOPIC_AREA_CATEGORIES) {
      expect(category.id).toBeTruthy()
    }
  })
})
