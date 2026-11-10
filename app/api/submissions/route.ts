// /api/submissions
//   GET    → list the submissions the caller may see (visibleSubmissions with
//            the verified session), newest first, capped at 50 for safety
//   POST   → insert/update one (body: { id, submittedAt, formData }); authorized
//            and decision-time-stamped on the server (lib/serverAccess.ts)
//   DELETE → wipe all (used by the admin "Clear All Submissions" button)
//
// All operations use the server-side admin client which bypasses RLS.

import { NextResponse } from "next/server"
import { getSupabaseAdmin, type DbSubmissionRow } from "@/lib/supabaseClient"
import { errToDetail } from "@/lib/errToDetail"
import { requireSession } from "@/lib/session/guard"
import { authorizeWrite, visibleToSession } from "@/lib/serverAccess"
import type { Submission } from "@/lib/submissions"

export const dynamic = "force-dynamic" // never cache list reads
export const revalidate = 0
export const fetchCache = "force-no-store"

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
} as const

type ApiSubmission = {
  id: string
  submittedAt: string
  formData: Record<string, unknown>
  status?: string
  ownerEmail?: string
  businessUnit?: string
  office?: string
}

function fromRow(row: DbSubmissionRow): ApiSubmission {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    formData: row.form_data,
    status: row.status ?? undefined,
    ownerEmail: row.owner_email ?? undefined,
    businessUnit: row.business_unit ?? undefined,
    office: row.office ?? undefined,
  }
}

export async function GET(req: Request) {
  const guard = requireSession(req)
  if (!guard.ok) return guard.response
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("submitted_at", { ascending: false })
    if (error) throw error
    // Scope first, cap second: capping before filtering would hide a caller's
    // own records behind other people's newer ones.
    const submissions = visibleToSession(
      (data || []).map((row) => fromRow(row as DbSubmissionRow) as Submission),
      guard.session,
    ).slice(0, 50) as ApiSubmission[]
    return NextResponse.json({ submissions }, { headers: NO_STORE })
  } catch (error) {
    console.error("GET /api/submissions failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch submissions", detail: errToDetail(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const guard = requireSession(req)
  if (!guard.ok) return guard.response
  try {
    const body = await req.json()
    const { id, submittedAt, formData } = body
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }
    if (!formData || typeof formData !== "object") {
      return NextResponse.json({ error: "Missing formData" }, { status: 400 })
    }
    const supabase = getSupabaseAdmin()

    // Authorize against the stored record (not anything the browser claims) and
    // let the server stamp decision times.
    const { data: existingRows, error: lookupErr } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", id)
      .limit(1)
    if (lookupErr) throw lookupErr
    const existingRow = (existingRows || [])[0] as DbSubmissionRow | undefined
    const decision = authorizeWrite({
      session: guard.session,
      existing: existingRow ? (fromRow(existingRow) as Submission) : null,
      formData: formData as Record<string, unknown>,
      now: new Date().toISOString(),
    })
    if (!decision.ok) {
      return NextResponse.json({ error: decision.error }, { status: decision.status, headers: NO_STORE })
    }
    const authorizedFormData = decision.formData

    const { error } = await supabase.from("submissions").upsert({
      id,
      // An existing record keeps its original timestamp.
      submitted_at: existingRow?.submitted_at || submittedAt || new Date().toISOString(),
      form_data: authorizedFormData,
    })
    if (error) throw error

    // Best-effort sync of the workflow columns. These exist only after the
    // review-workflow migration is applied; until then this update no-ops
    // and form_data remains the source of truth. `office` is newer still (the
    // office-hierarchy migration) — if it's missing, the combined update
    // fails wholesale and status/owner/business_unit never sync either, so
    // retry without it rather than swallowing the whole update.
    try {
      const fd = authorizedFormData as Record<string, any>
      const columns = {
        status: fd.reviewStatus || "submitted",
        owner_email: fd.submitterEmail ? String(fd.submitterEmail).toLowerCase() : null,
        business_unit: fd.submitterOffice || null,
        office: fd.submitterSubOffice || null,
      }
      const { error: colErr } = await supabase.from("submissions").update(columns).eq("id", id)
      if (colErr) {
        console.warn("workflow column sync (with office) skipped:", colErr.message)
        const withoutOffice: Record<string, unknown> = { ...columns }
        delete withoutOffice.office
        const { error: fallbackErr } = await supabase
          .from("submissions")
          .update(withoutOffice)
          .eq("id", id)
        if (fallbackErr) console.warn("workflow column sync skipped:", fallbackErr.message)
      }
    } catch (e) {
      console.warn("workflow column sync threw:", e)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/submissions failed:", error)
    return NextResponse.json(
      { error: "Failed to save submission", detail: errToDetail(error) },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  const guard = requireSession(req, { role: "admin" })
  if (!guard.ok) return guard.response
  try {
    const supabase = getSupabaseAdmin()
    // Delete everything. Using neq on a column that always exists; Supabase
    // requires a WHERE clause on DELETE so .neq("id", "") matches all rows.
    const { error } = await supabase.from("submissions").delete().neq("id", "")
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/submissions failed:", error)
    return NextResponse.json(
      { error: "Failed to clear submissions", detail: errToDetail(error) },
      { status: 500 },
    )
  }
}
