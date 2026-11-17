// @vitest-environment node
//
// FIX-2 (#338): getPlumbRead checks who is asking, loads the idea on the server
// by its id, and never trusts idea content from the browser. The database, the
// saved-read store and the assistant are mocked so the tests can read exactly
// what is loaded, saved and sent.

import { describe, it, expect, beforeEach, vi } from "vitest"
import { signSession, SESSION_COOKIE_NAME } from "@/lib/session/token"

let jar: string | undefined
vi.mock("next/headers", () => ({
  cookies: () => ({ get: (n: string) => (n === SESSION_COOKIE_NAME && jar ? { value: jar } : undefined) }),
}))

type Row = { id: string; submitted_at: string; form_data: Record<string, unknown>; status: string | null; owner_email: string | null; business_unit: string | null; office: string | null }
let rows: Row[] = []
const lookups: string[] = []
vi.mock("@/lib/supabaseClient", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: (_col: string, id: string) => ({
          limit: async () => {
            lookups.push(id)
            return { data: rows.filter((r) => r.id === id), error: null }
          },
        }),
      }),
    }),
  }),
}))

const load = vi.fn()
const save = vi.fn()
vi.mock("@/lib/savedPlumbRead", () => ({
  loadSavedPlumbRead: (...a: unknown[]) => load(...a),
  savePlumbRead: (...a: unknown[]) => save(...a),
}))
vi.mock("@/lib/modelProvider", () => ({ getModel: () => "mock-model" }))
const generate = vi.fn()
vi.mock("@/lib/aiResilience", () => ({ generateObjectResilient: (...a: unknown[]) => generate(...a) }))

import { getPlumbRead, assistReviewer, draftGovernanceFields } from "@/app/actions"

const base = { userId: "u1", email: "me@x.gov", name: "Me", jobRole: "", businessUnit: "", office: "" }
const as = (role: "submitter" | "reviewer" | "admin", extra: Partial<typeof base> = {}) => signSession({ ...base, ...extra, role })

const row = (id: string, formData: Record<string, unknown>, extra: Partial<Row> = {}): Row => ({
  id,
  submitted_at: "2026-01-01T00:00:00Z",
  form_data: formData,
  status: null,
  owner_email: "owner@x.gov",
  business_unit: "patents",
  office: null,
  ...extra,
})

const READ = { verdict: "v", strengths: [], gaps: [], suggestedDisposition: "approve", draftRequestInfo: "d" }
const NONE = { read: null, savedAt: null, source: "none" }

beforeEach(() => {
  process.env.KEYSTONE_SESSION_SECRET = "actions-secret-actions-secret"
  jar = undefined
  lookups.length = 0
  rows = [
    row("a", { useCaseTitle: "Stored title", coreProblem: "Stored problem", reviewStatus: "submitted" }, { business_unit: "patents", office: "office-1" }),
    row("b", { useCaseTitle: "Other office", coreProblem: "Other problem", reviewStatus: "submitted" }, { business_unit: "patents", office: "office-2" }),
    row("d", { useCaseTitle: "Decided", coreProblem: "Decided problem", reviewStatus: "approved" }, { business_unit: "patents", office: "office-1" }),
  ]
  load.mockReset().mockResolvedValue(null)
  save.mockReset().mockResolvedValue(undefined)
  generate.mockReset().mockResolvedValue({ object: READ })
})

describe("getPlumbRead", () => {
  it("refuses a submitter for their own idea and someone else's, before any lookup or AI call", async () => {
    jar = as("submitter", { email: "owner@x.gov" })
    await expect(getPlumbRead("a")).rejects.toMatchObject({ name: "SessionError", status: 403 })
    await expect(getPlumbRead("b")).rejects.toMatchObject({ name: "SessionError", status: 403 })
    expect(lookups).toEqual([])
    expect(load).not.toHaveBeenCalled()
    expect(generate).not.toHaveBeenCalled()
  })

  it("refuses a reviewer limited to one office for an idea in another office, with nothing about the idea", async () => {
    jar = as("reviewer", { businessUnit: "patents", office: "office-1" })
    const r = await getPlumbRead("b", true)
    expect(r).toEqual(NONE)
    expect(load).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    expect(generate).not.toHaveBeenCalled()
  })

  it("gives an unknown id the same refusal as an out-of-scope id", async () => {
    jar = as("reviewer", { businessUnit: "patents", office: "office-1" })
    expect(await getPlumbRead("nope")).toEqual(await getPlumbRead("b"))
    expect(generate).not.toHaveBeenCalled()
  })

  it("gives a reviewer in scope the read, and an admin too", async () => {
    jar = as("reviewer", { businessUnit: "patents", office: "office-1" })
    expect(await getPlumbRead("a")).toMatchObject({ read: READ, source: "new" })
    jar = as("admin")
    expect(await getPlumbRead("b")).toMatchObject({ read: READ, source: "new" })
  })

  it("returns the saved read for a decided stored record without a new read", async () => {
    load.mockResolvedValue({ read: READ, fingerprint: "old", savedAt: "2026-02-02T00:00:00.000Z" })
    jar = as("admin")
    expect(await getPlumbRead("d")).toEqual({ read: READ, savedAt: "2026-02-02T00:00:00.000Z", source: "saved" })
    expect(generate).not.toHaveBeenCalled()
  })

  it("decides 'decided' from the stored record: a decided record with no saved read does not re-read", async () => {
    jar = as("admin")
    expect(await getPlumbRead("d")).toEqual(NONE)
    expect(generate).not.toHaveBeenCalled()
  })

  it("with force, rebuilds the saved read from the stored record only", async () => {
    jar = as("admin")
    // Extra arguments a tampered browser might send are ignored.
    await (getPlumbRead as unknown as (...a: unknown[]) => Promise<unknown>)("a", true, { useCaseTitle: "FORGED title" })
    await (getPlumbRead as unknown as (...a: unknown[]) => Promise<unknown>)("a", { useCaseTitle: "FORGED title" }, true)
    const sent = generate.mock.calls.map((c) => (c[1] as { messages: { content: string }[] }).messages[1].content)
    expect(sent.length).toBeGreaterThan(0)
    for (const s of sent) {
      expect(s).toContain("Stored title")
      expect(s).not.toContain("FORGED")
    }
    for (const c of save.mock.calls) expect(c[0]).toBe("a")
  })
})

describe("reviewer-only AI actions", () => {
  it("assistReviewer and draftGovernanceFields refuse a submitter before any AI call", async () => {
    jar = as("submitter")
    await expect(assistReviewer({} as any)).rejects.toMatchObject({ status: 403 })
    await expect(draftGovernanceFields({} as any)).rejects.toMatchObject({ status: 403 })
    expect(generate).not.toHaveBeenCalled()
  })
})
