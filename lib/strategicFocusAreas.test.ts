import { describe, it, expect, vi } from "vitest"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"

// getTenant() resolves the active tenant from NEXT_PUBLIC_TENANT at import
// time; mock it per-test so we can exercise both a bureau-aware tenant (DoC)
// and a tenant with no bureau-level focusAreas (USPTO) in the same run.
const { getTenant } = vi.hoisted(() => ({ getTenant: vi.fn() }))
vi.mock("@/lib/tenant", () => ({ getTenant }))

describe("getFocusAreasForUnit", () => {
  it("uses a bureau's own focusAreas when the submission names that bureau (DoC)", async () => {
    getTenant.mockReturnValue(doc)
    const { getFocusAreasForUnit } = await import("@/lib/strategicFocusAreas")

    const nist = getFocusAreasForUnit("nist")
    expect(nist.length).toBeGreaterThan(0)
    expect(nist.every((f) => f.category === "NIST")).toBe(true)
    expect(nist).not.toEqual(doc.focusAreas)
  })

  it("falls back to the department-level list when no bureau is given (DoC)", async () => {
    getTenant.mockReturnValue(doc)
    const { getFocusAreasForUnit } = await import("@/lib/strategicFocusAreas")

    expect(getFocusAreasForUnit(undefined)).toEqual(doc.focusAreas)
    expect(getFocusAreasForUnit("")).toEqual(doc.focusAreas)
  })

  it("falls back to the department-level list for a bureau with no focusAreas declared (DoC)", async () => {
    getTenant.mockReturnValue(doc)
    const { getFocusAreasForUnit } = await import("@/lib/strategicFocusAreas")

    expect(getFocusAreasForUnit("other")).toEqual(doc.focusAreas)
  })

  it("is unaffected for USPTO — always returns the tenant-level list", async () => {
    getTenant.mockReturnValue(uspto)
    const { getFocusAreasForUnit } = await import("@/lib/strategicFocusAreas")

    const businessUnitValue = uspto.unit.options[0]?.value
    expect(getFocusAreasForUnit(businessUnitValue)).toEqual(uspto.focusAreas)
    expect(getFocusAreasForUnit(undefined)).toEqual(uspto.focusAreas)
  })
})

describe("DoC bureau focusAreas coverage", () => {
  it("every bureau (other than the catch-all 'Other') declares its own focusAreas", () => {
    const withoutOther = doc.unit.options.filter((o) => o.value !== "other")
    for (const bureau of withoutOther) {
      expect(bureau.focusAreas?.length, `${bureau.value} should declare focusAreas`).toBeGreaterThan(0)
    }
  })
})
