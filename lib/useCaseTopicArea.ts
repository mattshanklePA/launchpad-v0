// OMB "Use Case Topic Area" proposal (docs/omb-2025-inventory-fields.md field
// #9) — recommends one of OMB's 15 topic-area categories from the
// problem/solution text already captured, instead of leaving the submitter to
// pick cold from an unfamiliar list. Pure, no I/O — same pattern as
// lib/ombConsolidation.ts's category matching: deterministic regex over free
// text, first match wins, so a match is always explainable by the pattern
// that fired. No ML, no fabrication — returns an empty `value` (never a
// guess) when nothing matches; the submitter picks manually.

import type { FormData } from "@/lib/steps"

export type TopicAreaId = Exclude<FormData["topicArea"], "">

export type TopicAreaResult = {
  value: FormData["topicArea"]
  categoryLabel?: string
  reason: string
}

// Order matters — first match wins. Narrower/more specific categories are
// checked before broader ones that could otherwise shadow them (e.g.
// cybersecurity before information_technology).
export const TOPIC_AREA_CATEGORIES: { id: TopicAreaId; label: string; pattern: RegExp }[] = [
  {
    id: "cybersecurity",
    label: "Cybersecurity",
    pattern: /\bcybersecurity\b|\bthreat detection\b|\bintrusion\b|\bmalware\b|\bphishing\b|\bsecurity vulnerabilit(y|ies)\b/i,
  },
  {
    id: "emergency_management",
    label: "Emergency Management",
    pattern: /\bemergency (management|response)\b|\bdisaster (response|recovery)\b|\bnatural disaster\b|\bwildfire\b|\bhurricane\b/i,
  },
  {
    id: "law_enforcement",
    label: "Law Enforcement",
    pattern: /\blaw enforcement\b|\bcriminal investigat\w*\b|\bforensic\w*\b|\bborder patrol\b|\bprosecut\w*\b/i,
  },
  {
    id: "health_medical",
    label: "Health and Medical",
    pattern: /\bhealth ?care\b|\bmedical\b|\bpatient\w*\b|\bdiagnos(is|e|tic\w*)\b|\bclinical\b|\bhospital\b/i,
  },
  {
    id: "human_resources",
    label: "Human Resources",
    pattern: /\bhuman resources\b|\bhiring\b|\brecruit(ing|ment)\b|\bonboarding\b|\bpayroll\b|\bperformance review\w*\b/i,
  },
  {
    id: "government_benefits_processing",
    label: "Government Benefits Processing",
    pattern: /\bbenefit\w* (processing|eligibility|application\w*)\b|\bclaims processing\b|\bentitlement program\w*\b|\bmedicaid\b|\bsnap benefit\w*\b/i,
  },
  {
    id: "international_affairs",
    label: "International Affairs",
    pattern: /\binternational affairs\b|\bdiplomatic\b|\bembassy\b|\bforeign relations\b|\btreaty\b/i,
  },
  {
    id: "procurement_financial_management",
    label: "Procurement and Financial Management",
    pattern: /\bprocurement\b|\bacquisition (planning|process)\b|\bcontract\w* management\b|\bbudget\w*\b|\bfinancial management\b|\baccounts payable\b|\binvoice processing\b/i,
  },
  {
    id: "transportation",
    label: "Transportation",
    pattern: /\btransportation\b|\btraffic\b|\baviation\b|\bmaritime\b|\bhighway\b|\btransit\b/i,
  },
  {
    id: "energy_environment",
    label: "Energy and the Environment",
    pattern: /\benergy\b|\benvironment\w*\b|\bclimate\b|\bemissions\b|\brenewable\b|\bpollution\b/i,
  },
  {
    id: "science",
    label: "Science",
    pattern: /\bscientific research\b|\blaboratory\b|\bresearch (data|experiment\w*)\b/i,
  },
  {
    id: "service_delivery",
    label: "Service Delivery",
    pattern: /\bservice delivery\b|\bcitizen service\w*\b|\bconstituent service\w*\b|\bcustomer service\b/i,
  },
  {
    id: "information_technology",
    label: "Information Technology",
    pattern: /\binformation technology\b|\bit help ?desk\b|\bnetwork (monitoring|management)\b|\bsoftware deployment\b|\bsystem administration\b/i,
  },
  {
    id: "administrative_functions",
    label: "Administrative Functions",
    pattern: /\badministrative (function\w*|task\w*|process\w*)\b|\brecords management\b|\bdocument management\b|\bcorrespondence tracking\b/i,
  },
]

const NO_MATCH_REASON =
  "No OMB topic-area keyword match in the problem/solution text — select the closest fit."

type TopicAreaInputs = Partial<
  Pick<
    FormData,
    "coreProblem" | "problemDefinition" | "proposedSolution" | "solutionSummary" | "useCaseDescription" | "businessValue"
  >
>

function topicAreaText(fd: TopicAreaInputs): string {
  return [fd.coreProblem, fd.problemDefinition, fd.proposedSolution, fd.solutionSummary, fd.useCaseDescription, fd.businessValue]
    .filter(Boolean)
    .join(" ")
}

/** Proposes an OMB use-case topic area from a submission's free text. Pure — no I/O. Never fabricates: empty `value` when nothing matches. */
export function determineTopicArea(fd: TopicAreaInputs): TopicAreaResult {
  const text = topicAreaText(fd)
  const match = TOPIC_AREA_CATEGORIES.find((c) => c.pattern.test(text))
  if (!match) return { value: "", reason: NO_MATCH_REASON }
  return {
    value: match.id,
    categoryLabel: match.label,
    reason: `Matches "${match.label}" based on keywords in the problem/solution text.`,
  }
}
