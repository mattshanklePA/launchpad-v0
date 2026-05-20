// /api/seed
//   POST → if submissions table is empty, insert the 5 demo submissions.
//          Otherwise no-op. Idempotent and safe to call on every page load.
//
// The seed data lives in lib/seedSubmissions.ts so we have one source of
// truth — the API just reads the array and bulk-inserts.

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseClient"
import { seedSubmissions } from "@/lib/seedSubmissions"

export async function POST() {
  try {
    const supabase = getSupabaseAdmin()

    // Idempotency check: count existing rows.
    const { count, error: countErr } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
    if (countErr) throw countErr

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        ok: true,
        seeded: false,
        existingCount: count,
        message: "Submissions already exist — seed skipped.",
      })
    }

    // Insert the seed set.
    const rows = seedSubmissions.map((s) => ({
      id: s.id,
      submitted_at: s.submittedAt,
      form_data: s.formData,
    }))
    const { error } = await supabase.from("submissions").insert(rows)
    if (error) throw error

    return NextResponse.json({
      ok: true,
      seeded: true,
      insertedCount: rows.length,
    })
  } catch (error) {
    console.error("POST /api/seed failed:", error)
    return NextResponse.json(
      { error: "Failed to seed submissions", detail: String(error) },
      { status: 500 },
    )
  }
}

// POST is the primary action, but allow GET to peek at the seed status without
// mutating — convenient for debugging.
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { count, error } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
    if (error) throw error
    return NextResponse.json({
      existingCount: count ?? 0,
      seedAvailable: seedSubmissions.length,
      wouldSeed: (count ?? 0) === 0,
    })
  } catch (error) {
    console.error("GET /api/seed failed:", error)
    return NextResponse.json(
      { error: "Failed to check seed status", detail: String(error) },
      { status: 500 },
    )
  }
}
