// F4-4 (#305): Reset Demo Data is DELETE /api/submissions then POST /api/seed.
// Run both against an in-memory table and check the ES2 set comes back exactly:
// same count, same ids, nothing left over from a rehearsal.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

type Row = { id: string; [k: string]: unknown }
let table: Row[] = []

function fakeSupabase() {
  return {
    from: () => ({
      select: (_cols: string, opts?: { count?: string; head?: boolean }) =>
        Promise.resolve(opts?.head ? { count: table.length, error: null } : { data: table, error: null }),
      insert: (rows: Row[]) => {
        table = [...table, ...rows]
        return Promise.resolve({ error: null })
      },
      delete: () => ({
        neq: () => {
          table = []
          return Promise.resolve({ error: null })
        },
      }),
    }),
  }
}

vi.mock("@/lib/supabaseClient", () => ({ getSupabaseAdmin: () => fakeSupabase() }))
vi.mock("@/lib/demoResetStamp", () => ({ stampDemoReset: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/session/guard", () => ({
  requireSession: () => ({ ok: true, session: { role: "admin", email: "avery.lang@es2.demo" } }),
}))

const prevTenant = process.env.NEXT_PUBLIC_TENANT
beforeEach(() => {
  process.env.NEXT_PUBLIC_TENANT = "es2"
  table = [
    { id: "es2-acws-clause-recommendation", form_data: {} },
    { id: "sub-rehearsal-1", form_data: { useCaseTitle: "Untitled idea" }, status: "submitted" },
    { id: "sub-rehearsal-2", form_data: { useCaseTitle: "Half-written" }, status: "draft" },
  ]
})
afterEach(() => {
  if (prevTenant === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = prevTenant
})

async function pressReset() {
  const { DELETE } = await import("@/app/api/submissions/route")
  const { POST } = await import("@/app/api/seed/route")
  const del = await DELETE(new Request("http://x/api/submissions", { method: "DELETE" }))
  expect(del.status).toBe(200)
  const seeded = await POST(new Request("http://x/api/seed", { method: "POST" }))
  expect(seeded.status).toBe(200)
  return seeded.json()
}

describe("Reset Demo Data on ES2 (F4-4)", () => {
  it("leaves exactly the ES2 seed set: same count, same ids, rehearsal ideas and drafts gone", async () => {
    const { es2SeedSubmissions } = await import("@/lib/seedSubmissionsEs2")
    const body = await pressReset()
    expect(body.insertedCount).toBe(es2SeedSubmissions.length)
    expect(table.map((r) => r.id).sort()).toEqual(es2SeedSubmissions.map((s) => s.id).sort())
    expect(table.some((r) => String((r.form_data as Record<string, unknown>)?.useCaseTitle) === "Untitled idea")).toBe(false)
    expect(table.some((r) => r.id.startsWith("sub-rehearsal"))).toBe(false)
  })

  it("stores the workflow columns the counts read from (status, office)", async () => {
    const { es2SeedSubmissions } = await import("@/lib/seedSubmissionsEs2")
    await pressReset()
    for (const s of es2SeedSubmissions) {
      const row = table.find((r) => r.id === s.id)!
      expect(row.status, s.id).toBe(s.formData.reviewStatus)
      expect(row.business_unit, s.id).toBe(s.formData.submitterOffice)
    }
  })
})
