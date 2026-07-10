// Department approval report CSV — the roll-up reporting half of dispersed
// bureau sign-off (see lib/bureauSignoff.ts). Reuses the OMB export pattern
// (lib/ombExport.ts): pure mapping/formatting here so it's unit-testable
// without a live Supabase connection; app/api/export/approval/route.ts owns
// fetching submissions and streaming the response.

import type { Submission } from "@/lib/submissions"
import { businessUnitLabel, getBusinessUnit, getStatus, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { getBureauSignoff, getDepartmentApproval } from "@/lib/bureauSignoff"
import { csvLine } from "@/lib/csv"

export const APPROVAL_REPORT_COLUMNS = [
  "Bureau",
  "Use Case",
  "Status",
  "Signed-off By",
  "Signed-off At",
  "Department Approval",
] as const

/** Maps one submission to a CSV row (values in APPROVAL_REPORT_COLUMNS order). Pure — no I/O. */
export function mapSubmissionToApprovalRow(submission: Submission): string[] {
  const signoff = getBureauSignoff(submission)
  const departmentApproval = getDepartmentApproval(submission)
  return [
    businessUnitLabel(getBusinessUnit(submission)),
    String((submission.formData as Record<string, unknown>)?.useCaseTitle || ""),
    STATUS_LABEL[getStatus(submission)],
    signoff?.signedOffByName || "",
    signoff?.signedOffAt || "",
    departmentApproval ? `${departmentApproval.decision} by ${departmentApproval.byName}` : "",
  ]
}

/** Builds the full department approval report CSV: one row per submission. Pure — no I/O. */
export function buildApprovalReportCsv(submissions: Submission[]): string {
  const lines = [csvLine([...APPROVAL_REPORT_COLUMNS])]
  for (const s of submissions) lines.push(csvLine(mapSubmissionToApprovalRow(s)))
  return lines.join("\n") + "\n"
}
