// @vitest-environment node
//
// FIX-5 (#352): the delete behind Reset Demo Data also clears saved Plumb reads,
// and a missing plumb_reads table (the migration not yet run) is not an error.

import { describe, it, expect, vi, beforeEach } from "vitest"

let submissions: { id: string }[] = []
let reads: { submission_id: string }[] = []
let readsTableExists = true

vi.mock("@/lib/supabaseClient", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      delete: () => ({
        neq: async () => {
          if (table === "submissions") {
            submissions = []
            return { error: null }
          }
          if (table === "plumb_reads") {
            if (!readsTableExists) return { error: { message: 'relation "public.plumb_reads" does not exist' } }
            reads = []
            return { error: null }
          }
          return { error: { message: `unexpected table ${table}` } }
        },
      }),
    }),
  }),
}))
vi.mock("@/lib/session/guard", () => ({
  requireSession: () => ({ ok: true, session: { role: "admin", email: "a@x.gov" } }),
}))

import { DELETE } from "@/app/api/submissions/route"

const press = () => DELETE(new Request("http://x/api/submissions", { method: "DELETE" }))

beforeEach(() => {
  submissions = [{ id: "s1" }, { id: "s2" }]
  reads = [{ submission_id: "s1" }, { submission_id: "s2" }]
  readsTableExists = true
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

describe("DELETE /api/submissions", () => {
  it("clears the saved reads along with the ideas", async () => {
    const res = await press()
    expect(res.status).toBe(200)
    expect(submissions).toEqual([])
    expect(reads.find((r) => r.submission_id === "s1")).toBeUndefined()
    expect(reads).toEqual([])
  })

  it("still succeeds when there is no plumb_reads table", async () => {
    readsTableExists = false
    const res = await press()
    expect(res.status).toBe(200)
    expect(submissions).toEqual([])
  })
})
