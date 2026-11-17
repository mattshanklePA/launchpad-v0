// /api/public-summary
//   GET → { submitted, deployed } — two counts, for the signed-out landing page.
//
// The one intentionally public read. /api/submissions is session-gated (#228);
// this must not weaken that, so it returns only the two numbers from
// lib/publicSummary.ts (PublicSummary) — no ids, titles, names, bureaus, or error detail.

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseClient"
import type { PublicSummary } from "@/lib/publicSummary"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

const NO_STORE = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate" } as const

// Counted in the database, never read row by row (FIX-4). "Deployed" is the
// same rule as publicSummary(): the status column, or the form's own review
// status for a row with no status column value.
async function countSummary(): Promise<PublicSummary> {
  const db = getSupabaseAdmin()
  const head = { count: "exact", head: true } as const
  const [all, approved, legacyApproved] = await Promise.all([
    db.from("submissions").select("id", head),
    db.from("submissions").select("id", head).eq("status", "approved"),
    db.from("submissions").select("id", head).is("status", null).eq("form_data->>reviewStatus", "approved"),
  ])
  const failed = all.error || approved.error || legacyApproved.error
  if (failed) throw failed
  return { submitted: all.count ?? 0, deployed: (approved.count ?? 0) + (legacyApproved.count ?? 0) }
}

export async function GET(_req: Request) {
  try {
    return NextResponse.json(await countSummary(), { headers: NO_STORE })
  } catch (err) {
    console.error("[public-summary] failed", err instanceof Error ? err.message : "unknown")
    return NextResponse.json({ error: "unavailable" }, { status: 500, headers: NO_STORE })
  }
}
