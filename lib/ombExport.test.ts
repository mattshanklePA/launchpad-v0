import { describe, it, expect } from "vitest"
import { mapSubmissionToOmbRow, buildOmbCsv, OMB_COLUMNS, reportingMode } from "@/lib/ombExport"
import type { Submission } from "@/lib/submissions"

function sub(formData: Record<string, unknown>): Submission {
  return {
    id: "sub-1",
    submittedAt: "2026-01-01T00:00:00.000Z",
    formData: formData as any,
  }
}

describe("mapSubmissionToOmbRow", () => {
  it("maps a fully-answered submission to OMB column order", () => {
    const row = mapSubmissionToOmbRow(
      sub({
        useCaseTitle: "Patent Triage Assistant",
        submitterOffice: "patents",
        stageOfDevelopment: "pilot",
        highImpact: "yes",
        coreProblem: "Examiners spend too long triaging incoming applications.",
        businessValue: "Cuts triage time in half.",
        solutionSummary: "Ranks applications by urgency for examiner review.",
        involvesSensitiveData: "no",
        hasATO: "in_progress",
        systemSource: "contract",
        aiModelSourcing: "american_built",
        aiHumanReview: "yes",
        aiDecisionalImpact: "no",
      }),
      "USPTO",
    )

    expect(row).toEqual([
      "sub-1",
      "Patent Triage Assistant",
      "USPTO",
      "Patents",
      "Pilot",
      "Yes",
      "Individual",
      "Examiners spend too long triaging incoming applications.",
      "Cuts triage time in half.",
      "Ranks applications by urgency for examiner review.",
      "No",
      "In Progress",
      "Under contract",
      "American-built",
      "Yes",
      "No",
    ])
    expect(row).toHaveLength(OMB_COLUMNS.length)
  })

  it("falls back to empty strings for unanswered fields", () => {
    const row = mapSubmissionToOmbRow(sub({}), "USPTO")
    expect(row[0]).toBe("sub-1")
    expect(row.slice(1)).toEqual([
      "", // useCaseTitle
      "USPTO",
      "Unspecified", // businessUnitLabel fallback for an empty unit
      "", // stageOfDevelopment
      "", // highImpact
      "Consolidated-eligible", // reportingMode — not high-impact, so not forced individual
      "", // coreProblem
      "", // businessValue
      "", // solutionSummary
      "", // involvesSensitiveData
      "", // hasATO
      "", // systemSource
      "", // aiModelSourcing
      "", // aiHumanReview
      "", // aiDecisionalImpact
    ])
  })
})

describe("reportingMode", () => {
  it("forces individual reporting for high-impact use cases", () => {
    expect(reportingMode({ highImpact: "yes" })).toBe("Individual")
  })

  it("is consolidated-eligible for non-high-impact use cases", () => {
    expect(reportingMode({ highImpact: "no" })).toBe("Consolidated-eligible")
    expect(reportingMode({ highImpact: "" })).toBe("Consolidated-eligible")
  })
})

describe("buildOmbCsv", () => {
  it("emits a header row followed by one row per submission, quoting commas", () => {
    const csv = buildOmbCsv(
      [sub({ useCaseTitle: "Idea, with a comma", coreProblem: 'Has "quotes" too' })],
      "USPTO",
    )
    const lines = csv.trim().split("\n")
    expect(lines[0]).toBe(OMB_COLUMNS.join(","))
    expect(lines[1]).toContain('"Idea, with a comma"')
    expect(lines[1]).toContain('"Has ""quotes"" too"')
  })

  it("returns just the header for an empty submission list", () => {
    const csv = buildOmbCsv([], "USPTO")
    expect(csv.trim().split("\n")).toHaveLength(1)
  })
})
