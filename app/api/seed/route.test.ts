// @vitest-environment node
//
// FIX-4 item 4: Reset Demo Data loads only the active site's demo data file, so
// an error in one site's file cannot break the reset on another.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const loaded: string[] = []

vi.mock("@/lib/supabaseClient", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => Promise.resolve({ count: 0, error: null }),
      insert: () => Promise.resolve({ error: null }),
    }),
  }),
}))
vi.mock("@/lib/demoResetStamp", () => ({ stampDemoReset: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/session/guard", () => ({
  requireSession: () => ({ ok: true, session: { role: "admin", email: "a@b.c" } }),
}))

const prevTenant = process.env.NEXT_PUBLIC_TENANT
// doMock + resetModules so each run re-evaluates the factories: a factory that
// runs is a demo data file that was loaded.
function mockSeedFiles() {
  vi.resetModules()
  loaded.length = 0
  const row = (id: string) => [{ id, submittedAt: "2026-01-01T00:00:00.000Z", formData: {} }]
  vi.doMock("@/lib/seedSubmissions", () => (loaded.push("uspto"), { seedSubmissions: row("u1") }))
  vi.doMock("@/lib/seedSubmissionsDoc", () => (loaded.push("doc"), { docSeedSubmissions: row("d1") }))
  vi.doMock("@/lib/seedSubmissionsEs2", () => (loaded.push("es2"), { es2SeedSubmissions: row("e1") }))
}
beforeEach(mockSeedFiles)
afterEach(() => {
  if (prevTenant === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = prevTenant
})

async function reset(tenant: string) {
  process.env.NEXT_PUBLIC_TENANT = tenant
  const { POST } = await import("@/app/api/seed/route")
  const res = await POST(new Request("http://x/api/seed", { method: "POST" }))
  return { res, body: await res.json() }
}

describe("POST /api/seed loads only the active site's demo data", () => {
  it.each([
    ["uspto", ["uspto"]],
    ["doc", ["doc"]],
    ["es2", ["es2"]],
    ["dow", []],
  ])("%s", async (tenant, expected) => {
    const { res } = await reset(tenant)
    expect(res.status).toBe(200)
    expect(loaded).toEqual(expected)
  })

  it("does not load the ES2 file when the route itself is imported", async () => {
    process.env.NEXT_PUBLIC_TENANT = "uspto"
    await import("@/app/api/seed/route")
    expect(loaded).toEqual([])
  })

  it("still seeds the active site's set", async () => {
    const { body } = await reset("doc")
    expect(body).toMatchObject({ ok: true, seeded: true, insertedCount: 1 })
  })
})
