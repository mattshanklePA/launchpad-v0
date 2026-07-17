import { describe, it, expect } from "vitest"
import { initialFormData } from "@/lib/steps"
import {
  computeRmfProfile,
  rmfBadgeClass,
  rmfFunctionStatusBadgeClass,
  type RmfInputs,
} from "@/lib/nistRmf"

const noDeptTier = { features: {} } as any
const deptTier = { features: { departmentFinalApproval: true } } as any

function fd(overrides: Partial<RmfInputs> = {}): RmfInputs {
  return { ...initialFormData, ...overrides }
}

describe("computeRmfProfile — Govern", () => {
  it("is not_yet_applicable when nothing has been submitted yet", () => {
    const { functions } = computeRmfProfile(fd(), noDeptTier)
    expect(functions.govern.status).toBe("not_yet_applicable")
  })

  it("is gap when still a draft/submitted with no ATO or disclosure answer", () => {
    const { functions } = computeRmfProfile(
      fd({ stageOfDevelopment: "pre_deployment", reviewStatus: "submitted" }),
      noDeptTier,
    )
    expect(functions.govern.status).toBe("gap")
  })

  it("is partial once in review, even with nothing else answered", () => {
    const { functions } = computeRmfProfile(
      fd({ stageOfDevelopment: "pre_deployment", reviewStatus: "in_review" }),
      noDeptTier,
    )
    expect(functions.govern.status).toBe("partial")
  })

  it("is partial when approved but missing bureau sign-off", () => {
    const { functions } = computeRmfProfile(
      fd({
        stageOfDevelopment: "pilot",
        reviewStatus: "approved",
        hasATO: "no",
        isWithheld: "no",
      }),
      noDeptTier,
    )
    expect(functions.govern.status).toBe("partial")
    expect(functions.govern.reasons.some((r) => /bureau sign-off/i.test(r))).toBe(true)
  })

  it("is covered when approved with sign-off, ATO, and disclosure decision on file (no department tier)", () => {
    const { functions } = computeRmfProfile(
      fd({
        stageOfDevelopment: "deployed",
        reviewStatus: "approved",
        bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "x", signedOffByEmail: "x@nist.gov", signedOffAt: "2026-01-01" },
        hasATO: "yes",
        atoSystemName: "Kestrel Prod",
        isWithheld: "no",
      }),
      noDeptTier,
    )
    expect(functions.govern.status).toBe("covered")
  })

  it("requires department approval too once that tenant tier is enabled", () => {
    const base = fd({
      stageOfDevelopment: "deployed",
      reviewStatus: "approved",
      bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "x", signedOffByEmail: "x@nist.gov", signedOffAt: "2026-01-01" },
      hasATO: "no",
      isWithheld: "no",
    })
    expect(computeRmfProfile(base, deptTier).functions.govern.status).toBe("partial")
    expect(
      computeRmfProfile(
        { ...base, departmentApproval: { decision: "approved", byName: "y", byEmail: "y@doc.gov", at: "2026-01-02" } },
        deptTier,
      ).functions.govern.status,
    ).toBe("covered")
  })

  it("treats hasATO === yes with no system name as unanswered", () => {
    const { functions } = computeRmfProfile(
      fd({
        stageOfDevelopment: "deployed",
        reviewStatus: "approved",
        bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "x", signedOffByEmail: "x@nist.gov", signedOffAt: "2026-01-01" },
        hasATO: "yes",
        atoSystemName: "",
        isWithheld: "no",
      }),
      noDeptTier,
    )
    expect(functions.govern.status).toBe("partial")
  })
})

describe("computeRmfProfile — Map", () => {
  it("is not_yet_applicable when nothing has been submitted yet", () => {
    expect(computeRmfProfile(fd()).functions.map.status).toBe("not_yet_applicable")
  })

  it("is not_yet_applicable once retired", () => {
    expect(computeRmfProfile(fd({ stageOfDevelopment: "retired" })).functions.map.status).toBe(
      "not_yet_applicable",
    )
  })

  it("is gap when none of the mapped fields are answered", () => {
    expect(computeRmfProfile(fd({ stageOfDevelopment: "pre_deployment" })).functions.map.status).toBe(
      "gap",
    )
  })

  it("is partial when some but not all mapped fields are answered", () => {
    const { functions } = computeRmfProfile(
      fd({ stageOfDevelopment: "pre_deployment", topicArea: "cybersecurity", coreProblem: "Manual triage is slow." }),
    )
    expect(functions.map.status).toBe("partial")
  })

  it("is covered once topic, classification, problem/value/solution, high-impact, dissemination, and scalability are all answered", () => {
    const { functions } = computeRmfProfile(
      fd({
        stageOfDevelopment: "pilot",
        topicArea: "cybersecurity",
        aiClassification: "generative_ai",
        coreProblem: "Manual triage is slow.",
        businessValue: "Frees up analyst time.",
        solutionSummary: "Ranks alerts by severity.",
        highImpact: "not_high_impact",
        disseminatesToPublic: "no",
        scalable: "yes",
      }),
    )
    expect(functions.map.status).toBe("covered")
  })

  it("is partial when topic/classification/problem/value/solution/high-impact are answered but dissemination or scalability is not", () => {
    const { functions } = computeRmfProfile(
      fd({
        stageOfDevelopment: "pilot",
        topicArea: "cybersecurity",
        aiClassification: "generative_ai",
        coreProblem: "Manual triage is slow.",
        businessValue: "Frees up analyst time.",
        solutionSummary: "Ranks alerts by severity.",
        highImpact: "not_high_impact",
        disseminatesToPublic: "no",
        // scalable left blank
      }),
    )
    expect(functions.map.status).toBe("partial")
  })

  it("counts a 'no' answer as answered, not just 'yes' — the question is whether it was assessed", () => {
    const { functions } = computeRmfProfile(
      fd({
        stageOfDevelopment: "pilot",
        topicArea: "cybersecurity",
        aiClassification: "generative_ai",
        coreProblem: "Manual triage is slow.",
        businessValue: "Frees up analyst time.",
        solutionSummary: "Ranks alerts by severity.",
        highImpact: "not_high_impact",
        disseminatesToPublic: "no",
        scalable: "no",
      }),
    )
    expect(functions.map.status).toBe("covered")
  })

  it("requires the justification when high-impact is presumed_not_high_impact", () => {
    const complete = {
      stageOfDevelopment: "pilot" as const,
      topicArea: "cybersecurity" as const,
      aiClassification: "generative_ai" as const,
      coreProblem: "Manual triage is slow.",
      businessValue: "Frees up analyst time.",
      solutionSummary: "Ranks alerts by severity.",
      highImpact: "presumed_not_high_impact" as const,
      disseminatesToPublic: "no" as const,
      scalable: "yes" as const,
    }
    expect(computeRmfProfile(fd(complete)).functions.map.status).toBe("partial")
    expect(
      computeRmfProfile(fd({ ...complete, highImpactJustification: "No decisional impact on individuals." }))
        .functions.map.status,
    ).toBe("covered")
  })
})

const highImpactDeployedBase = fd({ stageOfDevelopment: "deployed", highImpact: "high_impact" })

describe("computeRmfProfile — Measure", () => {
  it("is not_yet_applicable unless high-impact and deployed", () => {
    expect(computeRmfProfile(fd({ stageOfDevelopment: "pilot", highImpact: "high_impact" })).functions.measure.status).toBe(
      "not_yet_applicable",
    )
    expect(computeRmfProfile(fd({ stageOfDevelopment: "deployed", highImpact: "not_high_impact" })).functions.measure.status).toBe(
      "not_yet_applicable",
    )
  })

  it("is gap when applicable but nothing is answered", () => {
    expect(computeRmfProfile(highImpactDeployedBase).functions.measure.status).toBe("gap")
  })

  it("is partial when an answer is in-progress/waived", () => {
    const { functions } = computeRmfProfile({
      ...highImpactDeployedBase,
      preDeploymentTesting: "in_progress",
      aiImpactAssessmentCompleted: "yes",
      aiImpactAssessment: "Assessed potential impacts on applicants.",
      independentReviewConducted: "yes_caio",
    })
    expect(functions.measure.status).toBe("partial")
  })

  it("is covered when testing, assessment, and independent review are all yes-equivalent", () => {
    const { functions } = computeRmfProfile({
      ...highImpactDeployedBase,
      preDeploymentTesting: "yes",
      aiImpactAssessmentCompleted: "yes",
      aiImpactAssessment: "Assessed potential impacts on applicants.",
      independentReviewConducted: "yes_oversight_board",
    })
    expect(functions.measure.status).toBe("covered")
  })
})

describe("computeRmfProfile — Manage", () => {
  it("is not_yet_applicable unless high-impact and deployed", () => {
    expect(computeRmfProfile(fd({ stageOfDevelopment: "pilot", highImpact: "high_impact" })).functions.manage.status).toBe(
      "not_yet_applicable",
    )
  })

  it("is gap when applicable but nothing is answered", () => {
    expect(computeRmfProfile(highImpactDeployedBase).functions.manage.status).toBe("gap")
  })

  it("is partial when some fields are still a placeholder state", () => {
    const { functions } = computeRmfProfile({
      ...highImpactDeployedBase,
      ongoingMonitoringPlan: "yes",
      operatorTrainingEstablished: "waived",
      failSafeMechanism: "yes",
      humanOversightAppeal: "yes",
      publicConsultationSteps: ["public_comment_period"],
      customCode: "yes",
      systemSource: "in_house",
    })
    expect(functions.manage.status).toBe("partial")
  })

  it("is covered when not_applicable/law_precludes count as decided, not placeholders", () => {
    const { functions } = computeRmfProfile({
      ...highImpactDeployedBase,
      ongoingMonitoringPlan: "yes",
      operatorTrainingEstablished: "yes",
      failSafeMechanism: "not_applicable",
      humanOversightAppeal: "law_precludes",
      publicConsultationSteps: ["public_comment_period"],
      customCode: "no",
      systemSource: "vendor",
    })
    expect(functions.manage.status).toBe("covered")
  })
})

describe("computeRmfProfile — overall rollup", () => {
  it("is unknown when nothing has been submitted yet (Map not_yet_applicable)", () => {
    expect(computeRmfProfile(fd()).overall).toBe("unknown")
  })

  it("is at_risk when Govern is a gap", () => {
    const { overall } = computeRmfProfile(fd({ stageOfDevelopment: "pre_deployment", reviewStatus: "submitted" }))
    expect(overall).toBe("at_risk")
  })

  it("is at_risk when a high-impact deployed use case has no monitoring plan or fail-safe on file (Manage gap)", () => {
    const { overall } = computeRmfProfile({
      ...highImpactDeployedBase,
      reviewStatus: "approved",
      bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "x", signedOffByEmail: "x@nist.gov", signedOffAt: "2026-01-01" },
      hasATO: "yes",
      atoSystemName: "System X",
      isWithheld: "no",
      topicArea: "cybersecurity",
      aiClassification: "generative_ai",
      coreProblem: "p",
      businessValue: "v",
      solutionSummary: "s",
      preDeploymentTesting: "yes",
      aiImpactAssessmentCompleted: "yes",
      aiImpactAssessment: "impacts",
      independentReviewConducted: "yes_caio",
    })
    expect(overall).toBe("at_risk")
  })

  it("is attention when a function is partial (Govern in-review)", () => {
    const { overall } = computeRmfProfile(
      fd({
        stageOfDevelopment: "pre_deployment",
        reviewStatus: "in_review",
        topicArea: "cybersecurity",
        aiClassification: "generative_ai",
        coreProblem: "p",
        businessValue: "v",
        solutionSummary: "s",
        highImpact: "not_high_impact",
      }),
    )
    expect(overall).toBe("attention")
  })

  it("flags attention for a high-impact, pre-deployment use case even though Measure/Manage are not_yet_applicable", () => {
    const { overall, flags } = computeRmfProfile(
      fd({
        stageOfDevelopment: "pilot",
        highImpact: "high_impact",
        reviewStatus: "approved",
        bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "x", signedOffByEmail: "x@nist.gov", signedOffAt: "2026-01-01" },
        hasATO: "no",
        isWithheld: "no",
        topicArea: "cybersecurity",
        aiClassification: "generative_ai",
        coreProblem: "p",
        businessValue: "v",
        solutionSummary: "s",
      }),
      noDeptTier,
    )
    expect(overall).toBe("attention")
    expect(flags.some((f) => /Measure:.*high-impact/i.test(f))).toBe(true)
    expect(flags.some((f) => /Manage:.*high-impact/i.test(f))).toBe(true)
  })

  it("is on_track when every applicable function is covered", () => {
    const { overall, flags } = computeRmfProfile(
      {
        ...highImpactDeployedBase,
        reviewStatus: "approved",
        bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "x", signedOffByEmail: "x@nist.gov", signedOffAt: "2026-01-01" },
        hasATO: "yes",
        atoSystemName: "System X",
        isWithheld: "no",
        topicArea: "cybersecurity",
        aiClassification: "generative_ai",
        coreProblem: "p",
        businessValue: "v",
        solutionSummary: "s",
        disseminatesToPublic: "no",
        scalable: "no",
        preDeploymentTesting: "yes",
        aiImpactAssessmentCompleted: "yes",
        aiImpactAssessment: "impacts",
        independentReviewConducted: "yes_caio",
        ongoingMonitoringPlan: "yes",
        operatorTrainingEstablished: "yes",
        failSafeMechanism: "yes",
        humanOversightAppeal: "yes",
        publicConsultationSteps: ["public_comment_period"],
        customCode: "no",
        systemSource: "in_house",
      },
      noDeptTier,
    )
    expect(overall).toBe("on_track")
    expect(flags).toEqual([])
  })

  it("is on_track for a non-high-impact pilot use case where Measure/Manage stay not_yet_applicable", () => {
    const { overall } = computeRmfProfile(
      {
        ...fd({
          stageOfDevelopment: "pilot",
          highImpact: "not_high_impact",
          reviewStatus: "approved",
          bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "x", signedOffByEmail: "x@nist.gov", signedOffAt: "2026-01-01" },
          hasATO: "no",
          isWithheld: "no",
          topicArea: "cybersecurity",
          aiClassification: "generative_ai",
          coreProblem: "p",
          businessValue: "v",
          solutionSummary: "s",
          disseminatesToPublic: "yes",
          scalable: "yes",
        }),
      },
      noDeptTier,
    )
    expect(overall).toBe("on_track")
  })
})

describe("badge helpers", () => {
  it("returns a distinct class per overall level", () => {
    expect(rmfBadgeClass("on_track")).toMatch(/green/)
    expect(rmfBadgeClass("attention")).toMatch(/amber/)
    expect(rmfBadgeClass("at_risk")).toMatch(/red/)
    expect(rmfBadgeClass("unknown")).toMatch(/gray/)
  })

  it("returns a distinct class per function status", () => {
    expect(rmfFunctionStatusBadgeClass("covered")).toMatch(/green/)
    expect(rmfFunctionStatusBadgeClass("partial")).toMatch(/amber/)
    expect(rmfFunctionStatusBadgeClass("gap")).toMatch(/red/)
    expect(rmfFunctionStatusBadgeClass("not_yet_applicable")).toMatch(/gray/)
  })
})
