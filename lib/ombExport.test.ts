import { describe, it, expect } from "vitest"
import { mapSubmissionToOmbRow, buildOmbCsv, OMB_COLUMNS } from "@/lib/ombExport"
import type { Submission } from "@/lib/submissions"

function sub(id: string, formData: Record<string, unknown>): Submission {
  return {
    id,
    submittedAt: "2026-01-01T00:00:00.000Z",
    formData: formData as any,
  }
}

describe("mapSubmissionToOmbRow", () => {
  it("maps a fully-answered submission to OMB column order", () => {
    const row = mapSubmissionToOmbRow(
      sub("sub-1", {
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
      "",
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
    const row = mapSubmissionToOmbRow(sub("sub-1", {}), "USPTO")
    expect(row[0]).toBe("sub-1")
    expect(row.slice(1)).toEqual([
      "", // useCaseTitle
      "USPTO",
      "Unspecified", // businessUnitLabel fallback for an empty unit
      "", // stageOfDevelopment
      "", // highImpact
      "Individual", // Reporting Mode — no category match, so not consolidated
      "", // Consolidated Category
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

  it("reports the matched category and 'Consolidated' reporting mode for a widely-used commercial AI use case", () => {
    const row = mapSubmissionToOmbRow(
      sub("sub-2", {
        useCaseTitle: "Inbox Assistant",
        highImpact: "no",
        coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
      }),
      "USPTO",
    )
    expect(row[6]).toBe("Consolidated")
    expect(row[7]).toBe("Email prioritization & categorization")
  })
})

describe("buildOmbCsv", () => {
  it("emits a header row followed by one row per submission, quoting commas", () => {
    const csv = buildOmbCsv(
      [sub("sub-1", { useCaseTitle: "Idea, with a comma", coreProblem: 'Has "quotes" too' })],
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

  it("collapses multiple bureaus' consolidated matches into a single department-level row per category", () => {
    const emailUseCase = (id: string, office: string) =>
      sub(id, {
        useCaseTitle: "Inbox Assistant",
        submitterOffice: office,
        highImpact: "no",
        coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
      })

    const csv = buildOmbCsv(
      [emailUseCase("sub-1", "census"), emailUseCase("sub-2", "noaa"), emailUseCase("sub-3", "census")],
      "DoC",
    )
    const lines = csv.trim().split("\n")
    // header + exactly one consolidated row (not one per submission)
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain("consolidated:email_triage")
    expect(lines[1]).toContain("Consolidated")
    expect(lines[1]).toContain("Email prioritization & categorization")
  })

  it("never collapses high-impact use cases, even when they match a consolidated category", () => {
    const csv = buildOmbCsv(
      [
        sub("sub-1", {
          useCaseTitle: "Inbox Assistant",
          highImpact: "yes",
          coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
        }),
      ],
      "DoC",
    )
    const lines = csv.trim().split("\n")
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain("sub-1")
    expect(lines[1]).toContain("Individual")
    expect(lines[1]).not.toContain("consolidated:")
  })
})
