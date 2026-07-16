import { describe, it, expect } from "vitest"
import { mapSubmissionToOmbRow, buildOmbCsv, isPubliclyReportable, OMB_COLUMNS } from "@/lib/ombExport"
import { csvLine } from "@/lib/csv"
import type { Submission } from "@/lib/submissions"

const AGENCY = { shortName: "USPTO", publicInquiryEmail: "AI.Inventory@uspto.gov" }

function sub(id: string, formData: Record<string, unknown>): Submission {
  return {
    id,
    submittedAt: "2026-01-01T00:00:00.000Z",
    formData: formData as any,
  }
}

const HIGH_IMPACT_DEPLOYED_FORM = {
  useCaseTitle: "Patent Triage Assistant",
  submitterOffice: "patents",
  submitterEmail: "examiner@uspto.gov",
  isWithheld: "no",
  stageOfDevelopment: "deployed",
  highImpact: "high_impact",
  topicArea: "cybersecurity",
  aiClassification: "classical_predictive_ml",
  coreProblem: "Examiners spend too long triaging incoming applications.",
  businessValue: "Cuts triage time in half.",
  solutionSummary: "Ranks applications by urgency for examiner review.",
  operationalDate: "2025-06-01",
  systemSource: "contract",
  systemSourceVendorName: "",
  hasATO: "yes",
  atoSystemName: "Patent Triage System",
  trainingDataDescription: "Historical examiner triage decisions.",
  federalDataCatalogLink: "https://catalog.data.gov/dataset/patent-triage",
  hasPii: "no",
  piaLink: "https://uspto.gov/pia/patent-triage",
  demographicFeatures: ["age", "none"],
  customCode: "yes",
  openSourceCodeLink: "https://github.com/uspto/patent-triage",
  preDeploymentTesting: "yes",
  aiImpactAssessmentCompleted: "in_progress",
  aiImpactAssessment: "Could deprioritize edge-case applications; monitored via spot audits.",
  independentReviewConducted: "yes_oversight_board",
  ongoingMonitoringPlan: "yes",
  operatorTrainingEstablished: "waived",
  failSafeMechanism: "yes",
  humanOversightAppeal: "yes",
  publicConsultationSteps: ["direct_usability_testing", "in_progress"],
}

describe("mapSubmissionToOmbRow", () => {
  it("maps a fully-answered high-impact, deployed submission to OMB column order, including the 9 hi_* columns", () => {
    const row = mapSubmissionToOmbRow(sub("sub-1", HIGH_IMPACT_DEPLOYED_FORM), AGENCY)

    expect(row).toHaveLength(OMB_COLUMNS.length)
    expect(row).toEqual([
      "Patent Triage Assistant", // Use Case Name
      "USPTO", // Agency
      "Patents", // Bureau/Component
      "AI.Inventory@uspto.gov", // Email Address — always the public-inquiry address, never submitterEmail
      "No", // is_withheld
      "Deployed", // Stage of Development
      "High-impact", // is_high_impact
      "", // Justification (only for "presumed not high-impact")
      "Cybersecurity", // Use Case Topic Area
      "Classical/Predictive Machine Learning", // AI Classification
      "Examiners spend too long triaging incoming applications.",
      "Cuts triage time in half.",
      "Ranks applications by urgency for examiner review.",
      "2025-06-01", // operational_date
      "Developed with both contracting and in-house resources", // contracting_usage (systemSource: "contract")
      "", // vendor_name
      "Yes", // have_ato
      "Patent Triage System", // system_name_ato
      "Historical examiner triage decisions.",
      "https://catalog.data.gov/dataset/patent-triage",
      "No", // has_pii
      "https://uspto.gov/pia/patent-triage",
      "Age; None of the above", // demographic_features
      "Yes", // has_custom_code
      "https://github.com/uspto/patent-triage",
      "Yes", // hi_testing_conducted
      "In-progress", // hi_assessment_completed
      "Could deprioritize edge-case applications; monitored via spot audits.",
      "Yes – by an agency AI oversight board", // hi_independent_review
      "Yes, sufficient monitoring protocols established", // hi_ongoing_monitoring
      "CAIO waived", // hi_training_established
      "Yes", // hi_failsafe_presence
      "Yes, appeal process established", // hi_appeal_process
      "Direct usability testing; In-progress", // hi_public_consultation
      "Individual", // Reporting Mode — high-impact is never consolidated
      "", // Consolidated Category
    ])
  })

  it("blanks the 9 hi_* columns for a high-impact submission that isn't deployed yet", () => {
    const row = mapSubmissionToOmbRow(
      sub("sub-1", { ...HIGH_IMPACT_DEPLOYED_FORM, stageOfDevelopment: "pilot" }),
      AGENCY,
    )
    expect(row.slice(25, 34)).toEqual(["", "", "", "", "", "", "", "", ""])
  })

  it("blanks the 9 hi_* columns for a deployed submission that isn't high-impact", () => {
    const row = mapSubmissionToOmbRow(
      sub("sub-1", { ...HIGH_IMPACT_DEPLOYED_FORM, highImpact: "not_high_impact" }),
      AGENCY,
    )
    expect(row.slice(25, 34)).toEqual(["", "", "", "", "", "", "", "", ""])
  })

  it("falls back to empty strings for unanswered fields", () => {
    const row = mapSubmissionToOmbRow(sub("sub-1", {}), AGENCY)
    expect(row).toHaveLength(OMB_COLUMNS.length)
    expect(row[0]).toBe("") // useCaseTitle
    expect(row[1]).toBe("USPTO") // Agency
    expect(row[2]).toBe("Unspecified") // businessUnitLabel fallback for an empty unit
    expect(row[3]).toBe("AI.Inventory@uspto.gov") // Email Address is always populated
    expect(row[4]).toBe("") // is_withheld
    // Every remaining OMB field is blank except Reporting Mode ("Individual" — no category match, so not consolidated).
    const reportingModeIndex = OMB_COLUMNS.indexOf("Reporting Mode")
    const expected = Array(OMB_COLUMNS.length - 5).fill("")
    expected[reportingModeIndex - 5] = "Individual"
    expect(row.slice(5)).toEqual(expected)
  })

  it("reports the matched category and 'Consolidated' reporting mode for a widely-used commercial AI use case", () => {
    const row = mapSubmissionToOmbRow(
      sub("sub-2", {
        useCaseTitle: "Inbox Assistant",
        highImpact: "not_high_impact",
        coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
      }),
      AGENCY,
    )
    const reportingModeIndex = OMB_COLUMNS.indexOf("Reporting Mode")
    const categoryIndex = OMB_COLUMNS.indexOf("Consolidated Category")
    expect(row[reportingModeIndex]).toBe("Consolidated")
    expect(row[categoryIndex]).toBe("Email prioritization & categorization")
  })

  it("never exposes the internal submission id — 'Use Case ID' is not an OMB_COLUMNS entry", () => {
    expect(OMB_COLUMNS).not.toContain("Use Case ID")
    const row = mapSubmissionToOmbRow(sub("super-secret-internal-id-42", { useCaseTitle: "Idea" }), AGENCY)
    expect(row).not.toContain("super-secret-internal-id-42")
  })
})

describe("isPubliclyReportable", () => {
  it("is true for 'no' and blank/legacy-unmigrated isWithheld values", () => {
    expect(isPubliclyReportable({ isWithheld: "no" } as any)).toBe(true)
    expect(isPubliclyReportable({ isWithheld: "" } as any)).toBe(true)
  })

  it("is false for every withheld reason", () => {
    expect(isPubliclyReportable({ isWithheld: "yes_risk_to_disclosure" } as any)).toBe(false)
    expect(isPubliclyReportable({ isWithheld: "yes_disclosure_prohibited" } as any)).toBe(false)
    expect(isPubliclyReportable({ isWithheld: "other" } as any)).toBe(false)
  })
})

describe("buildOmbCsv", () => {
  it("emits a header row followed by one row per submission, quoting commas", () => {
    const csv = buildOmbCsv(
      [sub("sub-1", { useCaseTitle: "Idea, with a comma", coreProblem: 'Has "quotes" too' })],
      AGENCY,
    )
    const lines = csv.trim().split("\n")
    expect(lines[0]).toBe(csvLine([...OMB_COLUMNS]))
    expect(lines[1]).toContain('"Idea, with a comma"')
    expect(lines[1]).toContain('"Has ""quotes"" too"')
  })

  it("returns just the header for an empty submission list", () => {
    const csv = buildOmbCsv([], AGENCY)
    expect(csv.trim().split("\n")).toHaveLength(1)
  })

  it("collapses multiple bureaus' consolidated matches into a single department-level row per category", () => {
    const emailUseCase = (id: string, office: string) =>
      sub(id, {
        useCaseTitle: "Inbox Assistant",
        submitterOffice: office,
        highImpact: "not_high_impact",
        coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
      })

    const csv = buildOmbCsv(
      [emailUseCase("sub-1", "census"), emailUseCase("sub-2", "noaa"), emailUseCase("sub-3", "census")],
      { shortName: "DoC", publicInquiryEmail: "AI.Inventory@doc.gov" },
    )
    const lines = csv.trim().split("\n")
    // header + exactly one consolidated row (not one per submission)
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain("2 bureaus: census, noaa")
    expect(lines[1]).toContain("Consolidated")
    expect(lines[1]).toContain("Email prioritization & categorization")
  })

  it("never collapses high-impact use cases, even when they match a consolidated category", () => {
    const csv = buildOmbCsv(
      [
        sub("sub-1", {
          useCaseTitle: "Inbox Assistant",
          highImpact: "high_impact",
          coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
        }),
      ],
      AGENCY,
    )
    const lines = csv.trim().split("\n")
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain("Inbox Assistant")
    expect(lines[1]).toContain("Individual")
  })

  it("excludes withheld submissions from the public CSV entirely, even when they'd otherwise match a consolidated category", () => {
    const csv = buildOmbCsv(
      [
        sub("sub-1", { useCaseTitle: "Public Idea", isWithheld: "no", coreProblem: "A problem." }),
        sub("sub-2", { useCaseTitle: "Secret Idea", isWithheld: "yes_disclosure_prohibited", coreProblem: "A problem." }),
        sub("sub-3", {
          useCaseTitle: "Inbox Assistant",
          isWithheld: "yes_risk_to_disclosure",
          highImpact: "not_high_impact",
          coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
        }),
      ],
      AGENCY,
    )
    const lines = csv.trim().split("\n")
    expect(lines).toHaveLength(2) // header + "Public Idea" only
    expect(lines[1]).toContain("Public Idea")
    expect(csv).not.toContain("Secret Idea")
    expect(csv).not.toContain("Inbox Assistant")
  })
})
