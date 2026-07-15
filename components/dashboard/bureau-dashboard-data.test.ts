import { describe, it, expect } from "vitest"
import { bureauHierarchy, resolveBureauDrillScope } from "./bureau-dashboard-data"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"

describe("bureauHierarchy", () => {
  it("restricts the tree to just the viewer's own bureau and its offices (DoC)", () => {
    const scope: DashboardScope = { level: "bureau", businessUnit: "noaa" }
    const hierarchy = bureauHierarchy(scope, doc)
    expect(hierarchy.bureaus).toHaveLength(1)
    expect(hierarchy.bureaus[0].value).toBe("noaa")
    expect(hierarchy.bureaus[0].offices.length).toBeGreaterThan(0)
    expect(hierarchy.bureaus.some((b) => b.value === "census")).toBe(false)
  })

  it("restricts the tree the same way for an office-scoped viewer", () => {
    const scope: DashboardScope = { level: "office", businessUnit: "noaa", office: "nws" }
    const hierarchy = bureauHierarchy(scope, doc)
    expect(hierarchy.bureaus.map((b) => b.value)).toEqual(["noaa"])
  })

  it("returns a bureau with no offices for a tenant with no office tier (USPTO)", () => {
    const scope: DashboardScope = { level: "bureau", businessUnit: "patents" }
    const hierarchy = bureauHierarchy(scope, uspto)
    expect(hierarchy.bureaus).toHaveLength(1)
    expect(hierarchy.bureaus[0].offices).toEqual([])
  })

  it("is empty for department or personal scope (this view never renders for them)", () => {
    expect(bureauHierarchy({ level: "department" }, doc).bureaus).toEqual([])
    expect(bureauHierarchy({ level: "personal", email: "sam@doc.gov" }, doc).bureaus).toEqual([])
  })

  it("is empty when the session's business unit doesn't match any configured bureau", () => {
    const scope: DashboardScope = { level: "bureau", businessUnit: "ghost" }
    expect(bureauHierarchy(scope, doc).bureaus).toEqual([])
  })
})

describe("resolveBureauDrillScope", () => {
  const noaaBureau: DashboardScope = { level: "bureau", businessUnit: "noaa" }
  const noaaNws: DashboardScope = { level: "office", businessUnit: "noaa", office: "nws" }

  it("returns the base scope with no selection", () => {
    expect(resolveBureauDrillScope(noaaBureau, null)).toEqual(noaaBureau)
  })

  it("lets a bureau-scoped viewer drill into one of their own offices", () => {
    expect(resolveBureauDrillScope(noaaBureau, { businessUnit: "noaa", office: "nws" })).toEqual(noaaNws)
  })

  it("lets a bureau-scoped viewer re-select their own bureau root", () => {
    expect(resolveBureauDrillScope(noaaBureau, { businessUnit: "noaa" })).toEqual(noaaBureau)
  })

  it("never escapes to a different business unit, even if one were selectable", () => {
    expect(resolveBureauDrillScope(noaaBureau, { businessUnit: "census" })).toEqual(noaaBureau)
    expect(resolveBureauDrillScope(noaaBureau, { businessUnit: "census", office: "decennial" })).toEqual(noaaBureau)
  })

  it("never broadens an office-scoped viewer back out — every selection is ignored", () => {
    expect(resolveBureauDrillScope(noaaNws, { businessUnit: "noaa" })).toEqual(noaaNws)
    expect(resolveBureauDrillScope(noaaNws, { businessUnit: "noaa", office: "nmfs" })).toEqual(noaaNws)
    expect(resolveBureauDrillScope(noaaNws, null)).toEqual(noaaNws)
  })

  it("passes through unchanged for department or personal base scope", () => {
    const dept: DashboardScope = { level: "department" }
    const personal: DashboardScope = { level: "personal", email: "sam@doc.gov" }
    expect(resolveBureauDrillScope(dept, { businessUnit: "noaa" })).toEqual(dept)
    expect(resolveBureauDrillScope(personal, { businessUnit: "noaa" })).toEqual(personal)
  })
})
