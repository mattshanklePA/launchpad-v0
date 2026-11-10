// /api/ai-usage  (admin only)
//   GET ?days=N → { days, actions, totals } — AI calls and tokens per day and per
//   action for this tenant over the last N days (default 30, max 90). Counts
//   only; no prompt/answer text and no vendor or model name. Returns empty
//   results if the ai_usage table isn't migrated yet
//   (db/migrations/0008_ai_usage.sql).

import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session/guard"
import { getSupabaseAdmin } from "@/lib/supabaseClient"
import { getTenant } from "@/lib/tenant"
import { summarizeAiUsage, type AiUsageRow } from "@/lib/aiUsageLog"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

const NO_STORE = { "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate" }

export async function GET(req: Request) {
  const guard = requireSession(req, { role: "admin" })
  if (!guard.ok) return guard.response

  const requested = Number(new URL(req.url).searchParams.get("days"))
  const days = Number.isFinite(requested) && requested > 0 ? Math.min(Math.floor(requested), 90) : 30
  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  let rows: AiUsageRow[] = []
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("ai_usage")
      .select("created_at, action, tokens_in, tokens_out, duration_ms, success")
      .eq("tenant", getTenant().id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50000)
    if (error) console.warn("[api/ai-usage] read skipped:", error.message)
    else rows = (data ?? []) as AiUsageRow[]
  } catch (error) {
    console.warn("[api/ai-usage] read skipped:", error instanceof Error ? error.message : error)
  }

  const summary = summarizeAiUsage(rows)
  const totals = summary.days.reduce(
    (t, d) => ({ calls: t.calls + d.calls, failures: t.failures + d.failures, tokensIn: t.tokensIn + d.tokensIn, tokensOut: t.tokensOut + d.tokensOut }),
    { calls: 0, failures: 0, tokensIn: 0, tokensOut: 0 },
  )
  return NextResponse.json({ ...summary, totals }, { headers: NO_STORE })
}
