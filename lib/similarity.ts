// Cross-bureau duplicate/similarity detection for use-case submissions.
//
// v1 is a deterministic, dependency-free heuristic: tokenize the free-text
// fields that describe *what the use case is* and score token overlap
// (Jaccard) between two submissions. It runs entirely client-side with no
// external API. Good enough to flag "these look like the same idea" for a
// human reviewer to confirm — it is not a semantic match.
//
// Future enhancement: replace `similarity()` with an embedding-based cosine
// similarity (e.g. via a hosted embeddings API / vector store) for better
// recall on paraphrased submissions, while keeping the findSimilar() shape
// the same so callers don't change.

import type { Submission } from "@/lib/submissions"
import { getBusinessUnit } from "@/lib/reviewWorkflow"

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "by", "at", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "this", "that", "these", "those", "it", "its", "their", "them", "they",
  "which", "who", "what", "when", "where", "how", "why", "can", "will",
  "would", "should", "could", "may", "might", "must", "shall", "not", "no",
  "so", "if", "than", "then", "there", "here", "also", "into", "onto",
  "about", "across", "per", "via", "each", "every", "any", "all", "some",
  "such", "only", "own", "same", "other", "more", "most", "much", "many",
  "because", "while", "during", "before", "after", "over", "under",
  "between", "through", "up", "down", "off", "again", "further", "once",
  "having", "does", "do", "did", "has", "have", "had", "get", "gets",
  "getting", "you", "your", "our", "we", "us",
])

// Very small suffix-stripping normalizer (not a full stemmer): merges the
// common plural/gerund variants that show up across near-duplicate
// submissions (e.g. "citation"/"citations", "responses"/"response") so token
// overlap isn't undercounted on wording differences alone.
function normalize(token: string): string {
  if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2)
  if (token.length > 4 && token.endsWith("ing")) return token.slice(0, -3)
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2)
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1)
  return token
}

/** Lowercase, split on non-alphanumerics, drop stop words and short tokens. */
export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
    .map(normalize)
}

// The fields that describe *what the use case is*, per the issue: title,
// problem, solution, and description. Everything else (audience, metrics,
// risk profile, etc.) is deliberately excluded from the comparison.
export function submissionText(s: Submission): string {
  const fd = s.formData as Record<string, unknown>
  return [fd.useCaseTitle, fd.coreProblem, fd.proposedSolution, fd.useCaseDescription]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
}

/** Jaccard similarity of the two submissions' token sets, in [0, 1]. */
export function similarity(a: Submission, b: Submission): number {
  const setA = new Set(tokenize(submissionText(a)))
  const setB = new Set(tokenize(submissionText(b)))
  if (setA.size === 0 || setB.size === 0) return 0

  let intersection = 0
  for (const t of setA) if (setB.has(t)) intersection++
  const union = setA.size + setB.size - intersection
  return union === 0 ? 0 : intersection / union
}

export type SimilarMatch = {
  submission: Submission
  score: number
  bureau: string
}

// Tuned against the seed data's intentional near-duplicates: two submissions
// that reuse the same pattern in different words (e.g. a public-facing,
// source-grounded assistant built for a different bureau) typically land
// around 0.08-0.25 token overlap, while genuinely unrelated submissions stay
// well under 0.07. Lower this if reviewers want to catch more distant
// "workflow sibling" matches at the cost of more false positives.
const DEFAULT_THRESHOLD = 0.07
const DEFAULT_LIMIT = 5

/**
 * Top-N other submissions whose similarity to `target` is at or above
 * `threshold`, sorted highest-first. Excludes `target` itself.
 */
export function findSimilar(
  target: Submission,
  all: Submission[],
  opts: { threshold?: number; limit?: number } = {},
): SimilarMatch[] {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD
  const limit = opts.limit ?? DEFAULT_LIMIT

  return all
    .filter((s) => s.id !== target.id)
    .map((s) => ({ submission: s, score: similarity(target, s), bureau: getBusinessUnit(s) }))
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
