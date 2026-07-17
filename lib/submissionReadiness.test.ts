import { describe, it, expect } from "vitest"
import { getSubmissionReadiness } from "@/lib/submissionReadiness"
import { initialFormData, type FormData } from "@/lib/steps"

// A submission with every idea-gate-required field filled, and the OMB/
// M-25-21/RMF governance fields left at their initial (unanswered) state —
// each test below layers on just enough governance-field state to exercise
// one showWhen gate at a time. Since issue #160, none of these governance
// fields are required to submit an idea — they only ever show up in
// `governanceMissing`, never `missing`/`canSubmit`.
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

describe("getSubmissionReadiness — idea gate never blocks on governance fields (issue #160)", () => {
  it("can submit as an idea with every OMB/M-25-21/RMF governance field blank", () => {
    const { canSubmit, missing } = getSubmissionReadiness(baseComplete())
    expect(missing).toEqual([])
    expect(canSubmit).toBe(true)
  })

  it("still surfaces unanswered, currently-applicable governance fields in governanceMissing", () => {
    const { governanceMissing } = getSubmissionReadiness(baseComplete({ stageOfDevelopment: "" }))
    expect(governanceMissing.some((m) => m.field === "stageOfDevelopment")).toBe(true)
  })

  it("never lets a governance field block canSubmit even when governanceMissing is non-empty", () => {
    const { canSubmit, missing, governanceMissing } = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "deployed", highImpact: "high_impact" }),
    )
    expect(governanceMissing.length).toBeGreaterThan(0)
    expect(missing).toEqual([])
    expect(canSubmit).toBe(true)
  })
})

describe("getSubmissionReadiness — governanceMissing OMB field coverage (issue #61, re-scoped by #160)", () => {
  it("does not demand topicArea/aiClassification before a development stage is chosen", () => {
    const { governanceMissing } = getSubmissionReadiness(baseComplete({ stageOfDevelopment: "" }))
    // stageOfDevelopment itself is always tracked as a governance field...
    expect(governanceMissing.some((m) => m.field === "stageOfDevelopment")).toBe(true)
    // ...but topicArea/aiClassification are gated on it being set at all.
    expect(governanceMissing.some((m) => m.field === "topicArea")).toBe(false)
    expect(governanceMissing.some((m) => m.field === "aiClassification")).toBe(false)
  })

  it("demands topicArea/aiClassification once a development stage is set, but not the pilot/deployed-only fields", () => {
    const { governanceMissing } = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "pre_deployment", highImpact: "not_high_impact" }),
    )
    expect(governanceMissing.some((m) => m.field === "topicArea")).toBe(true)
    expect(governanceMissing.some((m) => m.field === "aiClassification")).toBe(true)
    // Pre-deployment has nothing running yet — these stay ungated.
    expect(governanceMissing.some((m) => m.field === "hasATO")).toBe(false)
    expect(governanceMissing.some((m) => m.field === "systemSource")).toBe(false)
    expect(governanceMissing.some((m) => m.field === "hasPii")).toBe(false)
    expect(governanceMissing.some((m) => m.field === "customCode")).toBe(false)
  })

  it("demands the pilot/deployed-only fields once the stage advances", () => {
    const { governanceMissing } = getSubmissionReadiness(
      baseComplete({
        stageOfDevelopment: "pilot",
        highImpact: "not_high_impact",
        topicArea: "administrative_functions",
        aiClassification: "generative_ai",
      }),
    )
    expect(governanceMissing.some((m) => m.field === "hasATO")).toBe(true)
    expect(governanceMissing.some((m) => m.field === "systemSource")).toBe(true)
    expect(governanceMissing.some((m) => m.field === "hasPii")).toBe(true)
    expect(governanceMissing.some((m) => m.field === "customCode")).toBe(true)
    expect(governanceMissing.some((m) => m.field === "trainingDataDescription")).toBe(true)
    expect(governanceMissing.some((m) => m.field === "demographicFeatures")).toBe(true)
  })

  it("never demands the always-optional fields (Federal Data Catalog, PIA, open source links)", () => {
    const { governanceMissing } = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "deployed", highImpact: "not_high_impact" }),
    )
    expect(governanceMissing.some((m) => m.field === "federalDataCatalogLink")).toBe(false)
    expect(governanceMissing.some((m) => m.field === "piaLink")).toBe(false)
    expect(governanceMissing.some((m) => m.field === "openSourceCodeLink")).toBe(false)
  })

  it("does not demand the 9 high-impact minimum-practice fields unless high-impact AND deployed", () => {
    const notHighImpactDeployed = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "deployed", highImpact: "not_high_impact" }),
    )
    expect(notHighImpactDeployed.governanceMissing.some((m) => m.field === "preDeploymentTesting")).toBe(false)
    expect(notHighImpactDeployed.governanceMissing.some((m) => m.field === "publicConsultationSteps")).toBe(false)

    const highImpactNotDeployed = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "pilot", highImpact: "high_impact" }),
    )
    expect(highImpactNotDeployed.governanceMissing.some((m) => m.field === "preDeploymentTesting")).toBe(false)
  })

  it("demands all 9 high-impact minimum-practice fields once high-impact AND deployed", () => {
    const { governanceMissing } = getSubmissionReadiness(
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
      expect(governanceMissing.some((m) => m.field === field)).toBe(true)
    }
  })

  it("only demands highImpactJustification when highImpact is 'presumed but determined not'", () => {
    const notPresumed = getSubmissionReadiness(baseComplete({ highImpact: "not_high_impact" }))
    expect(notPresumed.governanceMissing.some((m) => m.field === "highImpactJustification")).toBe(false)

    const presumed = getSubmissionReadiness(baseComplete({ highImpact: "presumed_not_high_impact" }))
    expect(presumed.governanceMissing.some((m) => m.field === "highImpactJustification")).toBe(true)
  })

  it("only demands atoSystemName once hasATO is yes and the stage is pilot/deployed", () => {
    const noAto = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "pilot", highImpact: "not_high_impact", hasATO: "no" }),
    )
    expect(noAto.governanceMissing.some((m) => m.field === "atoSystemName")).toBe(false)

    const withAto = getSubmissionReadiness(
      baseComplete({ stageOfDevelopment: "pilot", highImpact: "not_high_impact", hasATO: "yes" }),
    )
    expect(withAto.governanceMissing.some((m) => m.field === "atoSystemName")).toBe(true)
  })

  it("has no governanceMissing left once every currently-applicable governance field is filled", () => {
    const { governanceMissing } = getSubmissionReadiness(
      baseComplete({
        stageOfDevelopment: "pre_deployment",
        highImpact: "not_high_impact",
        topicArea: "administrative_functions",
        aiClassification: "generative_ai",
      }),
    )
    expect(governanceMissing).toEqual([])
  })
})
