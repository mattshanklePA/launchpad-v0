// One database row as the Submission the report and the rest of the app read.
import type { DbSubmissionRow } from "@/lib/supabaseClient"
import type { Submission } from "@/lib/submissions"

export function submissionFromRow(row: DbSubmissionRow): Submission {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    formData: row.form_data as Submission["formData"],
    status: row.status ?? undefined,
    ownerEmail: row.owner_email ?? undefined,
    businessUnit: row.business_unit ?? undefined,
    office: row.office ?? undefined,
  }
}
