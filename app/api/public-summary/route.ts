// /api/public-summary
//   GET → { submitted, deployed } — two counts, for the signed-out landing page.
//
// The one intentionally public read. /api/submissions is session-gated (#228);
// this must not weaken that, so it returns only the two numbers from
// lib/publicSummary.ts — no ids, titles, names, bureaus, or error detail.

import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabaseClient"
import { fetchAllSubmissionRows } from "@/lib/fetchAllSubmissionRows"
import { publicSummary } from "@/lib/publicSummary"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

const NO_STORE = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate" } as const

export async function GET(_req: Request) {
  try {
    const { rows } = await fetchAllSubmissionRows(getSupabaseAdmin())
    return NextResponse.json(publicSummary(rows), { headers: NO_STORE })
  } catch (err) {
    console.error("[public-summary] failed", err instanceof Error ? err.message : "unknown")
    return NextResponse.json({ error: "unavailable" }, { status: 500, headers: NO_STORE })
  }
}
