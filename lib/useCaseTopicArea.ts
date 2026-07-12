// OMB AI use case inventory "topic area" classification — a thematic bucket
// for the use case, distinct from lib/ombConsolidation.ts's "does this match a
// widely-used commercial AI category OMB lets a department report once"
// question. Pure, no I/O — same pattern as lib/ombConsolidation.ts and
// lib/highImpactDetermination.ts: deterministic keyword matching against text
// the submission already captures, so a match is always explainable.
//
// NOTE: the source guidance (context/Guidance-on-2025-Agency-Artificial-
// Intelligence-Reporting-.pdf and context/OMB AI Inventory Reporting Cheat
// Sheet - 12-5-25.docx) couldn't be parsed in this environment (no
// poppler-utils/pandoc available — same limitation noted in
// lib/fieldRegistry.ts's TODO(issue #57)). The category list below is a
// reasonable general-purpose taxonomy for federal AI use cases, not a
// verbatim transcription of OMB's official topic-area list — reconcile
// against the source guidance and adjust labels/keywords if they diverge.

import type { FormData } from "@/lib/steps"

export type UseCaseTopicAreaId =
  | "public_facing_services"
  | "internal_operations"
  | "law_enforcement_compliance"
  | "health_safety"
  | "research_analytics"
  | "cybersecurity_it"
  | "financial_management"
  | "human_capital"

export const USE_CASE_TOPIC_AREAS: { id: UseCaseTopicAreaId; label: string; pattern: RegExp }[] = [
  {
    id: "law_enforcement_compliance",
    label: "Law enforcement, investigations & compliance",
    pattern: /\benforcement\b|\binvestigat\w*|\bcompliance\b|\bviolation\w*|\binspection\w*|\baudit\w*|\bfraud\b/i,
  },
  {
    id: "health_safety",
    label: "Health & public safety",
    pattern: /\bhealth\b|\bsafety\b|\bmedical\b|\bemergency\b|\bhazard\w*|\bpublic safety\b/i,
  },
  {
    id: "financial_management",
    label: "Financial management & acquisitions",
    pattern: /\bbudget\w*|\bfinanc\w*|\bacquisition\w*|\bprocurement\b|\bcontract\w* (management|award)|\bgrant\w*/i,
  },
  {
    id: "human_capital",
    label: "Human capital & workforce",
    pattern: /\bhiring\b|\brecruit\w*|\bworkforce\b|\bhuman resources\b|\bemployee\w*|\bpersonnel\b|\btraining\b/i,
  },
  {
    id: "cybersecurity_it",
    label: "Cybersecurity & IT operations",
    pattern: /\bcybersecurity\b|\bsecurity control\w*|\bIT operations\b|\bnetwork\w* (monitoring|security)|\bincident response\b/i,
  },
  {
    id: "public_facing_services",
    label: "Public-facing services & customer experience",
    pattern: /\bpublic\b.{0,20}\b(facing|service|applicant\w*|constituent\w*)\b|\bcustomer\b.{0,20}\b(service|experience)\b|\bapplicant\w*\b/i,
  },
  {
    id: "research_analytics",
    label: "Research, analytics & forecasting",
    pattern: /\bresearch\b|\banalytic\w*|\bforecast\w*|\bpredict\w*|\bmodel\w* (trend|risk)\b|\bstatistic\w*/i,
  },
  {
    id: "internal_operations",
    label: "Internal operations & administrative efficiency",
    pattern: /\binternal\b|\badministrat\w*|\bback[- ]office\b|\bworkflow\w*|\bprocess\w* (efficiency|automation)\b/i,
  },
]

export type UseCaseTopicAreaResult = {
  value: UseCaseTopicAreaId | ""
  label: string
  rationale: string
}

const NO_MATCH_RATIONALE =
  "Couldn't confidently infer a topic area from the problem/solution text entered so far — please select one."

/** Joins the free-text fields this module scans for a topic-area signal. */
function topicAreaText(fd: Partial<FormData>): string {
  return [fd.useCaseTitle, fd.useCaseDescription, fd.coreProblem, fd.proposedSolution, fd.solutionSummary, fd.businessValue]
    .filter(Boolean)
    .join(" ")
}

/** Proposes a topic area for one submission's fields. Pure — no I/O. Never fabricates: no match means an empty value. */
export function proposeUseCaseTopicArea(fd: Partial<FormData>): UseCaseTopicAreaResult {
  const text = topicAreaText(fd)
  const match = USE_CASE_TOPIC_AREAS.find((c) => c.pattern.test(text))
  if (!match) return { value: "", label: "", rationale: NO_MATCH_RATIONALE }
  return {
    value: match.id,
    label: match.label,
    rationale: `Matched "${match.label}" based on the problem/solution description — confirm or pick a different area.`,
  }
}
