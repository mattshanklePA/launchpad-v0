// Tests for lib/aiUsageLog.ts — per-call AI usage records (issue #240).

import { describe, it, expect, vi, beforeEach } from "vitest"

const insert = vi.fn()
vi.mock("@/lib/supabaseClient", () => ({
  getSupabaseAdmin: () => ({ from: () => ({ insert: (...a: unknown[]) => insert(...a) }) }),
}))
vi.mock("@/lib/tenant", () => ({ getTenant: () => ({ id: "doc" }) }))

import { recordAiUsage, maxOutputTokensFor, summarizeAiUsage, DEFAULT_MAX_OUTPUT_TOKENS } from "@/lib/aiUsageLog"

beforeEach(() => {
  insert.mockReset()
})

describe("recordAiUsage", () => {
  it("writes one row with counts only — no prompt or answer text", async () => {
    insert.mockResolvedValue({ error: null })
    await recordAiUsage({ action: "assessReadiness", submissionId: "s1", tokensIn: 10, tokensOut: 5, durationMs: 120, success: true })
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith({
      tenant: "doc",
      action: "assessReadiness",
      submission_id: "s1",
      tokens_in: 10,
      tokens_out: 5,
      duration_ms: 120,
      success: true,
    })
  })

  it("never throws when the table is missing (error returned)", async () => {
    insert.mockResolvedValue({ error: { message: 'relation "ai_usage" does not exist' } })
    await expect(recordAiUsage({ action: "a", tokensIn: 1, tokensOut: 1, durationMs: 1, success: true })).resolves.toBeUndefined()
  })

  it("never throws when the insert itself throws", async () => {
    insert.mockImplementation(() => {
      throw new Error("network")
    })
    await expect(recordAiUsage({ action: "a", tokensIn: 1, tokensOut: 1, durationMs: 1, success: false })).resolves.toBeUndefined()
  })
})

describe("maxOutputTokensFor", () => {
  it("gives every known action a finite limit and unknown actions the default", () => {
    for (const a of ["assessReadiness", "suggestStrategicAlignment", "validateAndRefineInput", "suggestIdeaOverview", "assistReviewer", "draftGovernanceFields", "assessCluster", "compareSubmissions"]) {
      const n = maxOutputTokensFor(a)
      expect(n).toBeGreaterThan(0)
      expect(n).toBeLessThanOrEqual(DEFAULT_MAX_OUTPUT_TOKENS * 2)
    }
    expect(maxOutputTokensFor("somethingNew")).toBe(DEFAULT_MAX_OUTPUT_TOKENS)
  })
})

describe("summarizeAiUsage", () => {
  const rows = [
    { created_at: "2026-11-10T01:00:00Z", action: "a", tokens_in: 10, tokens_out: 5, duration_ms: 100, success: true },
    { created_at: "2026-11-10T09:00:00Z", action: "a", tokens_in: 20, tokens_out: 5, duration_ms: 300, success: false },
    { created_at: "2026-11-09T09:00:00Z", action: "b", tokens_in: 1, tokens_out: 2, duration_ms: 50, success: true },
  ]
  it("totals calls and tokens per day and per action", () => {
    const s = summarizeAiUsage(rows)
    expect(s.days).toEqual([
      { day: "2026-11-10", calls: 2, failures: 1, tokensIn: 30, tokensOut: 10 },
      { day: "2026-11-09", calls: 1, failures: 0, tokensIn: 1, tokensOut: 2 },
    ])
    expect(s.actions.find((x) => x.action === "a")).toEqual({ action: "a", calls: 2, failures: 1, tokensIn: 30, tokensOut: 10, avgDurationMs: 200 })
  })
})
