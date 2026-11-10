// @vitest-environment node
//
// Table-driven check over EVERY route handler under app/api/: no session,
// tampered, expired, submitter, reviewer, admin → expected status. The data
// layer is mocked so a request that passes the guard stops at a harmless stub
// (we only assert the guard's verdict: 401/403 vs. "got past the guard").

import { describe, it, expect, beforeEach, vi } from "vitest"
import { signSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/session/token"

// Supabase stub: every query chain resolves to an empty, error-free result.
vi.mock("@/lib/supabaseClient", () => {
  const result = { data: [], error: null, count: 0 }
  const chain: any = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return (res: (v: unknown) => unknown) => Promise.resolve(result).then(res)
      return chain
    },
    apply() {
      return chain
    },
  })
  return { getSupabaseAdmin: () => chain }
})
vi.mock("@/lib/demoResetStamp", () => ({
  readLastDemoReset: async () => null,
  stampDemoReset: async () => null,
}))

import * as users from "@/app/api/users/route"
import * as userById from "@/app/api/users/[id]/route"
import * as login from "@/app/api/users/login/route"
import * as submissions from "@/app/api/submissions/route"
import * as formConfig from "@/app/api/form-config/route"
import * as seed from "@/app/api/seed/route"
import * as demoReset from "@/app/api/demo-reset/route"
import * as exportOmb from "@/app/api/export/omb/route"
import * as exportApproval from "@/app/api/export/approval/route"
import * as sessionRoute from "@/app/api/session/route"

type Who = "none" | "tampered" | "expired" | "submitter" | "reviewer" | "admin"
type Handler = (req: Request, ctx: { params: { id: string } }) => Promise<Response>

const base = { userId: "u1", email: "u@x.gov", name: "U", jobRole: "", businessUnit: "patents", office: "" }

function cookieFor(who: Who): string | null {
  switch (who) {
    case "none":
      return null
    case "tampered": {
      const [p, s] = signSession({ ...base, role: "submitter" }).split(".")
      const forged = JSON.parse(Buffer.from(p, "base64url").toString())
      forged.role = "admin"
      return `${SESSION_COOKIE_NAME}=${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${s}`
    }
    case "expired":
      return `${SESSION_COOKIE_NAME}=${signSession(
        { ...base, role: "admin" },
        Date.now() - (SESSION_TTL_SECONDS + 60) * 1000,
      )}`
    default:
      return `${SESSION_COOKIE_NAME}=${signSession({ ...base, role: who })}`
  }
}

function request(method: string, who: Who): Request {
  const headers: Record<string, string> = { "content-type": "application/json" }
  const c = cookieFor(who)
  if (c) headers.cookie = c
  const hasBody = method !== "GET" && method !== "DELETE"
  return new Request("http://localhost/api/x", {
    method,
    headers,
    body: hasBody ? JSON.stringify({}) : undefined,
  })
}

type Rule = "any" | "admin"
// [label, handler, method, who may call it]
const ROUTES: Array<[string, Handler, string, Rule]> = [
  ["GET /api/users", users.GET as Handler, "GET", "any"],
  ["POST /api/users", users.POST as Handler, "POST", "admin"],
  ["PATCH /api/users/[id]", userById.PATCH as Handler, "PATCH", "admin"],
  ["DELETE /api/users/[id]", userById.DELETE as Handler, "DELETE", "admin"],
  ["GET /api/submissions", submissions.GET as Handler, "GET", "any"],
  ["POST /api/submissions", submissions.POST as Handler, "POST", "any"],
  ["DELETE /api/submissions", submissions.DELETE as Handler, "DELETE", "admin"],
  ["GET /api/form-config", formConfig.GET as Handler, "GET", "any"],
  ["PUT /api/form-config", formConfig.PUT as Handler, "PUT", "admin"],
  ["GET /api/seed", seed.GET as Handler, "GET", "any"],
  ["POST /api/seed", seed.POST as Handler, "POST", "admin"],
  ["GET /api/demo-reset", demoReset.GET as Handler, "GET", "any"],
  ["GET /api/export/omb", exportOmb.GET as Handler, "GET", "any"],
  ["GET /api/export/approval", exportApproval.GET as Handler, "GET", "any"],
  ["GET /api/session", sessionRoute.GET as Handler, "GET", "any"],
  ["DELETE /api/session", sessionRoute.DELETE as Handler, "DELETE", "any"],
]

const ALLOWED: Record<Rule, Who[]> = {
  any: ["submitter", "reviewer", "admin"],
  admin: ["admin"],
}

beforeEach(() => {
  process.env.KEYSTONE_SESSION_SECRET = "route-table-secret-route-table"
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
})

describe("every API route enforces the session guard", () => {
  const cases: Array<[string, Handler, string, Who, number | "pass"]> = []
  for (const [label, handler, method, rule] of ROUTES) {
    for (const who of ["none", "tampered", "expired", "submitter", "reviewer", "admin"] as Who[]) {
      let expected: number | "pass"
      if (who === "none" || who === "tampered" || who === "expired") expected = 401
      else expected = ALLOWED[rule].includes(who) ? "pass" : 403
      cases.push([label, handler, method, who, expected])
    }
  }

  it.each(cases)("%s as %s", async (_label, handler, method, who, expected) => {
    const res = await handler(request(method, who), { params: { id: "user-x" } })
    if (expected === "pass") {
      expect([401, 403]).not.toContain(res.status)
    } else {
      expect(res.status).toBe(expected)
    }
  })

  it("covers every route.ts file under app/api (a new route must be added to this table)", async () => {
    const { globSync } = await import("node:fs")
    const files = globSync("app/api/**/route.ts").map((f) => f.replace(/\\/g, "/")).sort()
    const covered = [
      "app/api/demo-reset/route.ts",
      "app/api/export/approval/route.ts",
      "app/api/export/omb/route.ts",
      "app/api/form-config/route.ts",
      "app/api/seed/route.ts",
      "app/api/session/route.ts",
      "app/api/submissions/route.ts",
      "app/api/users/[id]/route.ts",
      "app/api/users/login/route.ts",
      "app/api/users/route.ts",
    ]
    expect(files).toEqual(covered)
    // login is the one intentionally open route; exercised in its own test.
    expect(typeof login.POST).toBe("function")
  })
})

describe("login issues the session cookie", () => {
  it("rejects missing credentials with 400 and sets no cookie", async () => {
    const res = await login.POST(
      new Request("http://localhost/api/users/login", { method: "POST", body: JSON.stringify({}) }),
    )
    expect(res.status).toBe(400)
    expect(res.headers.get("set-cookie")).toBeNull()
  })
})
