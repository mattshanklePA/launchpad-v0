// Department approval report CSV — the roll-up reporting half of dispersed
// bureau sign-off (see lib/bureauSignoff.ts). Reuses the OMB export pattern
// (lib/ombExport.ts): pure mapping/formatting here so it's unit-testable
// without a live Supabase connection; app/api/export/approval/route.ts owns
// fetching submissions and streaming the response.

import type { Submission } from "@/lib/submissions"
import { businessUnitLabel, getBusinessUnit, getStatus, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { getBureauSignoff, getDepartmentApproval } from "@/lib/bureauSignoff"
import { csvLine } from "@/lib/csv"
import { getTenant, type TenantConfig } from "@/lib/tenant"

/**
 * Column headers for one tenant. Only the org-unit column is tenant
 * vocabulary (`tierLabels.unit`); the rest describe the report itself. Unlike
 * `lib/ombExport.ts`, these are our own column names, not OMB's published
 * data dictionary — that file stays hardcoded on purpose.
 */
export function getApprovalReportColumns(tenant: TenantConfig = getTenant()): string[] {
  return [
    tenant.tierLabels.unit,
    "Use Case",
    "Status",
    "Signed-off By",
    "Signed-off At",
    "Department Approval",
  ]
}

/** The active tenant's column headers — same module-load snapshot pattern as `FIELD_REGISTRY`/`GLOSSARY`. */
export const APPROVAL_REPORT_COLUMNS: readonly string[] = getApprovalReportColumns()

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
export function buildApprovalReportCsv(submissions: Submission[], tenant: TenantConfig = getTenant()): string {
  const lines = [csvLine(getApprovalReportColumns(tenant))]
  for (const s of submissions) lines.push(csvLine(mapSubmissionToApprovalRow(s)))
  return lines.join("\n") + "\n"
}
