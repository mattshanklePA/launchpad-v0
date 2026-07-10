// /api/export/approval
//   GET → downloads all submissions as a CSV department approval report
//   (bureau, use case, status, signed-off-by, signed-off-at, department
//   approval), so an OS/department admin can produce a roll-up report of
//   dispersed bureau sign-off straight from LaunchPad. See lib/bureauSignoff.ts.
//
// Row mapping / CSV formatting is pure and lives in lib/approvalReport.ts (see
// app/api/export/omb/route.ts for the identical pattern) so it can be
// unit-tested without Supabase.

import { NextResponse } from "next/server"
import { getSupabaseAdmin, type DbSubmissionRow } from "@/lib/supabaseClient"
import { errToDetail } from "@/lib/errToDetail"
import { buildApprovalReportCsv } from "@/lib/approvalReport"
import type { Submission } from "@/lib/submissions"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

function fromRow(row: DbSubmissionRow): Submission {
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

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("submitted_at", { ascending: false })
    if (error) throw error

    const submissions = (data || []).map((row) => fromRow(row as DbSubmissionRow))
    const csv = buildApprovalReportCsv(submissions)

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="department-approval-report.csv"`,
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      },
    })
  } catch (error) {
    console.error("GET /api/export/approval failed:", error)
    return NextResponse.json(
      { error: "Failed to export approval report", detail: errToDetail(error) },
      { status: 500 },
    )
  }
}
