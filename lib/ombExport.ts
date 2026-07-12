// OMB 2025 AI use case inventory CSV export — "reporting is a byproduct of
// intake" (see app/api/export/omb/route.ts). Pure mapping/formatting lives
// here so it can be unit-tested without a live Supabase connection; the API
// route owns fetching submissions and streaming the response.

import type { Submission } from "@/lib/submissions"
import { businessUnitLabel, getBusinessUnit } from "@/lib/reviewWorkflow"
import { resolveConsolidation, CONSOLIDATION_CATEGORIES, type ConsolidationCategoryId } from "@/lib/ombConsolidation"
import { csvLine } from "@/lib/csv"

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
//   (lib/ombConsolidation) -> Reporting Mode + Consolidated Category — is this
//                             use case Individual or Consolidated (matches one
//                             of OMB's widely-used commercial AI categories)?
//                             High-impact use cases are always Individual (see
//                             lib/highImpactDetermination.ts). Consolidated
//                             matches are collapsed to a single department-wide
//                             row per category in buildOmbCsv() below rather
//                             than one row per bureau submission.
export const OMB_COLUMNS = [
  "Use Case ID",
  "Use Case Name",
  "Agency",
  "Bureau/Component",
  "Stage of Development",
  "Is the AI use case high-impact?",
  "Reporting Mode",
  "Consolidated Category",
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
  const consolidation = resolveConsolidation(fd)
  return [
    submission.id,
    fd.useCaseTitle || "",
    agencyShortName,
    businessUnitLabel(getBusinessUnit(submission)),
    STAGE_LABELS[fd.stageOfDevelopment] || "",
    YES_NO[fd.highImpact] || "",
    consolidation.status,
    consolidation.categoryLabel || "",
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

/** One department-level CSV row standing in for every submission consolidated under `categoryId`. Pure — no I/O. */
function buildConsolidatedOmbRow(
  categoryId: ConsolidationCategoryId,
  categoryLabel: string,
  matches: Submission[],
  agencyShortName: string,
): string[] {
  const bureaus = Array.from(new Set(matches.map((s) => businessUnitLabel(getBusinessUnit(s))))).sort()
  const bureauSummary = `${bureaus.length} bureau${bureaus.length === 1 ? "" : "s"}: ${bureaus.join(", ")}`
  const problemSummary = `Reported once across the department per OMB's widely-used commercial AI category guidance — consolidates ${matches.length} bureau submission${matches.length === 1 ? "" : "s"} (${bureaus.join(", ")}) into this single department-level entry.`
  return [
    `consolidated:${categoryId}`,
    `${categoryLabel} (consolidated)`,
    agencyShortName,
    bureauSummary,
    "",
    "No",
    "Consolidated",
    categoryLabel,
    problemSummary,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]
}

/**
 * Builds the full CSV string: one row per individually-reported submission
 * (including every high-impact use case), plus a single department-level row
 * per consolidated category — never one row per bureau for a category OMB
 * lets the department report once. Pure — no I/O.
 */
export function buildOmbCsv(submissions: Submission[], agencyShortName: string): string {
  const lines = [csvLine([...OMB_COLUMNS])]

  const consolidatedGroups = new Map<ConsolidationCategoryId, { label: string; matches: Submission[] }>()

  for (const s of submissions) {
    const consolidation = resolveConsolidation(s.formData)
    if (consolidation.status === "Consolidated" && consolidation.category) {
      const group = consolidatedGroups.get(consolidation.category) ?? {
        label: consolidation.categoryLabel || consolidation.category,
        matches: [],
      }
      group.matches.push(s)
      consolidatedGroups.set(consolidation.category, group)
    } else {
      lines.push(csvLine(mapSubmissionToOmbRow(s, agencyShortName)))
    }
  }

  // Iterate in CONSOLIDATION_CATEGORIES order (not submission order) so the
  // export is deterministic regardless of how submissions are sorted.
  for (const { id } of CONSOLIDATION_CATEGORIES) {
    const group = consolidatedGroups.get(id)
    if (!group) continue
    lines.push(csvLine(buildConsolidatedOmbRow(id, group.label, group.matches, agencyShortName)))
  }

  return lines.join("\n") + "\n"
}
