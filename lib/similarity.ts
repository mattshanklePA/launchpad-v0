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
import { getTenant, type TenantConfig } from "@/lib/tenant"

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

function affectedAreaLabels(s: Submission, tenant: TenantConfig): string[] {
  const values = s.formData.affectedBusinessUnits || []
  return values.map((v) => tenant.affectedSystems.find((o) => o.value === v)?.label || v)
}

function audienceLabel(s: Submission, tenant: TenantConfig): string {
  const value = s.formData.targetAudience
  return value ? tenant.targetAudiences.find((o) => o.value === value)?.label || value : ""
}

// The five fields RD-4's "Why these matched" cluster panel scores — per-field
// Jaccard token overlap, additive to (never a replacement for) `similarity()`'s
// single blended score above. Doesn't change similarity()'s threshold or the
// cluster-detection machinery in lib/rationalization.ts.
const CLUSTER_SIGNAL_FIELDS: Array<{ label: string; text: (s: Submission, tenant: TenantConfig) => string }> = [
  {
    label: "Solution approach",
    text: (s) => [s.formData.proposedSolution, s.formData.solutionSummary].filter(Boolean).join(" "),
  },
  {
    label: "Problem statement",
    text: (s) => [s.formData.coreProblem, s.formData.problemDefinition].filter(Boolean).join(" "),
  },
  {
    label: "Users and context",
    text: (s, tenant) =>
      [s.formData.targetUserSummary, s.formData.targetUserContext, audienceLabel(s, tenant)].filter(Boolean).join(" "),
  },
  {
    label: "Affected areas",
    text: (s, tenant) => affectedAreaLabels(s, tenant).join(" "),
  },
  {
    label: "Benefits",
    text: (s) => [s.formData.userValue, s.formData.businessValue].filter(Boolean).join(" "),
  },
]

export type ClusterSignalRow = {
  label: string
  /** Percentage in [0, 100] — the pairwise-averaged Jaccard overlap for this field. */
  score: number
  /** Up to three tokens shared by every member, ranked by combined frequency (ties broken alphabetically). Empty when nothing is shared. */
  topTerms: string[]
}

function jaccardSets(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const t of a) if (b.has(t)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Per-field breakdown of why a rationalization cluster matched (RD-4's "Why
 * these matched" panel) — five fields, each scored as the Jaccard token
 * overlap averaged pairwise across every member (not just the first two), so
 * a 3+ member cluster's score reflects the whole group, not one pair.
 * `topTerms` is the tokens shared by every member for that field, ranked by
 * how often they appear across the group, so "Shared terms" never reorders
 * between renders. `[]` for a cluster of fewer than 2 members.
 */
export function clusterSignals(members: Submission[], tenant: TenantConfig = getTenant()): ClusterSignalRow[] {
  if (members.length < 2) return CLUSTER_SIGNAL_FIELDS.map((f) => ({ label: f.label, score: 0, topTerms: [] }))

  return CLUSTER_SIGNAL_FIELDS.map(({ label, text }) => {
    const tokenLists = members.map((m) => tokenize(text(m, tenant)))
    const tokenSets = tokenLists.map((tokens) => new Set(tokens))

    let pairCount = 0
    let scoreSum = 0
    for (let i = 0; i < tokenSets.length; i++) {
      for (let j = i + 1; j < tokenSets.length; j++) {
        scoreSum += jaccardSets(tokenSets[i], tokenSets[j])
        pairCount++
      }
    }
    const score = pairCount === 0 ? 0 : Math.round((scoreSum / pairCount) * 100)

    const shared = tokenSets.length > 0 ? [...tokenSets[0]].filter((t) => tokenSets.every((set) => set.has(t))) : []
    const frequency = new Map<string, number>()
    for (const tokens of tokenLists) {
      for (const t of tokens) {
        if (shared.includes(t)) frequency.set(t, (frequency.get(t) || 0) + 1)
      }
    }
    const topTerms = shared.sort((a, b) => (frequency.get(b)! - frequency.get(a)!) || a.localeCompare(b)).slice(0, 3)

    return { label, score, topTerms }
  })
}
