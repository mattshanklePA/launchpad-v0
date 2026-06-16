/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

// Submission persistence — public API kept stable for all callers.
//
// The implementation lives behind the SubmissionStore port. These functions
// delegate to the active store (default: Supabase). To swap storage, change
// lib/submissionStore.ts; the signatures and import path here do not change,
// so callers are untouched. See docs/BOUNDARY.md.

import type { FormData } from "@/lib/steps"
import type { SubmissionComment, SubmissionStatus } from "@/lib/reviewWorkflow"
import { getStore } from "@/lib/submissionStore"

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

/** Synchronous read from the in-memory cache populated by DataProvider. */
export function getSubmissions(): Submission[] {
  return getStore().getSubmissions()
}

export function saveSubmission(formData: FormData): Promise<Submission> {
  return getStore().saveSubmission(formData)
}

export function clearSubmissions(): Promise<void> {
  return getStore().clearSubmissions()
}

export function patchSubmissionFormData(id: string, patch: Record<string, unknown>): Promise<boolean> {
  return getStore().patchSubmissionFormData(id, patch)
}

export function setSubmissionStatus(id: string, status: SubmissionStatus): Promise<boolean> {
  return getStore().setSubmissionStatus(id, status)
}

export function addSubmissionComment(
  id: string,
  comment: SubmissionComment,
  status?: SubmissionStatus,
): Promise<boolean> {
  return getStore().addSubmissionComment(id, comment, status)
}
