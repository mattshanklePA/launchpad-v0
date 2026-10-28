/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

// Best-effort, server-side record of AI calls that needed repair, a retry, or
// fell back to canned text. Written to the `ai_failures` table
// (db/migrations/0006_ai_failures.sql) so a demo-day failure can still be
// investigated after the hosting provider's short runtime-log window expires.
// Never throws: a missing table, missing env, or a network blip must not turn
// a recoverable AI hiccup into a user-visible error.

import { getSupabaseAdmin } from "@/lib/supabaseClient"
import { getTenant } from "@/lib/tenant"
import { getModelId } from "@/lib/modelProvider"

export type AiFailureOutcome = "repaired" | "retried" | "failed"

export type AiFailureEvent = {
  label: string
  outcome: AiFailureOutcome
  attempt: number
  error?: unknown
  rawText?: string
}

const MAX_TEXT = 4000

export async function recordAiFailure(event: AiFailureEvent): Promise<void> {
  const errorName = event.error instanceof Error ? event.error.name : event.error ? String(event.error) : null
  const errorMessage = event.error instanceof Error ? event.error.message : null
  console.warn(`[aiFailureLog] ${event.label}: ${event.outcome} (attempt ${event.attempt})${errorMessage ? ` — ${errorMessage}` : ""}`)
  try {
    const { error } = await getSupabaseAdmin()
      .from("ai_failures")
      .insert({
        tenant: getTenant().id,
        label: event.label,
        outcome: event.outcome,
        attempt: event.attempt,
        model_id: getModelId(),
        error_name: errorName,
        error_message: errorMessage?.slice(0, MAX_TEXT) ?? null,
        raw_text: event.rawText?.slice(0, MAX_TEXT) ?? null,
      })
    if (error) console.warn("[aiFailureLog] insert skipped:", error.message)
  } catch (error) {
    console.warn("[aiFailureLog] insert skipped:", error instanceof Error ? error.message : error)
  }
}
