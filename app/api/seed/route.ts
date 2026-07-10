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
import { errToDetail } from "@/lib/errToDetail"
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

    // Build fully-formed rows up front — including the workflow columns
    // (status / owner / business unit / office) — so seeding is a single
    // insert instead of a bulk insert followed by up to N per-row updates.
    // That insert-then-update-per-row pattern was slow enough to make the
    // admin "Reset Demo Data" button look hung, and if the page was reloaded
    // mid-flight the per-row updates could be interrupted, leaving some rows
    // stuck on their DB-default status (e.g. no rejected/high-impact/reportable
    // example surfacing even though the seed data has them).
    const rows = seedSet.map((s) => {
      const fd = s.formData as Record<string, unknown>
      return {
        id: s.id,
        submitted_at: s.submittedAt,
        form_data: s.formData,
        status: (fd.reviewStatus as string) || "submitted",
        owner_email: fd.submitterEmail ? String(fd.submitterEmail).toLowerCase() : null,
        business_unit: (fd.submitterOffice as string) || null,
        office: (fd.submitterSubOffice as string) || null,
      }
    })

    // `office` only exists once the office-hierarchy migration has run;
    // retry as a single batch without it rather than failing the whole seed
    // (and rather than falling back per-row, which reintroduces the slowness
    // this rewrite is meant to avoid).
    let { error } = await supabase.from("submissions").insert(rows)
    if (error) {
      console.warn("seed insert (with office) failed, retrying without office:", error.message)
      const rowsWithoutOffice = rows.map(({ office: _office, ...rest }) => rest)
      ;({ error } = await supabase.from("submissions").insert(rowsWithoutOffice))
    }
    if (error) throw error

    return NextResponse.json({
      ok: true,
      seeded: true,
      insertedCount: rows.length,
    })
  } catch (error) {
    console.error("POST /api/seed failed:", error)
    return NextResponse.json(
      { error: "Failed to seed submissions", detail: errToDetail(error) },
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
      { error: "Failed to check seed status", detail: errToDetail(error) },
      { status: 500 },
    )
  }
}
