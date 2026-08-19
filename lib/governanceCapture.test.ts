import { describe, it, expect } from "vitest"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import {
  getGovernanceCaptureReview,
  applicableGovernanceFields,
  applicableGovernanceFieldsForDisplay,
  buildGovernanceCapturePatch,
  governanceCaptureCounts,
  governanceFieldCounts,
  governanceFieldCountsSentence,
  governanceFieldValueLabel,
  type GovernanceFieldDraft,
  type GovernanceCaptureReview,
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
      {
        field: "stageOfDevelopment",
        decision: "confirmed",
        proposedValue: "pre_deployment",
        finalValue: "pre_deployment",
        rationale: "Still in vetting.",
      },
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
      rationale: "No high-impact factors selected.",
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
      rationale: "",
    })
  })
})

describe("governanceCaptureCounts", () => {
  it("counts confirmed entries as drafted-by-Plumb and overridden entries as confirmed-by-reviewer", () => {
    const review: GovernanceCaptureReview = {
      entries: [
        { field: "a", decision: "confirmed", proposedValue: "x", finalValue: "x", rationale: "r" },
        { field: "b", decision: "confirmed", proposedValue: "y", finalValue: "y", rationale: "r" },
        { field: "c", decision: "overridden", proposedValue: "z", finalValue: "w", rationale: "" },
      ],
      byName: "Dana",
      byEmail: "dana@census.gov",
      at: "2026-02-01",
    }
    expect(governanceCaptureCounts(review)).toEqual({ draftedByPlumb: 2, confirmedByReviewer: 1 })
  })

  it("is all zero when there's no review yet", () => {
    expect(governanceCaptureCounts(undefined)).toEqual({ draftedByPlumb: 0, confirmedByReviewer: 0 })
  })
})

describe("applicableGovernanceFieldsForDisplay", () => {
  it("matches applicableGovernanceFields when there is no draft yet", () => {
    expect(applicableGovernanceFieldsForDisplay(initialFormData, null)).toEqual(applicableGovernanceFields(initialFormData))
  })

  it("unlocks stage-gated fields via a draft proposal fd doesn't have a real value for yet", () => {
    const draft: GovernanceFieldDraft = {
      stageOfDevelopment: { value: "deployed", rationale: "Proposed from the idea's description." },
    }
    const fields = applicableGovernanceFieldsForDisplay(initialFormData, draft)
    expect(fields).toContain("hasATO")
    expect(fields).toContain("hasPii")
  })

  it("prefers fd's own value over the draft's when both exist", () => {
    const draft: GovernanceFieldDraft = {
      stageOfDevelopment: { value: "deployed", rationale: "..." },
    }
    const fields = applicableGovernanceFieldsForDisplay({ ...initialFormData, stageOfDevelopment: "pre_deployment" }, draft)
    expect(fields).not.toContain("hasATO") // fd says pre_deployment, not deployed — fd wins over the draft
  })
})

describe("governanceFieldCounts", () => {
  const applicable = ["stageOfDevelopment", "highImpact", "topicArea", "atoSystemName"] as (keyof FormData)[]
  const draft: GovernanceFieldDraft = {
    stageOfDevelopment: { value: "pre_deployment", rationale: "r" },
    highImpact: { value: "not_high_impact", rationale: "r" },
    topicArea: { value: "benefits", rationale: "r" },
  }

  it("counts every applicable field with a live proposal as drafted by Plumb, whether or not a reviewer has acted on it", () => {
    const counts = governanceFieldCounts(applicable, draft, undefined)
    expect(counts).toEqual({ applicableCount: 4, draftedByPlumb: 3, confirmedByReviewer: 0 })
  })

  it("counts confirmed-by-reviewer from saved review entries, independent of whether Plumb proposed the field", () => {
    const review: GovernanceCaptureReview = {
      entries: [
        { field: "stageOfDevelopment", decision: "confirmed", proposedValue: "pre_deployment", finalValue: "pre_deployment", rationale: "r" },
        { field: "atoSystemName", decision: "overridden", proposedValue: "", finalValue: "Case Management System", rationale: "" },
      ],
      byName: "Dana",
      byEmail: "dana@census.gov",
      at: "2026-02-01",
    }
    const counts = governanceFieldCounts(applicable, draft, review)
    expect(counts).toEqual({ applicableCount: 4, draftedByPlumb: 3, confirmedByReviewer: 2 })
  })

  it("is never stuck at zero drafted when proposals exist, even with no saved review", () => {
    const counts = governanceFieldCounts(applicable, draft, undefined)
    expect(counts.draftedByPlumb).toBeGreaterThan(0)
  })
})

describe("governanceFieldCountsSentence", () => {
  it("renders the N fields / k drafted / j confirmed sentence from counts", () => {
    expect(governanceFieldCountsSentence({ applicableCount: 6, draftedByPlumb: 3, confirmedByReviewer: 1 }, "Plumb")).toBe(
      "All 6 fields · 3 drafted by Plumb, 1 confirmed by the reviewer.",
    )
  })
})

describe("governanceFieldValueLabel", () => {
  it("maps a stored enum code to its display label", () => {
    expect(governanceFieldValueLabel("stageOfDevelopment", "pre_deployment")).not.toContain("_")
    expect(governanceFieldValueLabel("highImpact", "high_impact")).not.toContain("_")
    expect(governanceFieldValueLabel("hasATO", "in_progress")).not.toContain("_")
  })

  it("joins array values by their labels", () => {
    const label = governanceFieldValueLabel("demographicFeatures", ["none"])
    expect(label).not.toContain("_")
  })

  it("falls back to the raw value for a field with no registered options (free text)", () => {
    expect(governanceFieldValueLabel("atoSystemName", "Case Management System")).toBe("Case Management System")
  })

  it("renders placeholders for empty values instead of blank strings", () => {
    expect(governanceFieldValueLabel("stageOfDevelopment", "")).toBe("(blank)")
    expect(governanceFieldValueLabel("demographicFeatures", [])).toBe("(none)")
  })
})
