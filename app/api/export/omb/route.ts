// /api/export/omb
//   GET → downloads all submissions as a CSV in the OMB 2025 AI use case
//   inventory format, so a bureau/department can produce its mandated OMB
//   report straight from LaunchPad ("reporting is a byproduct of intake").
//
// Row mapping / CSV formatting is pure and lives in lib/ombExport.ts (see the
// field-mapping comment there) so it can be unit-tested without Supabase.

import { NextResponse } from "next/server"
import { getSupabaseAdmin, type DbSubmissionRow } from "@/lib/supabaseClient"
import { errToDetail } from "@/lib/errToDetail"
import { buildOmbCsv } from "@/lib/ombExport"
import { migrateFormData } from "@/lib/formDataMigrations"
import { getTenant } from "@/lib/tenant"
import type { Submission } from "@/lib/submissions"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

function fromRow(row: DbSubmissionRow): Submission {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    formData: migrateFormData(row.form_data) as Submission["formData"],
    status: row.status ?? undefined,
    ownerEmail: row.owner_email ?? undefined,
    businessUnit: row.business_unit ?? undefined,
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
    const tenant = getTenant()
    const csv = buildOmbCsv(submissions, { shortName: tenant.shortName, publicInquiryEmail: tenant.publicInquiryEmail })

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="omb-ai-use-case-inventory.csv"`,
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      },
    })
  } catch (error) {
    console.error("GET /api/export/omb failed:", error)
    return NextResponse.json(
      { error: "Failed to export OMB inventory", detail: errToDetail(error) },
      { status: 500 },
    )
  }
}
