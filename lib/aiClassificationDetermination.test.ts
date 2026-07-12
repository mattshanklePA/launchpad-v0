import { describe, it, expect } from "vitest"
import { determineAiClassification } from "@/lib/aiClassificationDetermination"

describe("determineAiClassification", () => {
  it("matches generative AI", () => {
    const result = determineAiClassification({
      proposedSolution: "A chatbot that uses a large language model to draft first-pass responses.",
    })
    expect(result.value).toBe("generative_ai")
    expect(result.categoryLabel).toBe("Generative AI")
  })

  it("matches computer vision", () => {
    const result = determineAiClassification({
      coreProblem: "Manual image recognition of damaged equipment in photos is slow.",
    })
    expect(result.value).toBe("computer_vision")
  })

  it("matches agentic AI before falling through to generative", () => {
    const result = determineAiClassification({
      proposedSolution: "An autonomous agent that plans and executes multi-step tasks using an LLM.",
    })
    expect(result.value).toBe("agentic_ai")
  })

  it("matches natural language processing", () => {
    const result = determineAiClassification({
      coreProblem: "Staff manually read documents to perform entity extraction and sentiment analysis.",
    })
    expect(result.value).toBe("nlp")
  })

  it("matches classical/predictive ML as the broad fallback", () => {
    const result = determineAiClassification({
      proposedSolution: "A predictive model that forecasts equipment failure using a regression model.",
    })
    expect(result.value).toBe("classical_predictive_ml")
  })

  it("returns an empty value (never a guess) when nothing matches", () => {
    const result = determineAiClassification({ coreProblem: "A vague idea with no technical detail." })
    expect(result.value).toBe("")
    expect(result.reason).toMatch(/no.*match/i)
  })
})
