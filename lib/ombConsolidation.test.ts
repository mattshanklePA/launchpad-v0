import { describe, it, expect } from "vitest"
import { determineConsolidation, resolveConsolidation, CONSOLIDATION_CATEGORIES } from "@/lib/ombConsolidation"

describe("determineConsolidation", () => {
  it("classifies a category match as Consolidated and surfaces which category matched", () => {
    const result = determineConsolidation({
      highImpact: "no",
      useCaseTitle: "Inbox Assistant",
      coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
      proposedSolution: "An AI tool that triages and categorizes incoming email by urgency.",
    })
    expect(result.status).toBe("Consolidated")
    expect(result.category).toBe("email_triage")
    expect(result.categoryLabel).toBe("Email prioritization & categorization")
    expect(result.reason).toMatch(/Email prioritization & categorization/)
  })

  it("matches the code generation category", () => {
    const result = determineConsolidation({
      highImpact: "no",
      useCaseTitle: "Dev Copilot",
      coreProblem: "Engineers spend too long writing boilerplate code.",
      solutionSummary: "An AI coding assistant that helps generate code from natural-language prompts.",
    })
    expect(result.status).toBe("Consolidated")
    expect(result.category).toBe("code_generation")
  })

  it("is Individual for a use case that doesn't match any widely-used commercial AI category", () => {
    const result = determineConsolidation({
      highImpact: "no",
      useCaseTitle: "Patent Triage Assistant",
      coreProblem: "Examiners spend too long triaging incoming patent applications for prior art conflicts.",
      solutionSummary: "Ranks incoming patent applications by urgency and prior-art risk for examiner review.",
    })
    expect(result.status).toBe("Individual")
    expect(result.category).toBeUndefined()
    expect(result.reason).toMatch(/does not match/i)
  })

  it("forces Individual for high-impact use cases even when a category matches", () => {
    const result = determineConsolidation({
      highImpact: "yes",
      useCaseTitle: "Inbox Assistant",
      coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
      proposedSolution: "An AI tool that triages and categorizes incoming email by urgency.",
    })
    expect(result.status).toBe("Individual")
    expect(result.category).toBe("email_triage")
    expect(result.reason).toMatch(/high-impact/i)
  })

  it("forces Individual for high-impact use cases with no category match", () => {
    const result = determineConsolidation({
      highImpact: "yes",
      useCaseTitle: "Benefits Eligibility Model",
      coreProblem: "Determines applicant eligibility for a federal assistance program.",
    })
    expect(result.status).toBe("Individual")
    expect(result.category).toBeUndefined()
    expect(result.reason).toMatch(/high-impact/i)
  })

  it("has no duplicate category ids", () => {
    const ids = CONSOLIDATION_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("resolveConsolidation", () => {
  const emailFixture = {
    highImpact: "no" as const,
    useCaseTitle: "Inbox Assistant",
    coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
    proposedSolution: "An AI tool that triages and categorizes incoming email by urgency.",
  }

  it("trusts the automatic determination when there's no override", () => {
    const result = resolveConsolidation(emailFixture)
    expect(result.status).toBe("Consolidated")
  })

  it("honors an 'individual' override on an otherwise-consolidated match", () => {
    const result = resolveConsolidation({ ...emailFixture, consolidationOverride: "individual" })
    expect(result.status).toBe("Individual")
    expect(result.category).toBe("email_triage")
    expect(result.reason).toMatch(/manually reported individually/i)
  })

  it("honors a 'consolidated' override when there's a category match to consolidate under", () => {
    const result = resolveConsolidation({
      highImpact: "no",
      useCaseTitle: "Dev Copilot",
      coreProblem: "Engineers spend too long writing boilerplate code.",
      solutionSummary: "An AI coding assistant that helps generate code from natural-language prompts.",
      consolidationOverride: "consolidated",
    })
    // Auto call is already Consolidated in this fixture — override is a no-op,
    // still ends up Consolidated either way.
    expect(result.status).toBe("Consolidated")
  })

  it("ignores a 'consolidated' override when there's no category match to consolidate under", () => {
    const result = resolveConsolidation({
      highImpact: "no",
      useCaseTitle: "Patent Triage Assistant",
      coreProblem: "Examiners spend too long triaging incoming patent applications for prior art conflicts.",
      consolidationOverride: "consolidated",
    })
    expect(result.status).toBe("Individual")
    expect(result.category).toBeUndefined()
  })

  it("never lets an override force a high-impact use case to Consolidated (OMB M-25-21 override)", () => {
    const result = resolveConsolidation({ ...emailFixture, highImpact: "yes", consolidationOverride: "consolidated" })
    expect(result.status).toBe("Individual")
  })
})
