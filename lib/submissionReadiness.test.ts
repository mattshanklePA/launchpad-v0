import { describe, it, expect, afterEach } from "vitest"
import { setCachedFormConfig } from "@/lib/dataCache"
import { getSubmissionReadiness } from "@/lib/submissionReadiness"
import { initialFormData, type FormData } from "@/lib/steps"

afterEach(() => {
  setCachedFormConfig({ enabled: {}, mandatory: {}, updatedAt: new Date(0).toISOString() })
})

// A fully-answered, non-high-impact submission — every currently-applicable
// required field filled in, so `canSubmit` should be true and "still needed"
// empty. Individual tests blank out one field at a time to probe specific
// missing-list behavior.
function completeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    ...initialFormData,
    submitterName: "Jane Doe",
    submitterEmail: "jane.doe@commerce.gov",
    submitterRole: "product_owner",
    submitterOffice: "census",
    useCaseTitle: "Inbox Triage Assistant",
    useCaseDescription: "Ranks and routes inbound requests by urgency.",
    publicIndicator: "public",
    coreProblem: "Staff spend hours a day manually triaging inbound requests.",
    severity: "medium",
    affectedSystem: "it_systems",
    targetAudience: "developer",
    impactedUsersCount: "10_50",
    targetUserContext: "Frontline staff triaging requests during business hours.",
    proposedSolution: "An AI assistant that ranks and routes inbound requests.",
    userValue: "Frees up staff time for higher-value work.",
    userTimeSavings: "1_5",
    businessValue: "Reduces backlog and improves response time.",
    costSavings: "50k_250k",
    relevantOkrs: "Supports the modernization OKR for FY26.",
    usptoFocusArea: ["ocio"],
    dependencies: "Requires access to the ticketing system API.",
    implementationComplexity: "medium",
    involvesSensitiveData: "no",
    aiDecisionalImpact: "no",
    aiModelSourcing: "american_built",
    aiHumanReview: "yes",
    dataReadiness: "ai_ready",
    impactLevel: "unclassified",
    trl: "6",
    stageOfDevelopment: "pilot",
    highImpact: "no",
    hasATO: "yes",
    systemSource: "in_house",
    nationalSecuritySystem: "no",
    researchOnly: "no",
    useCaseTopicArea: "internal_operations",
    aiClassification: "not_classified",
    successMetrics: "Reduction in average triage time.",
    timelineForResults: "3_6",
    readinessScore: "ready",
    readinessSummary: "Looks solid.",
    executiveSummary: "Exec summary.",
    ...overrides,
  }
}

describe("getSubmissionReadiness", () => {
  it("allows submission once every currently-applicable field is filled", () => {
    const readiness = getSubmissionReadiness(completeFormData())
    expect(readiness.canSubmit).toBe(true)
    expect(readiness.missing).toEqual([])
  })

  it("excludes the high-impact risk-management fields when the submission isn't high-impact", () => {
    const fd = completeFormData({
      highImpact: "no",
      aiImpactAssessment: "",
      preDeploymentTesting: "",
      ongoingMonitoringPlan: "",
      humanOversightAppeal: "",
    })
    const readiness = getSubmissionReadiness(fd)
    expect(readiness.canSubmit).toBe(true)
    expect(readiness.missing.some((m) => m.field === "aiImpactAssessment")).toBe(false)
    expect(readiness.missing.some((m) => m.field === "preDeploymentTesting")).toBe(false)
  })

  it("requires the high-impact risk-management fields once the submission is marked high-impact", () => {
    const fd = completeFormData({
      highImpact: "yes",
      aiImpactAssessment: "",
      preDeploymentTesting: "",
      ongoingMonitoringPlan: "",
      humanOversightAppeal: "",
    })
    const readiness = getSubmissionReadiness(fd)
    expect(readiness.canSubmit).toBe(false)
    const missingFields = readiness.missing.map((m) => m.field)
    expect(missingFields).toEqual(
      expect.arrayContaining(["aiImpactAssessment", "preDeploymentTesting", "ongoingMonitoringPlan", "humanOversightAppeal"]),
    )
  })

  it("lists a blank AI-proposed OMB field (e.g. useCaseTopicArea) as still needed", () => {
    const fd = completeFormData({ useCaseTopicArea: "" })
    const readiness = getSubmissionReadiness(fd)
    expect(readiness.canSubmit).toBe(false)
    expect(readiness.missing.some((m) => m.field === "useCaseTopicArea")).toBe(true)
  })

  it("doesn't list a prefilled/confirmed AI-proposed field as still needed", () => {
    const fd = completeFormData({ aiClassification: "rights_impacting" })
    const readiness = getSubmissionReadiness(fd)
    expect(readiness.missing.some((m) => m.field === "aiClassification")).toBe(false)
  })

  it("drops a disabled field from both the missing list and the completeness denominator", () => {
    const withField = getSubmissionReadiness(completeFormData({ useCaseTopicArea: "" }))
    expect(withField.missing.some((m) => m.field === "useCaseTopicArea")).toBe(true)

    setCachedFormConfig({ enabled: { useCaseTopicArea: false }, mandatory: {}, updatedAt: new Date(0).toISOString() })
    const withoutField = getSubmissionReadiness(completeFormData({ useCaseTopicArea: "" }))
    expect(withoutField.missing.some((m) => m.field === "useCaseTopicArea")).toBe(false)
    expect(withoutField.totalChecks).toBe(withField.totalChecks - 1)
  })
})
