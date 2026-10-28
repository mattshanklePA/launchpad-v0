/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

// Shared recovery path for every structured AI call (generateObject).
//
// Why: the model occasionally returns a correct answer wrapped one level deep,
// e.g. {"$PARAMETER_NAME": {...}}, or an answer that misses the schema. Every
// caller catches the error and falls back to canned text, so the screen looks
// like it "didn't work" with no visible error (DoC demo, 2026-10-28). This
// helper:
//   1. unwraps a single-key wrapper in place (no second model call),
//   2. otherwise asks the model once more,
//   3. otherwise rethrows so the caller's existing fallback still runs,
// and records every repair / retry / failure via lib/aiFailureLog so it can be
// looked at after the hosting provider's short log window has passed.

import { generateObject, NoObjectGeneratedError, type LanguageModel, type Prompt, type RepairTextFunction } from "ai"
import type { z } from "zod"
import { recordAiFailure } from "@/lib/aiFailureLog"

/**
 * If `text` is JSON of the form {"<anyKey>": {…}} — exactly one key whose value
 * is a plain object — return the inner object as JSON text. Otherwise null.
 * Pure; the AI SDK re-validates whatever this returns against the schema.
 */
export function unwrapWrappedObjectText(text: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
  const keys = Object.keys(parsed)
  if (keys.length !== 1) return null
  const inner = (parsed as Record<string, unknown>)[keys[0]]
  if (!inner || typeof inner !== "object" || Array.isArray(inner)) return null
  return JSON.stringify(inner)
}

type ResilientArgs<T> = {
  model: LanguageModel
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
} & Prompt

const MAX_ATTEMPTS = 2

function errorText(error: unknown): string | undefined {
  return NoObjectGeneratedError.isInstance(error) ? error.text : undefined
}

/**
 * Drop-in replacement for `generateObject({ model, schema, ...prompt })` that
 * repairs wrapped answers and retries once on an unusable answer. `label`
 * names the call site in the failure log (e.g. "validateAndRefineInput").
 */
export async function generateObjectResilient<T>(label: string, args: ResilientArgs<T>): Promise<{ object: T }> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let repairedFrom: string | undefined
    const repair: RepairTextFunction = async ({ text }) => {
      const fixed = unwrapWrappedObjectText(text)
      if (fixed !== null) repairedFrom = text
      return fixed
    }
    try {
      // The overloads of generateObject don't narrow on a spread Prompt union;
      // the args are exactly what each caller passed before this wrapper.
      const result = await generateObject({
        ...(args as Parameters<typeof generateObject>[0]),
        experimental_repairText: repair,
      } as Parameters<typeof generateObject>[0])
      if (repairedFrom !== undefined) {
        await recordAiFailure({ label, outcome: "repaired", attempt, rawText: repairedFrom })
      }
      if (attempt > 1) {
        await recordAiFailure({ label, outcome: "retried", attempt, error: lastError, rawText: errorText(lastError) })
      }
      return { object: result.object as T }
    } catch (error) {
      lastError = error
      console.warn(`[aiResilience] ${label} attempt ${attempt} failed:`, error instanceof Error ? error.message : error)
      // Only an unusable answer is worth asking again for. Network/API errors
      // are already retried inside the AI SDK; a third round-trip would only
      // add delay before the caller's fallback.
      if (!NoObjectGeneratedError.isInstance(error)) break
    }
  }
  await recordAiFailure({ label, outcome: "failed", attempt: MAX_ATTEMPTS, error: lastError, rawText: errorText(lastError) })
  throw lastError
}
