// /api/report
//   GET ?office=<id> → the executive portfolio report (F5-2, #319), worked out
//   on the server from only the ideas the caller may see. Admins and reviewers
//   only; not found where `features.portfolioReport` is off. The scoping and
//   the numbers live in lib/portfolioReportApi.ts so they can be tested without
//   Supabase.

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseClient"
import { submissionFromRow } from "@/lib/submissionFromRow"
import { errToDetail } from "@/lib/errToDetail"
import { fetchAllSubmissionRows } from "@/lib/fetchAllSubmissionRows"
import { requireSession, REVIEWER_UP } from "@/lib/session/guard"
import { buildReportResponse } from "@/lib/portfolioReportApi"
import { getTenant } from "@/lib/tenant"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

const NO_STORE = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate" } as const

export async function GET(req: Request) {
  const tenant = getTenant()
  const guard = requireSession(req, { role: REVIEWER_UP })
  if (!guard.ok) return guard.response
  if (!tenant.features.portfolioReport) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE })
  }
  try {
    const office = new URL(req.url).searchParams.get("office")
    const { rows } = await fetchAllSubmissionRows(getSupabaseAdmin())
    const result = buildReportResponse(rows.map(submissionFromRow), guard.session, tenant, office, Date.now())
    return NextResponse.json(result.body, { status: result.status, headers: NO_STORE })
  } catch (error) {
    console.error("GET /api/report failed:", error)
    return NextResponse.json(
      { error: "Failed to build the report", detail: errToDetail(error) },
      { status: 500, headers: NO_STORE },
    )
  }
}
