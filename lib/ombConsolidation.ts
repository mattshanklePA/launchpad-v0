// OMB consolidated-vs-individually-reported classification — decides whether a
// use case matches one of OMB's "widely used commercial AI" categories (2025
// reporting guidance + the OMB AI Inventory Reporting Cheat Sheet, category
// list a-t), which a department may report ONCE across every bureau instead of
// once per bureau. Pure, no I/O — mirrors lib/ombReportability.ts's and
// lib/highImpactDetermination.ts's pattern of keeping OMB judgment logic
// testable without a live Supabase connection.
//
// This is category matching, not text-overlap dedup — lib/similarity.ts's
// findSimilar() flags two submissions that look like the same idea; this
// module asks a different question of a single submission: "does this
// describe a widely-used commercial AI capability OMB already has a
// once-per-department reporting lane for?"
//
// Rule: high-impact use cases are ALWAYS individually reported, never
// consolidated (OMB M-25-21 Section 5 override) — coordinates with
// lib/highImpactDetermination.ts's determination. A category match is still
// surfaced even when high-impact forces individual reporting, so a reviewer
// can see *why* an otherwise-consolidatable use case is being reported on its
// own.

import type { FormData } from "@/lib/steps"

export type ConsolidationStatus = "Consolidated" | "Individual"

export type ConsolidationCategoryId =
  | "meeting_scheduling"
  | "time_logging"
  | "meeting_transcription"
  | "email_triage"
  | "media_editing"
  | "social_media_management"
  | "first_draft_generation"
  | "writing_quality"
  | "report_summarization"
  | "data_visualization"
  | "word_processor_tools"
  | "code_generation"
  | "enterprise_search"
  | "image_recognition_inventory"
  | "cybersecurity_automation"
  | "help_desk_triage"
  | "content_curation"
  | "travel_planning"
  | "mobile_facial_recognition"

export type ConsolidationResult = {
  status: ConsolidationStatus
  category?: ConsolidationCategoryId
  categoryLabel?: string
  reason: string
}

// OMB's "widely used commercial AI" categories (2025 reporting guidance +
// cheat sheet, list a-t). Matched against free text the submission already
// captures — deterministic regexes, no ML, so a match is always explainable
// by pointing at the pattern that fired. Order matters only in that the first
// match wins; the categories are specific enough in practice not to overlap.
export const CONSOLIDATION_CATEGORIES: { id: ConsolidationCategoryId; label: string; pattern: RegExp }[] = [
  {
    id: "meeting_scheduling",
    label: "AI meeting scheduling / calendar / reminders",
    pattern: /\b(schedul\w*|calendar|remind\w*)\b.{0,30}\bmeeting\b|\bmeeting\b.{0,30}\b(schedul\w*|calendar|remind\w*)\b/i,
  },
  {
    id: "time_logging",
    label: "Time logging & task-time analysis",
    pattern: /\btime[- ]?(logging|tracking|sheet)\b|\btask[- ]time\b|\btimesheet\w*/i,
  },
  {
    id: "meeting_transcription",
    label: "Meeting transcription / summarization / accessibility",
    pattern: /\bmeeting\b.{0,30}\b(transcri\w*|summar\w*|caption\w*)\b|\btranscri\w*\b.{0,30}\bmeeting\b|\b(live|closed)[- ]caption\w*/i,
  },
  {
    id: "email_triage",
    label: "Email prioritization & categorization",
    pattern: /\bemail\w*\b.{0,30}\b(prioriti[sz]\w*|categor\w*|triage|sort\w*|inbox)\b|\binbox\b.{0,30}\b(prioriti[sz]\w*|categor\w*|triage)\b/i,
  },
  {
    id: "media_editing",
    label: "Image/video/public-affairs media editing",
    pattern: /\b(image|video|photo)\b.{0,20}\bediting\b|\bpublic affairs\b.{0,30}\b(media|video|image|photo)\b/i,
  },
  {
    id: "social_media_management",
    label: "Social media post scheduling & management",
    pattern: /\bsocial media\b.{0,30}\b(post\w*|schedul\w*|manag\w*)\b/i,
  },
  {
    id: "first_draft_generation",
    label: "First-draft document / briefing / comms generation",
    pattern: /\bfirst[- ]draft\b|\bdraft\b.{0,20}\b(document|briefing|memo|comms|communication\w*)\b|\bgenerat\w*\b.{0,20}\b(draft|briefing)\b/i,
  },
  {
    id: "writing_quality",
    label: "Writing-quality improvement / editing assistance",
    pattern: /\bwriting[- ]quality\b|\bgrammar\b|\bediting assistance\b|\bproofread\w*|\bwriting assistant\b/i,
  },
  {
    id: "report_summarization",
    label: "Summarizing long reports",
    pattern: /\bsummariz\w*\b.{0,20}\b(long|lengthy)?\s*(report\w*|document\w*)\b/i,
  },
  {
    id: "data_visualization",
    label: "Data visualization generation",
    pattern: /\bdata visuali[sz]ation\b|\bgenerat\w*\b.{0,20}\b(chart|graph|dashboard)\b/i,
  },
  {
    id: "word_processor_tools",
    label: "AI-assisted word-processor tools",
    pattern: /\bword[- ]process\w*\b/i,
  },
  {
    id: "code_generation",
    label: "Code generation",
    pattern: /\bcode generation\b|\bgenerat\w*\b.{0,20}\bcode\b|\bcoding assistant\b|\bAI[- ]?(pair programmer|copilot)\b/i,
  },
  {
    id: "enterprise_search",
    label: "Internal knowledge-retrieval / enterprise search",
    pattern: /\bknowledge[- ]?(retrieval|base)\b|\benterprise search\b|\binternal search\b/i,
  },
  {
    id: "image_recognition_inventory",
    label: "Image-recognition inventory/cataloging",
    pattern: /\bimage recognition\b.{0,30}\b(inventory|catalog\w*)\b|\b(inventory|catalog\w*)\b.{0,30}\bimage recognition\b/i,
  },
  {
    id: "cybersecurity_automation",
    label: "Cybersecurity / security-controls automation",
    pattern: /\bcybersecurity\b|\bsecurity control\w*\b.{0,20}\bautomat\w*\b/i,
  },
  {
    id: "help_desk_triage",
    label: "Internal help-desk / service-ticket triage",
    pattern: /\bhelp[- ]?desk\b|\bservice ticket\w*\b|\bticket triage\b/i,
  },
  {
    id: "content_curation",
    label: "Personalized news/content curation",
    pattern: /\b(news|content)\b.{0,20}\bcuration\b|\bpersonali[sz]ed news\b/i,
  },
  {
    id: "travel_planning",
    label: "AI travel-route planning & booking",
    pattern: /\btravel\b.{0,20}\b(route|planning|booking)\b|\broute planning\b.{0,20}\btravel\b/i,
  },
  {
    id: "mobile_facial_recognition",
    label: "Mobile-device facial recognition",
    pattern: /\bfacial recognition\b.{0,30}\b(mobile|phone|device)\b|\b(mobile|phone|device)\b.{0,30}\bfacial recognition\b/i,
  },
]

const HIGH_IMPACT_OVERRIDE_NO_MATCH_REASON =
  "High-impact use cases are always reported individually, never consolidated (OMB M-25-21 Section 5)."

const NO_MATCH_REASON =
  "Does not match any of OMB's widely-used commercial AI categories — reported individually."

type ConsolidationInputs = Pick<FormData, "highImpact"> &
  Partial<
    Pick<
      FormData,
      "useCaseTitle" | "useCaseDescription" | "coreProblem" | "problemDefinition" | "proposedSolution" | "solutionSummary" | "businessValue"
    >
  >

/** Joins the free-text fields this module scans for a category-match signal. */
function consolidationText(fd: ConsolidationInputs): string {
  return [
    fd.useCaseTitle,
    fd.useCaseDescription,
    fd.coreProblem,
    fd.problemDefinition,
    fd.proposedSolution,
    fd.solutionSummary,
    fd.businessValue,
  ]
    .filter(Boolean)
    .join(" ")
}

/** Classifies one submission as Consolidated vs Individual for OMB reporting. Pure — no I/O. */
export function determineConsolidation(fd: ConsolidationInputs): ConsolidationResult {
  const text = consolidationText(fd)
  const match = CONSOLIDATION_CATEGORIES.find((c) => c.pattern.test(text))

  if (fd.highImpact === "yes") {
    return {
      status: "Individual",
      category: match?.id,
      categoryLabel: match?.label,
      reason: match
        ? `Matches the "${match.label}" widely-used commercial AI category, but high-impact use cases are always reported individually, never consolidated (OMB M-25-21 Section 5 override).`
        : HIGH_IMPACT_OVERRIDE_NO_MATCH_REASON,
    }
  }

  if (match) {
    return {
      status: "Consolidated",
      category: match.id,
      categoryLabel: match.label,
      reason: `Matches OMB's widely-used commercial AI category — "${match.label}" — reported once across the department instead of per bureau.`,
    }
  }

  return { status: "Individual", reason: NO_MATCH_REASON }
}

export type ConsolidationOverride = "individual" | "consolidated" | ""

/**
 * Resolves the final Individual vs. Consolidated call, honoring a reviewer's
 * manual override of the automatic determination (issue #61's AI-proposed,
 * submitter-confirmed field) — except a high-impact use case, which OMB
 * M-25-21 Section 5 always requires be reported individually regardless of
 * any override. An "consolidated" override is only honored when there's
 * actually a category match to consolidate under; otherwise it's a no-op and
 * the automatic determination stands. Pure — no I/O.
 */
export function resolveConsolidation(
  fd: ConsolidationInputs & { consolidationOverride?: ConsolidationOverride },
): ConsolidationResult {
  const auto = determineConsolidation(fd)
  if (fd.highImpact === "yes") return auto

  if (fd.consolidationOverride === "individual" && auto.status === "Consolidated") {
    return {
      status: "Individual",
      category: auto.category,
      categoryLabel: auto.categoryLabel,
      reason: `Manually reported individually — overrides the automatic "${auto.categoryLabel}" consolidation match.`,
    }
  }
  if (fd.consolidationOverride === "consolidated" && auto.status === "Individual" && auto.category) {
    return {
      status: "Consolidated",
      category: auto.category,
      categoryLabel: auto.categoryLabel,
      reason: `Manually consolidated under the "${auto.categoryLabel}" category match.`,
    }
  }
  return auto
}
