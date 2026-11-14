import { describe, it, expect } from "vitest"
import { buildReportResponse } from "@/lib/portfolioReportApi"
import { es2 } from "@/lib/tenant/es2"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import { dow } from "@/lib/tenant/dow"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { getBusinessUnit } from "@/lib/reviewWorkflow"
import type { SessionClaims } from "@/lib/session/token"

// F5-2 (#319): what the browser is sent. The server limits the ideas to what
// the signed-in person may see before any number is worked out.
const NOW = Date.parse("2026-12-10T17:00:00Z")
const session = (over: Partial<SessionClaims>): SessionClaims => ({
  userId: "u1", email: "who@es2.demo", name: "Who", role: "admin", businessUnit: null, office: null, iat: 0, exp: 0, ...over,
})
const ok = (r: ReturnType<typeof buildReportResponse>) => {
  if (r.status !== 200) throw new Error(`expected 200, got ${r.status}`)
  return r.body
}
const unitsIn = (ids: string[]) => new Set(es2SeedSubmissions.filter((s) => ids.includes(s.id)).map(getBusinessUnit))

describe("buildReportResponse", () => {
  it("is not found when the switch is off, for every other tenant", () => {
    for (const t of [uspto, doc, dow]) {
      expect(buildReportResponse(es2SeedSubmissions, session({}), t, null, NOW).status).toBe(404)
    }
  })

  it("refuses a submitter and nobody else", () => {
    expect(buildReportResponse(es2SeedSubmissions, session({ role: "submitter" }), es2, null, NOW).status).toBe(403)
    expect(buildReportResponse(es2SeedSubmissions, session({ role: "reviewer" }), es2, null, NOW).status).toBe(200)
    expect(buildReportResponse(es2SeedSubmissions, session({ role: "admin" }), es2, null, NOW).status).toBe(200)
  })

  it("an admin with no office sees every office and every idea", () => {
    const body = ok(buildReportResponse(es2SeedSubmissions, session({}), es2, null, NOW))
    expect(body.offices.map((o) => o.id)).toEqual(es2.unit.options.map((o) => o.value))
    expect(body.report.ideas).toHaveLength(es2SeedSubmissions.length)
    expect(body.totalIdeas).toBe(es2SeedSubmissions.length)
    expect(body.scoped).toBe(false)
  })

  it("a reviewer limited to one office receives only that office's ideas, and only that office", () => {
    const unit = "atr"
    const body = ok(buildReportResponse(es2SeedSubmissions, session({ role: "reviewer", businessUnit: unit }), es2, null, NOW))
    const expected = es2SeedSubmissions.filter((s) => getBusinessUnit(s) === unit)
    expect(expected.length).toBeGreaterThan(0)
    expect(expected.length).toBeLessThan(es2SeedSubmissions.length)
    expect(body.report.ideas.map((i) => i.id).sort()).toEqual(expected.map((s) => s.id).sort())
    expect(body.offices).toEqual([{ id: unit, label: es2.unit.options.find((o) => o.value === unit)!.label }])
    expect(body.report.offices.rows.map((r) => r.id)).toEqual([unit])
    expect(body.totalIdeas).toBe(expected.length)
    expect(body.scoped).toBe(true)
    expect(JSON.stringify(body)).not.toContain(es2SeedSubmissions.find((s) => getBusinessUnit(s) !== unit)!.id)
  })

  it("a limited reviewer asking for another office is refused, not shown it", () => {
    const r = buildReportResponse(es2SeedSubmissions, session({ role: "reviewer", businessUnit: "atr" }), es2, "hrfm", NOW)
    expect(r.status).toBe(400)
    expect(JSON.stringify(r)).not.toContain("hrfm-")
  })

  it("an office filter narrows the report; an unknown office is refused", () => {
    const body = ok(buildReportResponse(es2SeedSubmissions, session({}), es2, "hrfm", NOW))
    expect(body.report.officeId).toBe("hrfm")
    expect(unitsIn(body.report.ideas.map((i) => i.id))).toEqual(new Set(["hrfm"]))
    expect(buildReportResponse(es2SeedSubmissions, session({}), es2, "nowhere", NOW).status).toBe(400)
  })

  it("carries the time and whether this is demo data", () => {
    const body = ok(buildReportResponse(es2SeedSubmissions, session({}), es2, null, NOW))
    expect(body.now).toBe(NOW)
    expect(body.demo).toBe(true)
  })
})
