// OMB 2025 AI use case inventory CSV export — "reporting is a byproduct of
// intake" (see app/api/export/omb/route.ts). Pure mapping/formatting lives
// here so it can be unit-tested without a live Supabase connection; the API
// route owns fetching submissions and streaming the response.
//
// Column set and allowed-value formatting are reconciled field-by-field
// against docs/omb-2025-inventory-fields.md — OMB's own published data
// dictionary (34 fields: 25 base + 9 high-impact-only). `#N` comments below
// refer to that doc's row numbers.
//
// This is the PUBLIC inventory export, so OMB's public-inventory redaction
// rules apply unconditionally (docs/omb-2025-inventory-fields.md's
// "Public-reporting handling" note):
//   - `id` (#1) is dropped — OMB permits omitting the internal use-case id
//     from the public inventory, and this export never exposes it.
//   - `contact_email` (#4) is always the tenant's public-inquiry address,
//     never a real submitter's email.
//   - Any submission whose `isWithheld` (#5) answer is not "no" is withheld
//     from public reporting entirely — excluded from this CSV, not merely
//     redacted field-by-field, so nothing about a withheld use case (not even
//     its bureau or category) leaks into a consolidated row's summary.
//
// The four DoC/EO risk-management questions (`involvesSensitiveData`,
// `aiDecisionalImpact`, `aiModelSourcing`, `aiHumanReview`) are a distinct
// Commerce mandate, not part of OMB's 34-field schema (see
// docs/omb-2025-inventory-fields.md's mapping notes) — they stay out of this
// export. "Agency" and "Reporting Mode"/"Consolidated Category" are not OMB
// fields either, but predate this change as LaunchPad-added context: Agency
// is never a form field (read from the tenant at export time — see
// lib/ombAutofill.ts), and Reporting Mode/Consolidated Category surface the
// widely-used-commercial-AI consolidation lib/ombConsolidation.ts already
// performs.

import type { Submission } from "@/lib/submissions"
import type { FormData } from "@/lib/steps"
import { businessUnitLabel, getBusinessUnit } from "@/lib/reviewWorkflow"
import { determineConsolidation, CONSOLIDATION_CATEGORIES, type ConsolidationCategoryId } from "@/lib/ombConsolidation"
import { TOPIC_AREA_CATEGORIES } from "@/lib/useCaseTopicArea"
import { csvLine } from "@/lib/csv"

/** Export-time context — never hardcode a tenant's identity in this module (guardrail: tenant-neutral). */
export type OmbExportAgency = {
  shortName: string
  publicInquiryEmail: string
}

export const OMB_COLUMNS = [
  "Use Case Name", // #2 use_case_name
  "Agency", // not an OMB field — see file header
  "Bureau/Component", // #3 agency_bureau
  "Email Address", // #4 contact_email (redacted — see file header)
  "Should this AI use case be withheld from public reporting?", // #5 is_withheld
  "Stage of Development", // #6 development_stage
  "Is the AI use case high-impact?", // #7 is_high_impact
  "Justification", // #8 HI_justification
  "Use Case Topic Area", // #9 topic_area
  "AI Classification", // #10 classification
  "What problem is the AI intended to solve?", // #11 problem_solved
  "Expected benefits and positive outcomes", // #12 benefits
  "Describe the AI system's outputs", // #13 system_outputs
  "Date operational / pilot start date", // #14 operational_date
  "Purchased from a vendor, developed under contract, or in-house?", // #15 contracting_usage
  "Vendor(s) Name", // #16 vendor_name
  "Associated Authorization to Operate (ATO)?", // #17 have_ato
  "System(s) Name", // #18 system_name_ato
  "Describe data used to train/fine-tune/evaluate the model(s)", // #19 data_description
  "Link to Federal Data Catalog entry (if open gov data asset)", // #20 link_to_data
  "Involves PII maintained by the agency?", // #21 has_pii
  "Link to associated Privacy Impact Assessment (PIA)", // #22 pia_url
  "Which demographic variables are used as model features?", // #23 demographic_features
  "Includes custom-developed code?", // #24 has_custom_code
  "Link to publicly available source code (if open source)", // #25 code_url
  "Pre-deployment testing conducted?", // #26 hi_testing_conducted
  "AI impact assessment completed?", // #27 hi_assessment_completed
  "Potential impacts and how they were identified", // #28 hi_potential_impacts
  "Independent review conducted?", // #29 hi_independent_review
  "Ongoing monitoring process established?", // #30 hi_ongoing_monitoring
  "Sufficient, periodic operator training established?", // #31 hi_training_established
  "Appropriate fail-safe that minimizes risk of significant harm?", // #32 hi_failsafe_presence
  "Established appeal process for impacted individuals?", // #33 hi_appeal_process
  "Steps taken to consult end users and the public", // #34 hi_public_consultation
  "Reporting Mode", // not an OMB field — Individual/Consolidated (lib/ombConsolidation.ts)
  "Consolidated Category", // not an OMB field — lib/ombConsolidation.ts
] as const

const YES_NO: Record<string, string> = { yes: "Yes", no: "No" }

const IS_WITHHELD_LABELS: Record<string, string> = {
  no: "No",
  yes_risk_to_disclosure: "Yes – risk to disclosure (FOIA-protected interest)",
  yes_disclosure_prohibited: "Yes – disclosure prohibited by law",
  other: "Other",
}

const STAGE_LABELS: Record<string, string> = {
  pre_deployment: "Pre-deployment",
  pilot: "Pilot",
  deployed: "Deployed",
  retired: "Retired",
}

const HIGH_IMPACT_LABELS: Record<string, string> = {
  high_impact: "High-impact",
  presumed_not_high_impact: "Presumed high-impact, but determined not high-impact",
  not_high_impact: "Not high-impact",
}

// Reuses lib/useCaseTopicArea.ts's category list (the same 14 keyword-matched
// topics the autofill proposer scans for) so the label text can't drift
// between the proposer and the export; "other" is a valid manual selection
// that module's matcher never proposes, so it's added here.
const TOPIC_AREA_LABELS: Record<string, string> = {
  ...Object.fromEntries(TOPIC_AREA_CATEGORIES.map((c) => [c.id, c.label])),
  other: "Other",
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  agentic_ai: "Agentic AI",
  classical_predictive_ml: "Classical/Predictive Machine Learning",
  computer_vision: "Computer Vision",
  generative_ai: "Generative AI",
  nlp: "Natural Language Processing",
  reinforcement_learning: "Reinforcement Learning",
}

// OMB's contracting_usage (#15) is a 3-way choice with a "both contracting
// and in-house resources" option that LaunchPad's systemSource field has no
// direct equivalent for. A contractor-built (not purchased) system isn't a
// clean fit for either "purchased" or "in-house", so it maps to OMB's "both"
// bucket — the closest real analog, since contracted development is
// typically still overseen by in-house staff.
const CONTRACTING_USAGE_LABELS: Record<string, string> = {
  in_house: "Developed in-house",
  contract: "Developed with both contracting and in-house resources",
  vendor: "Purchased from a vendor",
}

// OMB's have_ato (#17) is strictly Yes/No — unlike LaunchPad's hasATO, which
// tracks an extra "in_progress" in-flight state. An ATO that hasn't been
// granted yet reports as "No" until it is.
const ATO_LABELS: Record<string, string> = { yes: "Yes", no: "No", in_progress: "No" }

const DEMOGRAPHIC_FEATURE_LABELS: Record<string, string> = {
  race_ethnicity: "Race/Ethnicity",
  sex: "Sex",
  age: "Age",
  religious_affiliation: "Religious Affiliation",
  socioeconomic_status: "Socioeconomic Status",
  ability_status: "Ability Status",
  residency_status: "Residency Status",
  marital_status: "Marital Status",
  income: "Income",
  employment_status: "Employment Status",
  none: "None of the above",
  other: "Other",
}

const HI_TESTING_LABELS: Record<string, string> = {
  yes: "Yes",
  in_progress: "In-progress",
  waived: "Agency CAIO has waived this minimum practice and reported such waiver to OMB",
}

const HI_ASSESSMENT_LABELS: Record<string, string> = {
  yes: "Yes",
  in_progress: "In-progress",
  waived: "CAIO waived",
}

const HI_INDEPENDENT_REVIEW_LABELS: Record<string, string> = {
  yes_other_office: "Yes – by another agency office/reviewer not involved in development",
  yes_oversight_board: "Yes – by an agency AI oversight board",
  yes_caio: "Yes – by the CAIO",
  in_progress: "In-progress",
  waived: "CAIO waived",
}

const HI_ONGOING_MONITORING_LABELS: Record<string, string> = {
  yes: "Yes, sufficient monitoring protocols established",
  in_progress: "In-progress",
  waived: "CAIO waived",
}

const HI_TRAINING_LABELS: Record<string, string> = {
  yes: "Yes, sufficient and periodic training established",
  in_progress: "In-progress",
  waived: "CAIO waived",
}

const HI_FAILSAFE_LABELS: Record<string, string> = {
  yes: "Yes",
  not_applicable: "Not applicable",
  in_progress: "In-progress",
  waived: "CAIO waived",
}

const HI_APPEAL_LABELS: Record<string, string> = {
  yes: "Yes, appeal process established",
  not_applicable: "Not applicable",
  in_progress: "In-progress",
  law_precludes: "Law/operational limits preclude appeal",
  waived: "CAIO waived",
}

const HI_PUBLIC_CONSULTATION_LABELS: Record<string, string> = {
  direct_usability_testing: "Direct usability testing",
  general_solicitation: "General solicitations of public feedback/comments",
  public_hearings: "Public hearings or meetings",
  other: "Other",
  in_progress: "In-progress",
  waived: "CAIO waived",
}

/** Values of `isWithheld` (#5) that mean "keep this out of the public inventory." Blank/legacy-unmigrated data defaults to publicly reportable, matching lib/ombAutofill.ts's "No unless a security signal says otherwise" default. */
const WITHHELD_VALUES = new Set<FormData["isWithheld"]>(["yes_risk_to_disclosure", "yes_disclosure_prohibited", "other"])

/** True if a submission may appear in the public inventory CSV at all. Pure — no I/O. */
export function isPubliclyReportable(fd: Pick<FormData, "isWithheld">): boolean {
  return !WITHHELD_VALUES.has(fd.isWithheld)
}

function formatMultiSelect(values: string[] | undefined, labels: Record<string, string>): string {
  return (values || []).map((v) => labels[v] || v).join("; ")
}

/** True only for a deployed, high-impact use case — the 9 hi_* columns (#26-34) are blank for every other row. */
function isHighImpactAndDeployed(fd: FormData): boolean {
  return fd.highImpact === "high_impact" && fd.stageOfDevelopment === "deployed"
}

/** Maps one submission to a CSV row (values in OMB_COLUMNS order). Pure — no I/O. */
export function mapSubmissionToOmbRow(submission: Submission, agency: OmbExportAgency): string[] {
  const fd = submission.formData
  const consolidation = determineConsolidation(fd)
  const hi = isHighImpactAndDeployed(fd)
  return [
    fd.useCaseTitle || "",
    agency.shortName,
    businessUnitLabel(getBusinessUnit(submission)),
    agency.publicInquiryEmail,
    IS_WITHHELD_LABELS[fd.isWithheld] || "",
    STAGE_LABELS[fd.stageOfDevelopment] || "",
    HIGH_IMPACT_LABELS[fd.highImpact] || "",
    fd.highImpactJustification || "",
    TOPIC_AREA_LABELS[fd.topicArea] || "",
    CLASSIFICATION_LABELS[fd.aiClassification] || "",
    fd.coreProblem || "",
    fd.businessValue || "",
    fd.solutionSummary || "",
    fd.operationalDate || "",
    CONTRACTING_USAGE_LABELS[fd.systemSource] || "",
    fd.systemSourceVendorName || "",
    ATO_LABELS[fd.hasATO] || "",
    fd.atoSystemName || "",
    fd.trainingDataDescription || "",
    fd.federalDataCatalogLink || "",
    YES_NO[fd.hasPii] || "",
    fd.piaLink || "",
    formatMultiSelect(fd.demographicFeatures, DEMOGRAPHIC_FEATURE_LABELS),
    YES_NO[fd.customCode] || "",
    fd.openSourceCodeLink || "",
    hi ? HI_TESTING_LABELS[fd.preDeploymentTesting] || "" : "",
    hi ? HI_ASSESSMENT_LABELS[fd.aiImpactAssessmentCompleted] || "" : "",
    hi ? fd.aiImpactAssessment || "" : "",
    hi ? HI_INDEPENDENT_REVIEW_LABELS[fd.independentReviewConducted] || "" : "",
    hi ? HI_ONGOING_MONITORING_LABELS[fd.ongoingMonitoringPlan] || "" : "",
    hi ? HI_TRAINING_LABELS[fd.operatorTrainingEstablished] || "" : "",
    hi ? HI_FAILSAFE_LABELS[fd.failSafeMechanism] || "" : "",
    hi ? HI_APPEAL_LABELS[fd.humanOversightAppeal] || "" : "",
    hi ? formatMultiSelect(fd.publicConsultationSteps, HI_PUBLIC_CONSULTATION_LABELS) : "",
    consolidation.status,
    consolidation.categoryLabel || "",
  ]
}

/** One department-level CSV row standing in for every submission consolidated under `categoryId`. Pure — no I/O. */
function buildConsolidatedOmbRow(
  categoryId: ConsolidationCategoryId,
  categoryLabel: string,
  matches: Submission[],
  agency: OmbExportAgency,
): string[] {
  const bureaus = Array.from(new Set(matches.map((s) => businessUnitLabel(getBusinessUnit(s))))).sort()
  const bureauSummary = `${bureaus.length} bureau${bureaus.length === 1 ? "" : "s"}: ${bureaus.join(", ")}`
  const problemSummary = `Reported once across the department per OMB's widely-used commercial AI category guidance — consolidates ${matches.length} bureau submission${matches.length === 1 ? "" : "s"} (${bureaus.join(", ")}) into this single department-level entry.`
  return [
    `${categoryLabel} (consolidated)`,
    agency.shortName,
    bureauSummary,
    agency.publicInquiryEmail,
    "No",
    "",
    "Not high-impact",
    "",
    "",
    "",
    problemSummary,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Consolidated",
    categoryLabel,
  ]
}

/**
 * Builds the full public-inventory CSV string: one row per individually-
 * reported, publicly-reportable submission (including every high-impact use
 * case), plus a single department-level row per consolidated category —
 * never one row per bureau for a category OMB lets the department report
 * once. Submissions withheld from public reporting (`isWithheld`, #5) are
 * excluded entirely, before consolidation grouping, so a withheld use case
 * never surfaces even indirectly (e.g. in a consolidated row's bureau count).
 * Pure — no I/O.
 */
export function buildOmbCsv(submissions: Submission[], agency: OmbExportAgency): string {
  const lines = [csvLine([...OMB_COLUMNS])]

  const reportable = submissions.filter((s) => isPubliclyReportable(s.formData))

  const consolidatedGroups = new Map<ConsolidationCategoryId, { label: string; matches: Submission[] }>()

  for (const s of reportable) {
    const consolidation = determineConsolidation(s.formData)
    if (consolidation.status === "Consolidated" && consolidation.category) {
      const group = consolidatedGroups.get(consolidation.category) ?? {
        label: consolidation.categoryLabel || consolidation.category,
        matches: [],
      }
      group.matches.push(s)
      consolidatedGroups.set(consolidation.category, group)
    } else {
      lines.push(csvLine(mapSubmissionToOmbRow(s, agency)))
    }
  }

  // Iterate in CONSOLIDATION_CATEGORIES order (not submission order) so the
  // export is deterministic regardless of how submissions are sorted.
  for (const { id } of CONSOLIDATION_CATEGORIES) {
    const group = consolidatedGroups.get(id)
    if (!group) continue
    lines.push(csvLine(buildConsolidatedOmbRow(id, group.label, group.matches, agency)))
  }

  return lines.join("\n") + "\n"
}
