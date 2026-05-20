// Submission persistence helpers — now backed by Supabase via /api/submissions.
//
// API surface kept intentionally close to the old localStorage version so
// callers compile with minimal changes:
//   - getSubmissions(): synchronous read from the DataProvider cache.
//   - saveSubmission(): async write to API; cache is refreshed by the caller
//     via useDataProvider().refetchSubmissions().
//   - clearSubmissions(): async — wipes table; caller should refetch.

import type { FormData } from "@/lib/steps"
import { getCachedSubmissions } from "@/lib/dataCache"

const MAX_SUBMISSIONS = 50 // server caps at 50 in the GET handler too

export type Submission = {
  id: string
  submittedAt: string
  formData: FormData
}

function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Synchronous read from the in-memory cache populated by DataProvider.
 * Returns empty array until DataProvider's first fetch completes.
 */
export function getSubmissions(): Submission[] {
  return getCachedSubmissions().slice(0, MAX_SUBMISSIONS).map((s) => ({
    id: s.id,
    submittedAt: s.submittedAt,
    formData: s.formData as FormData,
  }))
}

/**
 * Async write — inserts a row in Supabase. Returns the submission object
 * (locally generated id + timestamp).
 *
 * Callers that need to see this submission in the UI immediately should
 * call useDataProvider().refetchSubmissions() after this resolves, OR rely
 * on the next page-level reload to pick it up.
 */
export async function saveSubmission(formData: FormData): Promise<Submission> {
  const submission: Submission = {
    id: generateId(),
    submittedAt: new Date().toISOString(),
    formData,
  }
  try {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error("Save submission failed:", body)
    }
  } catch (error) {
    console.error("Save submission threw:", error)
  }
  return submission
}

export async function clearSubmissions(): Promise<void> {
  try {
    const res = await fetch("/api/submissions", { method: "DELETE" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error("Clear submissions failed:", body)
    }
  } catch (error) {
    console.error("Clear submissions threw:", error)
  }
}
