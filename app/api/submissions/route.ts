// /api/submissions
//   GET    → list all submissions, newest first (capped at 50 for safety)
//   POST   → insert one (body: { id, submittedAt, formData })
//   DELETE → wipe all (used by the admin "Clear All Submissions" button)
//
// All operations use the server-side admin client which bypasses RLS.

import { NextResponse } from "next/server"
import { getSupabaseAdmin, type DbSubmissionRow } from "@/lib/supabaseClient"

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
}

function fromRow(row: DbSubmissionRow): ApiSubmission {
  return { id: row.id, submittedAt: row.submitted_at, formData: row.form_data }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(50)
    if (error) throw error
    const submissions = (data || []).map((row) => fromRow(row as DbSubmissionRow))
    return NextResponse.json({ submissions }, { headers: NO_STORE })
  } catch (error) {
    console.error("GET /api/submissions failed:", error)
    return NextResponse.json(
      { error: "Failed to fetch submissions", detail: String(error) },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
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
    const { error } = await supabase.from("submissions").upsert({
      id,
      submitted_at: submittedAt || new Date().toISOString(),
      form_data: formData,
    })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/submissions failed:", error)
    return NextResponse.json(
      { error: "Failed to save submission", detail: String(error) },
      { status: 500 },
    )
  }
}

export async function DELETE() {
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
      { error: "Failed to clear submissions", detail: String(error) },
      { status: 500 },
    )
  }
}
