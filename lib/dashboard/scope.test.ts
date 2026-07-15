import { describe, it, expect } from "vitest"
import { getDashboardScope, getHierarchy, getScopeSubtree, isLevelAllowed } from "@/lib/dashboard/scope"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import type { Session } from "@/lib/auth"

function session(p: Partial<Session>): Session {
  return { userId: "u1", email: "viewer@doc.gov", name: "Viewer", role: "reviewer", loggedInAt: "2026-01-01", ...p }
}

describe("getDashboardScope", () => {
  it("is department scope with no session", () => {
    expect(getDashboardScope(null)).toEqual({ level: "department" })
  })

  it("is personal scope, keyed by email, for a submitter", () => {
    expect(getDashboardScope(session({ role: "submitter", email: "sam@doc.gov", businessUnit: "noaa" }))).toEqual({
      level: "personal",
      email: "sam@doc.gov",
    })
  })

  it("is bureau scope for a reviewer with a business unit and no office", () => {
    expect(getDashboardScope(session({ role: "reviewer", businessUnit: "noaa" }))).toEqual({
      level: "bureau",
      businessUnit: "noaa",
    })
  })

  it("is office scope for a reviewer with a business unit and an office", () => {
    expect(getDashboardScope(session({ role: "reviewer", businessUnit: "noaa", office: "nws" }))).toEqual({
      level: "office",
      businessUnit: "noaa",
      office: "nws",
    })
  })

  it("is bureau scope for a non-OS admin with a business unit (rolls down like a reviewer)", () => {
    expect(getDashboardScope(session({ role: "admin", businessUnit: "census" }))).toEqual({
      level: "bureau",
      businessUnit: "census",
    })
  })

  it("is department scope for an OS admin (business_unit = os)", () => {
    expect(getDashboardScope(session({ role: "admin", businessUnit: "os" }))).toEqual({ level: "department" })
  })

  it("is department scope for a department admin with no business unit", () => {
    expect(getDashboardScope(session({ role: "admin", businessUnit: undefined }))).toEqual({ level: "department" })
  })

  it("is department scope for a reviewer with no business unit assigned", () => {
    expect(getDashboardScope(session({ role: "reviewer", businessUnit: undefined }))).toEqual({ level: "department" })
  })
})

describe("getHierarchy", () => {
  it("exposes the department -> bureau -> office tree for a bureau-tier tenant (DoC)", () => {
    const hierarchy = getHierarchy(doc)
    const noaa = hierarchy.bureaus.find((b) => b.value === "noaa")!
    expect(noaa.offices.map((o) => o.value)).toEqual(["nws", "nmfs", "nesdis"])
    const nist = hierarchy.bureaus.find((b) => b.value === "nist")!
    expect(nist.offices).toEqual([])
  })

  it("returns bureaus with no offices for a tenant with no office tier (USPTO)", () => {
    const hierarchy = getHierarchy(uspto)
    expect(hierarchy.bureaus.every((b) => b.offices.length === 0)).toBe(true)
  })
})

describe("getScopeSubtree", () => {
  it("has no constraint for department scope", () => {
    expect(getScopeSubtree({ level: "department" })).toEqual([])
  })

  it("has no constraint for personal scope (constrained by owner email instead)", () => {
    expect(getScopeSubtree({ level: "personal", email: "sam@doc.gov" })).toEqual([])
  })

  it("constrains to one bureau for bureau scope", () => {
    expect(getScopeSubtree({ level: "bureau", businessUnit: "noaa" })).toEqual([{ businessUnit: "noaa" }])
  })

  it("constrains to one bureau + office for office scope", () => {
    expect(getScopeSubtree({ level: "office", businessUnit: "noaa", office: "nws" })).toEqual([
      { businessUnit: "noaa", office: "nws" },
    ])
  })
})

describe("isLevelAllowed", () => {
  it("lets a department scope render every level's cards", () => {
    const scope = { level: "department" as const }
    expect(isLevelAllowed(scope, "department")).toBe(true)
    expect(isLevelAllowed(scope, "bureau")).toBe(true)
    expect(isLevelAllowed(scope, "office")).toBe(true)
    expect(isLevelAllowed(scope, "personal")).toBe(true)
  })

  it("does not let a bureau scope render the department roll-up", () => {
    const scope = { level: "bureau" as const, businessUnit: "noaa" }
    expect(isLevelAllowed(scope, "department")).toBe(false)
    expect(isLevelAllowed(scope, "bureau")).toBe(true)
    expect(isLevelAllowed(scope, "office")).toBe(true)
  })

  it("only lets a personal scope render its own level", () => {
    const scope = { level: "personal" as const, email: "sam@doc.gov" }
    expect(isLevelAllowed(scope, "department")).toBe(false)
    expect(isLevelAllowed(scope, "bureau")).toBe(false)
    expect(isLevelAllowed(scope, "office")).toBe(false)
    expect(isLevelAllowed(scope, "personal")).toBe(true)
  })
})
