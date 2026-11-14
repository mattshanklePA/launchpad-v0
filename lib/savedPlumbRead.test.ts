// @vitest-environment node
// Missing table (migration 0009 not run yet) must fall back without an error (issue #272).

import { describe, it, expect, vi } from "vitest"

const result = vi.fn()
vi.mock("@/lib/supabaseClient", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => result() }) }),
      upsert: () => result(),
    }),
  }),
}))

import { loadSavedPlumbRead, savePlumbRead } from "@/lib/savedPlumbRead"

const missing = { data: null, error: { message: 'relation "public.plumb_reads" does not exist' } }
const saved = { read: { verdict: "v", strengths: [], gaps: [], suggestedDisposition: "approve" as const, draftRequestInfo: "" }, fingerprint: "f", savedAt: "2026-11-14T00:00:00.000Z" }

describe("savedPlumbRead with the table missing", () => {
  it("load returns null instead of throwing", async () => {
    result.mockResolvedValue(missing)
    await expect(loadSavedPlumbRead("s1")).resolves.toBeNull()
  })
  it("load returns null when the client throws", async () => {
    result.mockImplementation(() => { throw new Error("no env") })
    await expect(loadSavedPlumbRead("s1")).resolves.toBeNull()
  })
  it("save does not throw", async () => {
    result.mockResolvedValue(missing)
    await expect(savePlumbRead("s1", saved)).resolves.toBeUndefined()
  })
  it("load maps a row back to a saved read", async () => {
    result.mockResolvedValue({ data: { read: saved.read, fingerprint: "f", saved_at: "2026-11-14T00:00:00Z" }, error: null })
    await expect(loadSavedPlumbRead("s1")).resolves.toEqual(saved)
  })
})
