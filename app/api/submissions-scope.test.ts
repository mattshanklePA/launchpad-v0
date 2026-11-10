// @vitest-environment node
//
// SEC-2: the server applies visibleSubmissions with the verified session, in
// GET /api/submissions and both exports, and authorizes + time-stamps writes.
// Asserts response BODIES per role, against a small in-memory fake of Supabase.

import { describe, it, expect, beforeEach, vi } from "vitest"
import { signSession, SESSION_COOKIE_NAME } from "@/lib/session/token"

type Row = Record<string, any>
let rows: Row[] = []
let lastUpsert: Row | null = null

vi.mock("@/lib/supabaseClient", () => {
  const fake = {
    from() {
      let filterId: string | null = null
      let op: "select" | "other" = "select"
      let payload: Row | null = null
      const b: any = {
        select: () => b,
        order: () => b,
        limit: () => b,
        eq: (_c: string, v: string) => ((filterId = v), b),
        upsert: (r: Row) => ((op = "other"), (payload = r), (lastUpsert = r), b),
        update: () => ((op = "other"), b),
        then: (res: (v: unknown) => unknown) => {
          if (op === "other") {
            if (payload) rows = [...rows.filter((r) => r.id !== payload!.id), payload]
            return Promise.resolve({ data: null, error: null }).then(res)
          }
          const data = filterId ? rows.filter((r) => r.id === filterId) : rows
          return Promise.resolve({ data, error: null }).then(res)
        },
      }
      return b
    },
  }
  return { getSupabaseAdmin: () => fake }
})

import * as submissions from "@/app/api/submissions/route"
import * as exportOmb from "@/app/api/export/omb/route"
import * as exportApproval from "@/app/api/export/approval/route"

type Who = "alice" | "noaaNws" | "noaa" | "census" | "deptAdmin" | "osAdmin"
const SESSIONS: Record<Who, any> = {
  alice: { role: "submitter", email: "alice@x.gov", businessUnit: "noaa", office: "nws" },
  noaaNws: { role: "reviewer", email: "r1@x.gov", businessUnit: "noaa", office: "nws" },
  noaa: { role: "reviewer", email: "r2@x.gov", businessUnit: "noaa" },
  census: { role: "reviewer", email: "r3@x.gov", businessUnit: "census" },
  deptAdmin: { role: "admin", email: "a1@x.gov" },
  osAdmin: { role: "admin", email: "a2@x.gov", businessUnit: "os" },
}

function req(who: Who, method = "GET", body?: unknown): Request {
  const token = signSession({ userId: who, name: who, ...SESSIONS[who] })
  return new Request("http://localhost/api/x", {
    method,
    headers: { cookie: `${SESSION_COOKIE_NAME}=${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function row(id: string, owner: string, unit: string, office: string | null, extra: Row = {}): Row {
  return {
    id,
    submitted_at: "2026-01-01T00:00:00.000Z",
    form_data: { useCaseTitle: `T-${id}`, submitterEmail: owner, submitterOffice: unit, submitterSubOffice: office, reviewStatus: "in_review", ...extra },
    status: "in_review",
    owner_email: owner,
    business_unit: unit,
    office,
  }
}

beforeEach(() => {
  process.env.KEYSTONE_SESSION_SECRET = "scope-test-secret-scope-test-secret"
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  lastUpsert = null
  rows = [
    row("a", "alice@x.gov", "noaa", "nws"),
    row("b", "bob@x.gov", "noaa", "nos"),
    row("c", "cat@x.gov", "census", null),
  ]
})

const listIds = async (who: Who) => {
  const body = await (await submissions.GET(req(who))).json()
  return body.submissions.map((s: any) => s.id).sort()
}

describe("GET /api/submissions body per role", () => {
  it("submitter: only own records", async () => expect(await listIds("alice")).toEqual(["a"]))
  it("office-scoped reviewer: only their office", async () => expect(await listIds("noaaNws")).toEqual(["a"]))
  it("bureau reviewer: their bureau", async () => expect(await listIds("noaa")).toEqual(["a", "b"]))
  it("other bureau reviewer: only theirs", async () => expect(await listIds("census")).toEqual(["c"]))
  it("department admin and os admin: everything", async () => {
    expect(await listIds("deptAdmin")).toEqual(["a", "b", "c"])
    expect(await listIds("osAdmin")).toEqual(["a", "b", "c"])
  })
  it("scopes before capping: a submitter's record is found behind 60 newer others", async () => {
    rows = [...Array.from({ length: 60 }, (_, i) => row(`o${i}`, "bob@x.gov", "noaa", "nos")), row("mine", "alice@x.gov", "noaa", "nws")]
    expect(await listIds("alice")).toEqual(["mine"])
  })
})

describe("exports return only what the caller may see", () => {
  it("omb csv: submitter sees only own title", async () => {
    const csv = await (await exportOmb.GET(req("alice"))).text()
    expect(csv).toContain("T-a")
    expect(csv).not.toContain("T-b")
    expect(csv).not.toContain("T-c")
  })
  it("omb csv: department admin sees all", async () => {
    const csv = await (await exportOmb.GET(req("deptAdmin"))).text()
    for (const t of ["T-a", "T-b", "T-c"]) expect(csv).toContain(t)
  })
  it("approval csv: office reviewer sees only their office; census reviewer only census", async () => {
    const nws = await (await exportApproval.GET(req("noaaNws"))).text()
    expect(nws).toContain("T-a")
    expect(nws).not.toContain("T-b")
    expect(nws).not.toContain("T-c")
    const census = await (await exportApproval.GET(req("census"))).text()
    expect(census).toContain("T-c")
    expect(census).not.toContain("T-a")
  })
})

describe("POST /api/submissions write authorization per role", () => {
  const edit = (id: string, patch: Row) => {
    const r = rows.find((x) => x.id === id)!
    return { id, submittedAt: "1999-01-01T00:00:00.000Z", formData: { ...r.form_data, ...patch } }
  }

  it("submitter cannot change status of their own record", async () => {
    const res = await submissions.POST(req("alice", "POST", edit("a", { reviewStatus: "approved" })))
    expect(res.status).toBe(403)
    expect(lastUpsert).toBeNull()
  })
  it("submitter cannot change another person's record", async () => {
    const res = await submissions.POST(req("alice", "POST", edit("b", { useCaseTitle: "hijack" })))
    expect(res.status).toBe(403)
    expect(lastUpsert).toBeNull()
  })
  it("submitter can create their own new submission", async () => {
    const res = await submissions.POST(req("alice", "POST", { id: "new1", formData: { useCaseTitle: "N", submitterEmail: "someone-else@x.gov" } }))
    expect(res.status).toBe(200)
    expect(lastUpsert!.form_data.submitterEmail).toBe("alice@x.gov")
  })
  it("out-of-scope reviewer is refused", async () => {
    expect((await submissions.POST(req("census", "POST", edit("a", { reviewStatus: "approved" })))).status).toBe(403)
    expect((await submissions.POST(req("noaaNws", "POST", edit("b", { reviewStatus: "approved" })))).status).toBe(403)
  })
  it("in-scope reviewer signs off; signedOffAt is the server's clock, not the browser's", async () => {
    const forged = { bureau: "noaa", decision: "approved", signedOffByName: "x", signedOffByEmail: "x", signedOffAt: "1999-01-01T00:00:00.000Z" }
    const before = Date.now()
    const res = await submissions.POST(req("noaaNws", "POST", edit("a", { reviewStatus: "approved", bureauSignoff: forged })))
    expect(res.status).toBe(200)
    const at = new Date(lastUpsert!.form_data.bureauSignoff.signedOffAt).getTime()
    expect(at).toBeGreaterThanOrEqual(before)
    expect(lastUpsert!.form_data.bureauSignoff.signedOffByEmail).toBe("r1@x.gov")
    expect(lastUpsert!.submitted_at).toBe("2026-01-01T00:00:00.000Z")
  })
  it("department admin and os admin may write to any bureau", async () => {
    expect((await submissions.POST(req("deptAdmin", "POST", edit("c", { reviewStatus: "approved" })))).status).toBe(200)
    expect((await submissions.POST(req("osAdmin", "POST", edit("a", { reviewStatus: "approved" })))).status).toBe(200)
  })
})
