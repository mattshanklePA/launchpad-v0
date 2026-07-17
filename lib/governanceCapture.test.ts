import { describe, it, expect } from "vitest"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import {
  getGovernanceCaptureReview,
  applicableGovernanceFields,
  buildGovernanceCapturePatch,
  type GovernanceFieldDraft,
} from "@/lib/governanceCapture"

function sub(formData: Partial<FormData> = {}): Submission {
  return {
    id: "a",
    submittedAt: new Date(0).toISOString(),
    formData: { ...initialFormData, ...formData } as FormData,
  }
}

describe("getGovernanceCaptureReview", () => {
  it("returns undefined when nothing is recorded", () => {
    expect(getGovernanceCaptureReview(sub())).toBeUndefined()
  })

  it("reads a recorded review from form_data", () => {
    const s = sub({
      governanceCaptureReview: {
        entries: [{ field: "highImpact", decision: "confirmed", proposedValue: "not_high_impact", finalValue: "not_high_impact" }],
        byName: "Priya",
        byEmail: "p@doc.gov",
        at: "2026-01-01",
      },
    } as unknown as Partial<FormData>)
    const review = getGovernanceCaptureReview(s)
    expect(review?.byName).toBe("Priya")
    expect(review?.entries[0].decision).toBe("confirmed")
  })
})

describe("applicableGovernanceFields", () => {
  it("only surfaces fields with no showWhen gate when the use case has no stage set yet", () => {
    const fields = applicableGovernanceFields(initialFormData)
    expect(fields).toContain("stageOfDevelopment")
    expect(fields).toContain("highImpact")
    expect(fields).not.toContain("topicArea")
    expect(fields).not.toContain("hasATO")
    expect(fields).not.toContain("preDeploymentTesting")
  })

  it("unlocks the stage-gated OMB fields once a development stage is set", () => {
    const fields = applicableGovernanceFields({ ...initialFormData, stageOfDevelopment: "pre_deployment" })
    expect(fields).toContain("topicArea")
    expect(fields).toContain("aiClassification")
    expect(fields).not.toContain("hasATO") // still gated on pilot/deployed
  })

  it("unlocks the pilot/deployed-only OMB fields once piloted or deployed", () => {
    const fields = applicableGovernanceFields({ ...initialFormData, stageOfDevelopment: "deployed" })
    expect(fields).toContain("hasATO")
    expect(fields).toContain("hasPii")
    expect(fields).toContain("customCode")
  })

  it("unlocks the M-25-21 minimum-practice fields only once high-impact and deployed", () => {
    const fields = applicableGovernanceFields({ ...initialFormData, stageOfDevelopment: "deployed", highImpact: "high_impact" })
    expect(fields).toContain("preDeploymentTesting")
    expect(fields).toContain("publicConsultationSteps")
  })
})

describe("buildGovernanceCapturePatch", () => {
  const draft: GovernanceFieldDraft = {
    stageOfDevelopment: { value: "pre_deployment", rationale: "Still in vetting." },
    highImpact: { value: "not_high_impact", rationale: "No high-impact factors selected." },
    demographicFeatures: { value: ["none"], rationale: "No demographic signal." },
  }

  it("marks a field confirmed when the final value matches Scout's proposal", () => {
    const patch = buildGovernanceCapturePatch(
      draft,
      { stageOfDevelopment: "pre_deployment" },
      { byName: "Dana", byEmail: "dana@census.gov", at: "2026-02-01" },
    )
    expect(patch.stageOfDevelopment).toBe("pre_deployment")
    const review = patch.governanceCaptureReview as any
    expect(review.entries).toEqual([
      { field: "stageOfDevelopment", decision: "confirmed", proposedValue: "pre_deployment", finalValue: "pre_deployment" },
    ])
    expect(review.byName).toBe("Dana")
  })

  it("marks a field overridden when the reviewer changes it from Scout's proposal", () => {
    const patch = buildGovernanceCapturePatch(
      draft,
      { highImpact: "high_impact" },
      { byName: "Dana", byEmail: "dana@census.gov", at: "2026-02-01" },
    )
    expect(patch.highImpact).toBe("high_impact")
    const review = patch.governanceCaptureReview as any
    expect(review.entries[0]).toEqual({
      field: "highImpact",
      decision: "overridden",
      proposedValue: "not_high_impact",
      finalValue: "high_impact",
    })
  })

  it("compares array-valued fields by content, not identity", () => {
    const patch = buildGovernanceCapturePatch(
      draft,
      { demographicFeatures: ["none"] },
      { byName: "Dana", byEmail: "dana@census.gov", at: "2026-02-01" },
    )
    const review = patch.governanceCaptureReview as any
    expect(review.entries[0].decision).toBe("confirmed")
  })

  it("marks a field overridden (not confirmed) when Scout had no proposal for it at all", () => {
    const patch = buildGovernanceCapturePatch(
      draft,
      { atoSystemName: "Case Management System" },
      { byName: "Dana", byEmail: "dana@census.gov", at: "2026-02-01" },
    )
    const review = patch.governanceCaptureReview as any
    expect(review.entries[0]).toEqual({
      field: "atoSystemName",
      decision: "overridden",
      proposedValue: "Case Management System",
      finalValue: "Case Management System",
    })
  })
})
