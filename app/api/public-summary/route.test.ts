// @vitest-environment node
//
// F3-6 item 2: the public landing counters. #228 put /api/submissions behind a
// session, which zeroed the signed-out counters. This route is the one
// intentionally public read, and it must stay incapable of weakening #228:
// exactly two numbers, nothing else, no matter what the rows contain.

import { describe, it, expect, vi, beforeEach } from "vitest"

let rows: unknown[] = []
let failWith: unknown = null

// The route counts in the database (FIX-4): it must never read the rows
// themselves. This fake only answers head-count queries, applying the .eq /
// .is filters to `rows`, and fails the test if anyone asks for row data.
let selects: { cols: string; opts: unknown }[] = []
vi.mock("@/lib/supabaseClient", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: (cols: string, opts?: { count?: string; head?: boolean }) => {
        selects.push({ cols, opts })
        if (!opts?.head) throw new Error("public-summary must not read rows")
        const filters: ((r: Record<string, unknown>) => boolean)[] = []
        const get = (r: Record<string, unknown>, col: string) =>
          col.includes("->>") ? (r[col.split("->>")[0]] as Record<string, unknown> | undefined)?.[col.split("->>")[1]] : r[col]
        const q: Record<string, unknown> = {
          eq: (col: string, v: unknown) => (filters.push((r) => get(r, col) === v), q),
          is: (col: string, v: unknown) => (filters.push((r) => (get(r, col) ?? null) === v), q),
          then: (resolve: (v: unknown) => unknown) => {
            if (failWith) return Promise.resolve({ count: null, error: failWith }).then(resolve)
            const count = (rows as Record<string, unknown>[]).filter((r) => filters.every((f) => f(r))).length
            return Promise.resolve({ count, error: null }).then(resolve)
          },
        }
        return q
      },
    }),
  }),
}))

import { GET } from "@/app/api/public-summary/route"

const row = (id: string, status: string | null, extra: Record<string, unknown> = {}) => ({
  id,
  submitted_at: "2026-01-01T00:00:00.000Z",
  form_data: { useCaseTitle: "SECRET TITLE", submitterName: "Jane Secret", submitterEmail: "jane@secret.gov" },
  status,
  owner_email: "jane@secret.gov",
  business_unit: "noaa",
  office: "nws",
  ...extra,
})

beforeEach(() => {
  failWith = null
  selects = []
  rows = []
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("GET /api/public-summary", () => {
  it("works signed out (no cookie) and returns exactly two counts", async () => {
    rows = [row("1", "submitted"), row("2", "approved"), row("3", "approved"), row("4", "in_review")]
    const res = await GET(new Request("http://localhost/api/public-summary"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.keys(body).sort()).toEqual(["deployed", "submitted"])
    expect(body).toEqual({ submitted: 4, deployed: 2 })
  })

  it("leaks nothing from the rows: no titles, names, emails, ids, or bureaus", async () => {
    rows = [row("1", "approved"), row("2", "submitted")]
    const res = await GET(new Request("http://localhost/api/public-summary"))
    const text = await res.text()
    for (const secret of ["SECRET TITLE", "Jane", "jane@", "noaa", "nws", "submitted_at"]) {
      expect(text).not.toContain(secret)
    }
    for (const v of Object.values(JSON.parse(text))) expect(typeof v).toBe("number")
  })

  it("falls back to the form's review status when the row has no status column", async () => {
    rows = [row("1", null, { form_data: { reviewStatus: "approved" } })]
    const body = await (await GET(new Request("http://localhost/api/public-summary"))).json()
    expect(body).toEqual({ submitted: 1, deployed: 1 })
  })

  it("returns zeros for an empty table", async () => {
    const body = await (await GET(new Request("http://localhost/api/public-summary"))).json()
    expect(body).toEqual({ submitted: 0, deployed: 0 })
  })

  it("on a data error returns an error status and no detail or data", async () => {
    failWith = new Error("db password is hunter2")
    const res = await GET(new Request("http://localhost/api/public-summary"))
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).not.toContain("hunter2")
    expect(JSON.parse(text)).toEqual({ error: "unavailable" })
  })

  it("counts in the database: only head-count queries, no row reads", async () => {
    rows = [row("1", "approved"), row("2", "submitted")]
    await GET(new Request("http://localhost/api/public-summary"))
    expect(selects.length).toBeGreaterThan(0)
    for (const s of selects) expect(s.opts).toMatchObject({ count: "exact", head: true })
  })

  it("is not cacheable", async () => {
    const res = await GET(new Request("http://localhost/api/public-summary"))
    expect(res.headers.get("cache-control")).toContain("no-store")
  })
})
