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
import type { SubmissionComment, SubmissionStatus } from "@/lib/reviewWorkflow"
import { assigneeForBusinessUnit } from "@/lib/reviewWorkflow"

const MAX_SUBMISSIONS = 50 // server caps at 50 in the GET handler too

export type Submission = {
  id: string
  submittedAt: string
  formData: FormData
  // Workflow columns (present once the migration is applied); helpers in
  // lib/reviewWorkflow prefer these and fall back to form_data.
  status?: string
  ownerEmail?: string
  businessUnit?: string
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
    status: s.status,
    ownerEmail: s.ownerEmail,
    businessUnit: s.businessUnit,
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
  // Auto-assign the reviewer for this submission's business unit (set at submit).
  const office = (formData as Record<string, unknown>).submitterOffice as string | undefined
  const reviewer = office ? assigneeForBusinessUnit(office) : null
  const withAssignee: FormData = reviewer
    ? { ...formData, assignedReviewerName: reviewer.name, assignedReviewerEmail: reviewer.email }
    : formData
  const submission: Submission = {
    id: generateId(),
    submittedAt: new Date().toISOString(),
    formData: withAssignee,
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

/**
 * Merge a patch into a submission's form_data and persist via upsert. Used by
 * the review workflow to set status and append comments without a schema
 * change. Caller should refetch submissions afterward.
 */
export async function patchSubmissionFormData(
  id: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const existing = getCachedSubmissions().find((s) => s.id === id)
  if (!existing) return false
  const mergedFormData = { ...(existing.formData as Record<string, unknown>), ...patch }
  try {
    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, submittedAt: existing.submittedAt, formData: mergedFormData }),
    })
    return res.ok
  } catch (error) {
    console.error("patchSubmissionFormData threw:", error)
    return false
  }
}

/** Set the review status of a submission. */
export async function setSubmissionStatus(id: string, status: SubmissionStatus): Promise<boolean> {
  return patchSubmissionFormData(id, { reviewStatus: status })
}

/** Append a comment to a submission's thread (optionally also set status). */
export async function addSubmissionComment(
  id: string,
  comment: SubmissionComment,
  status?: SubmissionStatus,
): Promise<boolean> {
  const existing = getCachedSubmissions().find((s) => s.id === id)
  if (!existing) return false
  const fd = existing.formData as Record<string, unknown>
  const comments = Array.isArray(fd.comments) ? (fd.comments as SubmissionComment[]) : []
  const patch: Record<string, unknown> = { comments: [...comments, comment] }
  if (status) patch.reviewStatus = status
  return patchSubmissionFormData(id, patch)
}
