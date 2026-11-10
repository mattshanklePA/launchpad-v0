/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

// Server-side, per-call record of AI usage: one row per model call in the
// `ai_usage` table (db/migrations/0008_ai_usage.sql). Counts and timing only —
// never prompt or answer text, and no vendor or model name. Gives a real
// cost-per-idea number per tenant.
//
// recordAiUsage never throws: until the migration has been run on a site the
// table is missing, and an AI call must still succeed. It logs and moves on.

import { getSupabaseAdmin } from "@/lib/supabaseClient"
import { getTenant } from "@/lib/tenant"

export type AiUsageEvent = {
  action: string
  submissionId?: string | null
  tokensIn: number
  tokensOut: number
  durationMs: number
  success: boolean
}

export async function recordAiUsage(event: AiUsageEvent): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from("ai_usage")
      .insert({
        tenant: getTenant().id,
        action: event.action,
        submission_id: event.submissionId ?? null,
        tokens_in: event.tokensIn,
        tokens_out: event.tokensOut,
        duration_ms: event.durationMs,
        success: event.success,
      })
    if (error) console.warn("[aiUsageLog] insert skipped:", error.message)
  } catch (error) {
    console.warn("[aiUsageLog] insert skipped:", error instanceof Error ? error.message : error)
  }
}

// Output-length limits per action (tokens). Sized well above the largest
// schema each action returns so a normal answer is never cut off (a cut-off
// answer would fail validation and fall back to canned text); they exist to
// stop a runaway answer, not to shorten a good one.
export const DEFAULT_MAX_OUTPUT_TOKENS = 1500

const MAX_OUTPUT_TOKENS: Record<string, number> = {
  assessReadiness: 2500,
  suggestStrategicAlignment: 1200,
  validateAndRefineInput: 1500,
  suggestIdeaOverview: 800,
  assistReviewer: 1500,
  draftGovernanceFields: 2500,
  assessCluster: 1200,
  compareSubmissions: 3000,
}

export function maxOutputTokensFor(action: string): number {
  return MAX_OUTPUT_TOKENS[action] ?? DEFAULT_MAX_OUTPUT_TOKENS
}

export type AiUsageRow = {
  created_at: string
  action: string
  tokens_in: number | null
  tokens_out: number | null
  duration_ms: number | null
  success: boolean
}

export type AiUsageDay = { day: string; calls: number; failures: number; tokensIn: number; tokensOut: number }
export type AiUsageAction = { action: string; calls: number; failures: number; tokensIn: number; tokensOut: number; avgDurationMs: number }

/** Pure: roll rows up per UTC day (newest first) and per action (most calls first). */
export function summarizeAiUsage(rows: AiUsageRow[]): { days: AiUsageDay[]; actions: AiUsageAction[] } {
  const days = new Map<string, AiUsageDay>()
  const actions = new Map<string, AiUsageAction & { totalMs: number }>()
  for (const r of rows) {
    const day = r.created_at.slice(0, 10)
    const tin = r.tokens_in ?? 0
    const tout = r.tokens_out ?? 0
    const fail = r.success ? 0 : 1
    const d = days.get(day) ?? { day, calls: 0, failures: 0, tokensIn: 0, tokensOut: 0 }
    d.calls++
    d.failures += fail
    d.tokensIn += tin
    d.tokensOut += tout
    days.set(day, d)
    const a = actions.get(r.action) ?? { action: r.action, calls: 0, failures: 0, tokensIn: 0, tokensOut: 0, avgDurationMs: 0, totalMs: 0 }
    a.calls++
    a.failures += fail
    a.tokensIn += tin
    a.tokensOut += tout
    a.totalMs += r.duration_ms ?? 0
    actions.set(r.action, a)
  }
  return {
    days: [...days.values()].sort((x, y) => y.day.localeCompare(x.day)),
    actions: [...actions.values()]
      .sort((x, y) => y.calls - x.calls || x.action.localeCompare(y.action))
      .map(({ totalMs, ...a }) => ({ ...a, avgDurationMs: Math.round(totalMs / a.calls) })),
  }
}
