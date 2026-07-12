import { describe, it, expect } from "vitest"
import {
  profileAutofill,
  getWizardDerivedOmbFields,
  proposeHighImpact,
  proposeAiClassification,
  proposeUseCaseTopicArea,
  proposeConsolidation,
  proposePublicIndicator,
  WIZARD_TO_OMB_FIELD_MAP,
} from "@/lib/ombAutofill"
import type { Session } from "@/lib/auth"

const baseSession: Session = {
  userId: "u1",
  email: "jane.doe@commerce.gov",
  name: "Jane Doe",
  role: "submitter",
  loggedInAt: "2026-01-01T00:00:00.000Z",
  jobRole: "product_owner",
  businessUnit: "census",
  office: "decennial",
}

describe("profileAutofill", () => {
  it("maps a session to submitter fields — zero typing", () => {
    const result = profileAutofill(baseSession)
    expect(result).toEqual({
      submitterName: "Jane Doe",
      submitterEmail: "jane.doe@commerce.gov",
      submitterRole: "product_owner",
      submitterOffice: "census",
      submitterSubOffice: "decennial",
    })
  })

  it("returns an empty object when there's no session — never fabricates a profile", () => {
    expect(profileAutofill(null)).toEqual({})
    expect(profileAutofill(undefined)).toEqual({})
  })

  it("falls back to empty strings for a session missing profile fields", () => {
    const result = profileAutofill({ ...baseSession, jobRole: undefined, businessUnit: undefined, office: undefined })
    expect(result.submitterRole).toBe("")
    expect(result.submitterOffice).toBe("")
    expect(result.submitterSubOffice).toBe("")
  })
})

describe("getWizardDerivedOmbFields", () => {
  it("reflects the wizard answer already captured for each OMB-mapped field — never re-asks", () => {
    const fd = {
      coreProblem: "Staff spend hours triaging inbound requests.",
      solutionSummary: "An AI assistant that ranks and routes requests.",
      businessValue: "Cuts triage time significantly.",
      involvesSensitiveData: "no" as const,
      aiModelSourcing: "american_built" as const,
      systemSource: "in_house" as const,
    }
    const result = getWizardDerivedOmbFields(fd)
    expect(result).toHaveLength(WIZARD_TO_OMB_FIELD_MAP.length)
    const problem = result.find((r) => r.formField === "coreProblem")
    expect(problem?.ombQuestion).toBe("What problem is the AI intended to solve?")
    expect(problem?.value).toBe(fd.coreProblem)
  })
})

describe("proposeHighImpact", () => {
  it("proposes yes with a rationale when a high-impact factor is flagged", () => {
    const result = proposeHighImpact({ highImpactFactors: ["safety"] })
    expect(result.value).toBe("yes")
    expect(result.rationale).toMatch(/safety/i)
  })

  it("proposes no with a rationale when nothing is flagged", () => {
    const result = proposeHighImpact({ highImpactFactors: [] })
    expect(result.value).toBe("no")
    expect(result.rationale.length).toBeGreaterThan(0)
  })
})

describe("proposeAiClassification", () => {
  it("proposes rights_impacting for a manually-flagged rights factor", () => {
    const result = proposeAiClassification({ highImpactFactors: ["rights"] })
    expect(result.value).toBe("rights_impacting")
  })

  it("proposes safety_impacting for a manually-flagged safety factor", () => {
    const result = proposeAiClassification({ highImpactFactors: ["safety"] })
    expect(result.value).toBe("safety_impacting")
  })

  it("proposes both when rights and safety factors are both present", () => {
    const result = proposeAiClassification({ highImpactFactors: ["rights", "safety"] })
    expect(result.value).toBe("both")
  })

  it("proposes not_classified when nothing is flagged or inferred", () => {
    const result = proposeAiClassification({ highImpactFactors: [] })
    expect(result.value).toBe("not_classified")
  })

  it("picks up an inferred rights signal (decisional AI) without a manual factor", () => {
    const result = proposeAiClassification({ highImpactFactors: [], aiDecisionalImpact: "yes" })
    expect(result.value).toBe("rights_impacting")
  })
})

describe("proposeUseCaseTopicArea (re-export)", () => {
  it("delegates to lib/useCaseTopicArea.ts", () => {
    const result = proposeUseCaseTopicArea({ coreProblem: "Cybersecurity incident response is too slow." })
    expect(result.value).toBe("cybersecurity_it")
  })
})

describe("proposeConsolidation (re-export)", () => {
  it("delegates to lib/ombConsolidation.ts's automatic determination", () => {
    const result = proposeConsolidation({
      highImpact: "no",
      coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
      proposedSolution: "An AI tool that triages and categorizes incoming email by urgency.",
    })
    expect(result.status).toBe("Consolidated")
    expect(result.category).toBe("email_triage")
  })
})

describe("proposePublicIndicator", () => {
  it("defaults to public when no sensitive-data signal is present", () => {
    const result = proposePublicIndicator({ involvesSensitiveData: "no" })
    expect(result.value).toBe("public")
  })

  it("defaults to excluded when PII/sensitive data is involved", () => {
    const result = proposePublicIndicator({ involvesSensitiveData: "yes" })
    expect(result.value).toBe("excluded")
    expect(result.rationale).toMatch(/PII/i)
  })

  it("defaults to excluded for a Controlled classification even without PII", () => {
    const result = proposePublicIndicator({ involvesSensitiveData: "no", securityClassification: "controlled" })
    expect(result.value).toBe("excluded")
  })

  it("defaults to excluded for a flagged National Security System / IC use", () => {
    const result = proposePublicIndicator({ involvesSensitiveData: "no", nationalSecuritySystem: "yes" })
    expect(result.value).toBe("excluded")
  })
})
