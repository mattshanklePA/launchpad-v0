// /api/demo-reset
//   GET → { lastResetAt } — when "Reset Demo Data" last re-seeded this
//         tenant, or null if never / the demo_state table isn't migrated yet
//         (db/migrations/0007_demo_reset_stamp.sql). Browsers use it to clear
//         leftover unsubmitted drafts once per reset (lib/demoReset.ts).
// Written by POST /api/seed when it actually seeds.

import { NextResponse } from "next/server"
import { readLastDemoReset } from "@/lib/demoResetStamp"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export async function GET() {
  const lastResetAt = await readLastDemoReset()
  return NextResponse.json(
    { lastResetAt },
    { headers: { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate" } },
  )
}
