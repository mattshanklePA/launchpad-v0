// The cluster assessment `assessCluster` (app/cluster-actions.ts) returns
// when the model is unavailable. Lives here, not there, because that file is
// "use server" and outside the vitest include globs — same precedent as
// lib/readinessFallback.ts.

export type ClusterAssessment = {
  recommendation: "keep_separate" | "consolidate"
  headline: string
  reasons: string[]
  tradeoff: string
}

export function clusterFallback(): ClusterAssessment {
  return {
    recommendation: "keep_separate",
    headline: "Keep them separate, and link them.",
    reasons: [
      "Each submission carries its own approval record, and merging them drops that down to one.",
      "A shared match score does not by itself confirm the same users, workflow, or approval chain.",
      "Linking the submissions keeps the overlap visible to reviewers without merging their governance records.",
    ],
    tradeoff: "Consolidating would lose each program office's own approval record, which is hard to restore later.",
  }
}
