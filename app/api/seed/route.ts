// /api/seed
//   POST → if the submissions table is empty, insert the active tenant's demo
//          submissions. Otherwise no-op. Idempotent and safe to call on load.
//   GET  → peek at seed status without mutating.
//
// Seed data is per-tenant: USPTO uses lib/seedSubmissions.ts, DoC uses
// lib/seedSubmissionsDoc.ts. Other tenants (DoW, ...) are seeded explicitly via
// SQL, so the route no-ops for them to avoid cross-tenant pollution.

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseClient"
import { seedSubmissions } from "@/lib/seedSubmissions"
import { docSeedSubmissions } from "@/lib/seedSubmissionsDoc"
import { getTenant } from "@/lib/tenant"
import type { Submission } from "@/lib/submissions"

// Pick the seed set for the active tenant. Returns null for tenants whose data
// is managed outside this route (seeded via SQL).
function seedForActiveTenant(): Submission[] | null {
  switch (getTenant().id) {
    case "uspto":
      return seedSubmissions
    case "doc":
      return docSeedSubmissions
    default:
      return null
  }
}

export async function POST() {
  try {
    const seedSet = seedForActiveTenant()
    if (!seedSet) {
      return NextResponse.json({ ok: true, seeded: false, reason: "tenant-managed seed" })
    }
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
    const rows = seedSet.map((s) => ({
      id: s.id,
      submitted_at: s.submittedAt,
      form_data: s.formData,
    }))
    const { error } = await supabase.from("submissions").insert(rows)
    if (error) throw error

    // Best-effort: sync the workflow columns (status / owner / business unit)
    // from each form_data so the pipeline kanban buckets seeds by their real
    // status and owners. Without this, the status column takes its DB default
    // ("submitted") and every seeded row stacks in one column. Mirrors the POST
    // /api/submissions handler; errors are swallowed if the columns aren't present.
    try {
      await Promise.all(
        seedSet.map((s) => {
          const fd = s.formData as Record<string, unknown>
          return supabase
            .from("submissions")
            .update({
              status: (fd.reviewStatus as string) || "submitted",
              owner_email: fd.submitterEmail ? String(fd.submitterEmail).toLowerCase() : null,
              business_unit: (fd.submitterOffice as string) || null,
              office: (fd.submitterSubOffice as string) || null,
            })
            .eq("id", s.id)
        }),
      )
    } catch (e) {
      console.warn("seed workflow column sync skipped:", e)
    }

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

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { count, error } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
    if (error) throw error
    const seedSet = seedForActiveTenant()
    return NextResponse.json({
      tenant: getTenant().id,
      existingCount: count ?? 0,
      seedAvailable: seedSet ? seedSet.length : 0,
      wouldSeed: Boolean(seedSet) && (count ?? 0) === 0,
    })
  } catch (error) {
    console.error("GET /api/seed failed:", error)
    return NextResponse.json(
      { error: "Failed to check seed status", detail: String(error) },
      { status: 500 },
    )
  }
}
