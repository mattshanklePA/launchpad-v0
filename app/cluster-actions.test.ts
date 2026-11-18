// @vitest-environment node
//
// FIX-5 (#352): assessCluster takes idea ids, loads the ideas on the server,
// keeps only what the caller may see, and caches by every member id plus a
// fingerprint of their content. Database and assistant are mocked.

import { describe, it, expect, beforeEach, vi } from "vitest"
import { signSession, SESSION_COOKIE_NAME } from "@/lib/session/token"

let jar: string | undefined
vi.mock("next/headers", () => ({
  cookies: () => ({ get: (n: string) => (n === SESSION_COOKIE_NAME && jar ? { value: jar } : undefined) }),
}))

type Row = { id: string; submitted_at: string; form_data: Record<string, unknown>; status: string | null; owner_email: string | null; business_unit: string | null; office: string | null }
let rows: Row[] = []
vi.mock("@/lib/supabaseClient", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        in: async (_col: string, ids: string[]) => ({ data: rows.filter((r) => ids.includes(r.id)), error: null }),
      }),
    }),
  }),
}))

vi.mock("@/lib/modelProvider", () => ({ getModel: () => "mock-model" }))
const generate = vi.fn()
vi.mock("@/lib/aiResilience", () => ({ generateObjectResilient: (...a: unknown[]) => generate(...a) }))

import { clusterFallback } from "@/lib/clusterFallback"

let assessCluster: typeof import("@/app/cluster-actions").assessCluster

const base = { userId: "u1", email: "me@x.gov", name: "Me", jobRole: "", businessUnit: "", office: "" }
const as = (role: "submitter" | "reviewer" | "admin", extra: Partial<typeof base> = {}) => signSession({ ...base, ...extra, role })

const row = (id: string, title: string, office: string): Row => ({
  id,
  submitted_at: "2026-01-01T00:00:00Z",
  form_data: { useCaseTitle: title, coreProblem: `Problem of ${title}`, reviewStatus: "submitted" },
  status: null,
  owner_email: "owner@x.gov",
  business_unit: "patents",
  office,
})

const OBJECT = { recommendation: "consolidate", headline: " Merge them ", reasons: ["a", "b", "c"], tradeoff: "t" }
const prompts = () => generate.mock.calls.map((c) => (c[1] as { messages: { content: string }[] }).messages[1].content)

beforeEach(async () => {
  // A fresh module per test, so the answer cache starts empty.
  vi.resetModules()
  ;({ assessCluster } = await import("@/app/cluster-actions"))
  process.env.KEYSTONE_SESSION_SECRET = "actions-secret-actions-secret"
  jar = as("admin")
  rows = [
    row("a", "Alpha idea", "office-1"),
    row("b", "Bravo idea", "office-1"),
    row("c", "Charlie idea", "office-1"),
    row("z", "Zulu idea", "office-2"),
  ]
  generate.mockReset().mockResolvedValue({ object: OBJECT })
})

describe("assessCluster", () => {
  it("gives the fallback and calls nothing when one id is outside the reviewer's office", async () => {
    jar = as("reviewer", { businessUnit: "patents", office: "office-1" })
    expect(await assessCluster(["a", "z"])).toEqual(clusterFallback())
    expect(generate).not.toHaveBeenCalled()
  })

  it("gives the fallback and calls nothing when an id is unknown", async () => {
    expect(await assessCluster(["a", "nope"])).toEqual(clusterFallback())
    expect(generate).not.toHaveBeenCalled()
  })

  it("gives the fallback and calls nothing for fewer than two ids or non-string ids", async () => {
    expect(await assessCluster(["a"])).toEqual(clusterFallback())
    expect(await assessCluster([] as string[])).toEqual(clusterFallback())
    expect(await assessCluster([{ id: "a" }, "b"] as unknown as string[])).toEqual(clusterFallback())
    expect(generate).not.toHaveBeenCalled()
  })

  it("assesses an in-scope group and does not share an answer between member sets with the same smallest id and count", async () => {
    await assessCluster(["a", "b"])
    await assessCluster(["a", "c"])
    expect(generate).toHaveBeenCalledTimes(2)
    expect(prompts()[0]).toContain("Bravo idea")
    expect(prompts()[1]).toContain("Charlie idea")
  })

  it("reuses the answer for the same members in any order", async () => {
    await assessCluster(["a", "b"])
    await assessCluster(["b", "a"])
    expect(generate).toHaveBeenCalledTimes(1)
  })

  it("does not reuse the answer once an idea's content has changed", async () => {
    await assessCluster(["a", "b"])
    rows[1].form_data = { ...rows[1].form_data, coreProblem: "A different problem now" }
    await assessCluster(["a", "b"])
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it("does not cache a failed AI call: the next call tries again", async () => {
    generate.mockRejectedValueOnce(new Error("down"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(await assessCluster(["a", "b"])).toEqual(clusterFallback())
    expect(await assessCluster(["a", "b"])).toMatchObject({ headline: "Merge them" })
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it("never sends idea content from the browser to the prompt", async () => {
    const forged = { id: "a", formData: { useCaseTitle: "FORGED title" } }
    await (assessCluster as unknown as (...a: unknown[]) => Promise<unknown>)([forged, "b"])
    await (assessCluster as unknown as (...a: unknown[]) => Promise<unknown>)(["a", "b"], [forged])
    for (const p of prompts()) {
      expect(p).not.toContain("FORGED")
      expect(p).toContain("Alpha idea")
    }
  })

  it("refuses a submitter before any lookup", async () => {
    jar = as("submitter")
    await expect(assessCluster(["a", "b"])).rejects.toMatchObject({ status: 403 })
    expect(generate).not.toHaveBeenCalled()
  })
})
