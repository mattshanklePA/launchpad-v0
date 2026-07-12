// OMB "AI Classification" proposal (docs/omb-2025-inventory-fields.md field
// #10) — recommends one of OMB's 6 AI-technique categories from the
// problem/solution text already captured. Pure, no I/O — same
// deterministic-regex pattern as lib/useCaseTopicArea.ts and
// lib/ombConsolidation.ts: first match wins, always explainable by the
// pattern that fired, no ML. Never fabricates — an empty `value` (not a
// guess) when nothing matches.

import type { FormData } from "@/lib/steps"

export type AiClassificationId = Exclude<FormData["aiClassification"], "">

export type AiClassificationResult = {
  value: FormData["aiClassification"]
  categoryLabel?: string
  reason: string
}

// Order matters — first match wins. Narrower categories (agentic, generative,
// computer vision, NLP, reinforcement learning) are checked before the
// broad "classical/predictive ML" catch-all so a generative or vision use
// case that also happens to mention "model" isn't miscategorized.
const AI_CLASSIFICATION_CATEGORIES: { id: AiClassificationId; label: string; pattern: RegExp }[] = [
  {
    id: "agentic_ai",
    label: "Agentic AI",
    pattern: /\bagentic\b|\bAI agent(s)?\b|\bautonomous agent(s)?\b|\bmulti-step agent\w*\b/i,
  },
  {
    id: "computer_vision",
    label: "Computer Vision",
    pattern: /\bcomputer vision\b|\bimage recognition\b|\bobject detection\b|\bfacial recognition\b|\bimage classification\b|\bvideo analysis\b/i,
  },
  {
    id: "reinforcement_learning",
    label: "Reinforcement Learning",
    pattern: /\breinforcement learning\b|\breward function\b|\bpolicy optimization\b|\bq-learning\b/i,
  },
  {
    id: "nlp",
    label: "Natural Language Processing",
    pattern: /\bnatural language processing\b|\bnlp\b|\btext classification\b|\bsentiment analysis\b|\bentity extraction\b/i,
  },
  {
    id: "generative_ai",
    label: "Generative AI",
    pattern: /\bgenerative ai\b|\bgenai\b|\blarge language model\b|\bllm\b|\bchatbot\b|\bgenerat\w* (text|content|document|draft|image)\b/i,
  },
  {
    id: "classical_predictive_ml",
    label: "Classical/Predictive Machine Learning",
    pattern: /\bpredictive model\w*\b|\bmachine learning model\w*\b|\bclassification model\w*\b|\bregression model\w*\b|\bforecast\w* model\w*\b|\banomaly detection\b|\bpredictive analytics\b/i,
  },
]

const NO_MATCH_REASON =
  "No OMB AI-classification keyword match in the problem/solution text — select the closest fit."

type AiClassificationInputs = Partial<
  Pick<
    FormData,
    "coreProblem" | "problemDefinition" | "proposedSolution" | "solutionSummary" | "useCaseDescription"
  >
>

function classificationText(fd: AiClassificationInputs): string {
  return [fd.coreProblem, fd.problemDefinition, fd.proposedSolution, fd.solutionSummary, fd.useCaseDescription]
    .filter(Boolean)
    .join(" ")
}

/** Proposes an OMB AI classification from a submission's free text. Pure — no I/O. Never fabricates: empty `value` when nothing matches. */
export function determineAiClassification(fd: AiClassificationInputs): AiClassificationResult {
  const text = classificationText(fd)
  const match = AI_CLASSIFICATION_CATEGORIES.find((c) => c.pattern.test(text))
  if (!match) return { value: "", reason: NO_MATCH_REASON }
  return {
    value: match.id,
    categoryLabel: match.label,
    reason: `Matches "${match.label}" based on keywords in the problem/solution text.`,
  }
}
