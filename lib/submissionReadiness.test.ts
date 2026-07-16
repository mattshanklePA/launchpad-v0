import { describe, it, expect } from "vitest"
import { getSubmissionReadiness } from "@/lib/submissionReadiness"
import { initialFormData, type FormData } from "@/lib/steps"

// A submission with every non-OMB required field filled, and the OMB fields
// left at their initial (unanswered) state — each test below layers on just
// enough OMB state to exercise one showWhen gate at a time.
function baseComplete(overrides: Partial<FormData> = {}): FormData {
  return {
    ...initialFormData,
    submitterName: "Jane Doe",
    submitterEmail: "jane@example.gov",
    submitterRole: "product_owner",
    submitterOffice: "census",
    useCaseTitle: "AI Assisted Triage",
    useCaseDescription: "Helps staff triage incoming requests faster.",
    isWithheld: "no",
    coreProblem: "Staff spend too long manually triaging requests.",
    severity: "medium",
    affectedSystem: "cross_functional",
    targetAudience: "product_owner",
    impactedUsersCount: "50_500",
    targetUserContext: "Front-line staff across several offices.",
    proposedSolution: "An AI tool that ranks incoming requests by urgency.",
    userValue: "Saves staff time on manual triage.",
    userTimeSavings: "1_5",
    businessValue: "Reduces backlog and improves response time.",
    costSavings: "50k_250k",
    relevantOkrs: "Supports the modernization OKR.",
    usptoFocusArea: ["digital_transformation"],
    dependencies: "Needs access to the ticketing system API.",
    implementationComplexity: "medium",
    involvesSensitiveData: "no",
    aiDecisionalImpact: "no",
    aiModelSourcing: "american_built",
    aiHumanReview: "yes",
    dataReadiness: "ai_ready",
    impactLevel: "unclassified",
    trl: "6",
    successMetrics: "Backlog age drops below 2 days.",
    timelineForResults: "3_6",
    readinessScore: "ready",
    ...overrides,
  }
}

describe("getSubmissionReadiness — OMB field coverage (issue #61)", () => {
  it("does not demand topicArea/aiClassification before a development stage is chosen", () => {
    const { missing } = getSubmissionReadiness(baseComplete({ stageOfDevelopment: "" }))
    // stageOfDevelopment itself is always required...
    expect(missing.some((m) => m.field === "stageOfDevelopment")).toBe(true)
    // ...but topicArea/aiClassification are gated on it being set at all.
    expect(missing.some((m) => m.field === "topicArea")).toBe(false)
    expect(missing.some((m) => m.field === "aiClassification")).toBe(false)
  })

  it("demands topicArea/aiClassification once a development stage is set, but not the pilot/deployed-only fields", () => {
    const { missing } = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "pre_deployment", highImpact: "not_high_impact" }),
    )
    expect(missing.some((m) => m.field === "topicArea")).toBe(true)
    expect(missing.some((m) => m.field === "aiClassification")).toBe(true)
    // Pre-deployment has nothing running yet — these stay ungated.
    expect(missing.some((m) => m.field === "hasATO")).toBe(false)
    expect(missing.some((m) => m.field === "systemSource")).toBe(false)
    expect(missing.some((m) => m.field === "hasPii")).toBe(false)
    expect(missing.some((m) => m.field === "customCode")).toBe(false)
  })

  it("demands the pilot/deployed-only fields once the stage advances", () => {
    const { missing } = getSubmissionReadiness(
      baseComplete({
        stageOfDevelopment: "pilot",
        highImpact: "not_high_impact",
        topicArea: "administrative_functions",
        aiClassification: "generative_ai",
      }),
    )
    expect(missing.some((m) => m.field === "hasATO")).toBe(true)
    expect(missing.some((m) => m.field === "systemSource")).toBe(true)
    expect(missing.some((m) => m.field === "hasPii")).toBe(true)
    expect(missing.some((m) => m.field === "customCode")).toBe(true)
    expect(missing.some((m) => m.field === "trainingDataDescription")).toBe(true)
    expect(missing.some((m) => m.field === "demographicFeatures")).toBe(true)
  })

  it("never demands the always-optional fields (Federal Data Catalog, PIA, open source links)", () => {
    const { missing } = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "deployed", highImpact: "not_high_impact" }),
    )
    expect(missing.some((m) => m.field === "federalDataCatalogLink")).toBe(false)
    expect(missing.some((m) => m.field === "piaLink")).toBe(false)
    expect(missing.some((m) => m.field === "openSourceCodeLink")).toBe(false)
  })

  it("does not demand the 9 high-impact minimum-practice fields unless high-impact AND deployed", () => {
    const notHighImpactDeployed = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "deployed", highImpact: "not_high_impact" }),
    )
    expect(notHighImpactDeployed.missing.some((m) => m.field === "preDeploymentTesting")).toBe(false)
    expect(notHighImpactDeployed.missing.some((m) => m.field === "publicConsultationSteps")).toBe(false)

    const highImpactNotDeployed = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "pilot", highImpact: "high_impact" }),
    )
    expect(highImpactNotDeployed.missing.some((m) => m.field === "preDeploymentTesting")).toBe(false)
  })

  it("demands all 9 high-impact minimum-practice fields once high-impact AND deployed", () => {
    const { missing } = getSubmissionReadiness(
      baseComplete({
        stageOfDevelopment: "deployed",
        highImpact: "high_impact",
        topicArea: "administrative_functions",
        aiClassification: "generative_ai",
      }),
    )
    const expectedFields = [
      "preDeploymentTesting",
      "aiImpactAssessmentCompleted",
      "aiImpactAssessment",
      "independentReviewConducted",
      "ongoingMonitoringPlan",
      "operatorTrainingEstablished",
      "failSafeMechanism",
      "humanOversightAppeal",
      "publicConsultationSteps",
    ]
    for (const field of expectedFields) {
      expect(missing.some((m) => m.field === field)).toBe(true)
    }
  })

  it("only demands highImpactJustification when highImpact is 'presumed but determined not'", () => {
    const notPresumed = getSubmissionReadiness(baseComplete({ highImpact: "not_high_impact" }))
    expect(notPresumed.missing.some((m) => m.field === "highImpactJustification")).toBe(false)

    const presumed = getSubmissionReadiness(baseComplete({ highImpact: "presumed_not_high_impact" }))
    expect(presumed.missing.some((m) => m.field === "highImpactJustification")).toBe(true)
  })

  it("only demands atoSystemName once hasATO is yes and the stage is pilot/deployed", () => {
    const noAto = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "pilot", highImpact: "not_high_impact", hasATO: "no" }),
    )
    expect(noAto.missing.some((m) => m.field === "atoSystemName")).toBe(false)

    const withAto = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "pilot", highImpact: "not_high_impact", hasATO: "yes" }),
    )
    expect(withAto.missing.some((m) => m.field === "atoSystemName")).toBe(true)
  })

  it("can submit once every currently-applicable field (OMB included) is filled and the AI verdict is ready", () => {
    const { canSubmit, missing } = getSubmissionReadiness(
      baseComplete({
        stageOfDevelopment: "pre_deployment",
        highImpact: "not_high_impact",
        topicArea: "administrative_functions",
        aiClassification: "generative_ai",
      }),
    )
    expect(missing).toEqual([])
    expect(canSubmit).toBe(true)
  })
})
