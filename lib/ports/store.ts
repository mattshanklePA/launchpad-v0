/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

import type { FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import type { SubmissionComment, SubmissionStatus } from "@/lib/reviewWorkflow"

/**
 * SubmissionStore port.
 *
 * Persistence for submissions, their status, and comments. The default is
 * Supabase (`lib/adapters/default/supabaseStore.ts`). An agency can run
 * LaunchPad against its own database by implementing this interface and wiring
 * it in `lib/submissionStore.ts`. See docs/BOUNDARY.md.
 *
 * Signatures match today's behavior: `getSubmissions` is a synchronous read
 * from the client-side cache; writes are async.
 */
export interface SubmissionStore {
  getSubmissions(): Submission[]
  saveSubmission(formData: FormData): Promise<Submission>
  clearSubmissions(): Promise<void>
  patchSubmissionFormData(id: string, patch: Record<string, unknown>): Promise<boolean>
  setSubmissionStatus(id: string, status: SubmissionStatus): Promise<boolean>
  addSubmissionComment(id: string, comment: SubmissionComment, status?: SubmissionStatus): Promise<boolean>
}
