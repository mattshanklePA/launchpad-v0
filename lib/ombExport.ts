// OMB 2025 AI use case inventory CSV export — "reporting is a byproduct of
// intake" (see app/api/export/omb/route.ts). Pure mapping/formatting lives
// here so it can be unit-tested without a live Supabase connection; the API
// route owns fetching submissions and streaming the response.

import type { Submission } from "@/lib/submissions"
import { businessUnitLabel, getBusinessUnit } from "@/lib/reviewWorkflow"

// LaunchPad field -> OMB inventory column mapping:
//   id                     -> Use Case ID
//   useCaseTitle           -> Use Case Name
//   (getTenant().shortName)-> Agency
//   submitterOffice        -> Bureau/Component (resolved to its tenant label)
//   stageOfDevelopment     -> Stage of Development
//   highImpact             -> Is the AI use case high-impact?
//   coreProblem            -> What problem is the AI intended to solve?
//   businessValue          -> Expected benefits
//   solutionSummary        -> Describe the AI system's outputs
//   involvesSensitiveData  -> Involves PII?
//   hasATO                 -> Associated ATO?
//   systemSource           -> Built in-house/under contract/purchased
//   aiModelSourcing        -> Model sourcing
//   aiHumanReview          -> Mandatory human review
//   aiDecisionalImpact     -> AI decisional impact
export const OMB_COLUMNS = [
  "Use Case ID",
  "Use Case Name",
  "Agency",
  "Bureau/Component",
  "Stage of Development",
  "Is the AI use case high-impact?",
  "What problem is the AI intended to solve?",
  "Expected benefits",
  "Describe the AI system's outputs",
  "Involves PII?",
  "Associated ATO?",
  "Built in-house/under contract/purchased",
  "Model sourcing",
  "Mandatory human review",
  "AI decisional impact",
] as const

const YES_NO: Record<string, string> = { yes: "Yes", no: "No" }

const STAGE_LABELS: Record<string, string> = {
  pre_deployment: "Pre-Deployment",
  pilot: "Pilot",
  deployed: "Deployed",
  retired: "Retired",
}

const ATO_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  in_progress: "In Progress",
}

const SOURCE_LABELS: Record<string, string> = {
  in_house: "In-house",
  contract: "Under contract",
  vendor: "Purchased",
}

const MODEL_SOURCING_LABELS: Record<string, string> = {
  american_built: "American-built",
  open_source_us: "Open-source (U.S.-hosted)",
  foreign: "Foreign",
  unknown: "Unknown",
}

/** Maps one submission to a CSV row (values in OMB_COLUMNS order). Pure — no I/O. */
export function mapSubmissionToOmbRow(submission: Submission, agencyShortName: string): string[] {
  const fd = submission.formData
  return [
    submission.id,
    fd.useCaseTitle || "",
    agencyShortName,
    businessUnitLabel(getBusinessUnit(submission)),
    STAGE_LABELS[fd.stageOfDevelopment] || "",
    YES_NO[fd.highImpact] || "",
    fd.coreProblem || "",
    fd.businessValue || "",
    fd.solutionSummary || "",
    YES_NO[fd.involvesSensitiveData] || "",
    ATO_LABELS[fd.hasATO] || "",
    SOURCE_LABELS[fd.systemSource] || "",
    MODEL_SOURCING_LABELS[fd.aiModelSourcing] || "",
    YES_NO[fd.aiHumanReview] || "",
    YES_NO[fd.aiDecisionalImpact] || "",
  ]
}

// RFC 4180 field escaping: quote any field containing a comma, quote, or newline.
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvLine(values: string[]): string {
  return values.map(csvEscape).join(",")
}

/** Builds the full CSV string (header + one row per submission). Pure — no I/O. */
export function buildOmbCsv(submissions: Submission[], agencyShortName: string): string {
  const lines = [csvLine([...OMB_COLUMNS])]
  for (const s of submissions) {
    lines.push(csvLine(mapSubmissionToOmbRow(s, agencyShortName)))
  }
  return lines.join("\n") + "\n"
}
