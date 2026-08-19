import { describe, it, expect } from "vitest"
import { determineConsolidation, consolidatedReportableEntryCount, CONSOLIDATION_CATEGORIES } from "@/lib/ombConsolidation"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"

function sub(id: string, formData: Partial<FormData>): Submission {
  return { id, submittedAt: new Date(0).toISOString(), formData: { ...initialFormData, ...formData } as FormData }
}

describe("determineConsolidation", () => {
  it("classifies a category match as Consolidated and surfaces which category matched", () => {
    const result = determineConsolidation({
      highImpact: "not_high_impact",
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
      highImpact: "not_high_impact",
      useCaseTitle: "Dev Copilot",
      coreProblem: "Engineers spend too long writing boilerplate code.",
      solutionSummary: "An AI coding assistant that helps generate code from natural-language prompts.",
    })
    expect(result.status).toBe("Consolidated")
    expect(result.category).toBe("code_generation")
  })

  it("is Individual for a use case that doesn't match any widely-used commercial AI category", () => {
    const result = determineConsolidation({
      highImpact: "not_high_impact",
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
      highImpact: "high_impact",
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
      highImpact: "high_impact",
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

describe("consolidatedReportableEntryCount", () => {
  const codeGen: Partial<FormData> = {
    useCaseTitle: "Dev Copilot",
    coreProblem: "Engineers spend too long writing boilerplate code.",
    solutionSummary: "An AI coding assistant that helps generate code from natural-language prompts.",
    highImpact: "not_high_impact",
  }
  const noMatch: Partial<FormData> = {
    useCaseTitle: "Benefits Eligibility Model",
    coreProblem: "Determines applicant eligibility for a federal assistance program.",
    highImpact: "not_high_impact",
  }

  it("counts every individually-reported submission once", () => {
    expect(consolidatedReportableEntryCount([sub("s1", noMatch), sub("s2", noMatch)])).toBe(2)
  })

  it("counts every submission matching the same category as a single entry (RD-8, issue #218)", () => {
    // Same real number BureauRollup's own summary line and the /rollup meta
    // line both render — two code-generation matches consolidate to one
    // entry, plus the one individually-reported submission.
    const count = consolidatedReportableEntryCount([
      sub("s1", codeGen),
      sub("s2", { ...codeGen, useCaseTitle: "Dev Copilot 2" }),
      sub("s3", noMatch),
    ])
    expect(count).toBe(2)
  })

  it("is 0 for an empty set", () => {
    expect(consolidatedReportableEntryCount([])).toBe(0)
  })
})
