/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Default adapter; not for redistribution.
 */

import type { FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import type { SubmissionStore } from "@/lib/ports/store"
import { getCachedSubmissions } from "@/lib/dataCache"
import type { SubmissionComment, SubmissionStatus } from "@/lib/reviewWorkflow"
import { assigneeForBusinessUnit } from "@/lib/reviewWorkflow"
import { migrateFormData } from "@/lib/formDataMigrations"
import { getTenant } from "@/lib/tenant"
import { buildRmfProfileSnapshotPatch } from "@/lib/rmfProfileReview"

const MAX_SUBMISSIONS = 50 // server caps at 50 in the GET handler too

function generateId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Synchronous read from the in-memory cache populated by DataProvider.
 * Returns empty array until DataProvider's first fetch completes.
 */
function getSubmissions(): Submission[] {
  return getCachedSubmissions().slice(0, MAX_SUBMISSIONS).map((s) => ({
    id: s.id,
    submittedAt: s.submittedAt,
    formData: migrateFormData(s.formData) as FormData,
    status: s.status,
    ownerEmail: s.ownerEmail,
    businessUnit: s.businessUnit,
    office: s.office,
  }))
}

async function saveSubmission(formData: FormData): Promise<Submission> {
  // Auto-assign the reviewer for this submission's business unit (set at submit).
  const office = (formData as Record<string, unknown>).submitterOffice as string | undefined
  const reviewer = office ? assigneeForBusinessUnit(office) : null
  const withAssignee: FormData = reviewer
    ? { ...formData, assignedReviewerName: reviewer.name, assignedReviewerEmail: reviewer.email }
    : formData

  // NIST AI RMF profile propose-then-confirm (lib/rmfProfileReview.ts,
  // Roadmap #22 story 4) — computed once here, at submission, and shown to
  // reviewers as a proposal they confirm or override; never recomputed
  // silently afterward. Tenant-gated so non-RMF tenants (USPTO/DoW) never
  // carry this extra data.
  const tenant = getTenant()
  const withRmf: FormData = tenant.features.rmf
    ? ({ ...withAssignee, ...buildRmfProfileSnapshotPatch(withAssignee, tenant) } as FormData)
    : withAssignee

  const submission: Submission = {
    id: generateId(),
    submittedAt: new Date().toISOString(),
    formData: withRmf,
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

async function clearSubmissions(): Promise<void> {
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

async function patchSubmissionFormData(id: string, patch: Record<string, unknown>): Promise<boolean> {
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

async function setSubmissionStatus(id: string, status: SubmissionStatus): Promise<boolean> {
  return patchSubmissionFormData(id, { reviewStatus: status })
}

async function addSubmissionComment(
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

/** Default SubmissionStore: Supabase via /api/submissions. */
export const supabaseStore: SubmissionStore = {
  getSubmissions,
  saveSubmission,
  clearSubmissions,
  patchSubmissionFormData,
  setSubmissionStatus,
  addSubmissionComment,
}
