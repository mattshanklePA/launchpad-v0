import { describe, it, expect } from "vitest"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { getTenant } from "@/lib/tenant"

describe("DoC tenant", () => {
  it("has id 'doc' and a bureau org taxonomy", () => {
    expect(doc.id).toBe("doc")
    expect(doc.unit.label).toBe("Bureau")
    const values = doc.unit.options.map((o) => o.value)
    expect(values).toContain("nist")
    expect(values).toContain("census")
    expect(values).toContain("uspto")
  })

  it("anchors focus areas to the federal AI framework (OMB)", () => {
    expect(doc.focusAreas.length).toBeGreaterThan(0)
    expect(doc.focusAreas.some((f) => f.category.includes("OMB"))).toBe(true)
  })

  it("enables the AI Hub export feature", () => {
    expect(doc.features.aiHubExport).toBe(true)
  })
})

describe("admin dashboard OKRs label", () => {
  it("never leaks another tenant's org name", () => {
    expect(doc.okrsLabel).not.toMatch(/Department of War|USPTO/i)
    expect(dow.okrsLabel).not.toMatch(/Commerce|OMB|USPTO/i)
    expect(uspto.okrsLabel).not.toMatch(/Department of War|Commerce|OMB/i)
  })

  it("keeps DoW's existing OKRs label unchanged", () => {
    expect(dow.okrsLabel).toBe("Department of War OKRs")
  })
})

describe("getTenant", () => {
  it("defaults to uspto when NEXT_PUBLIC_TENANT is unset", () => {
    expect(getTenant().id).toBe("uspto")
  })
})
