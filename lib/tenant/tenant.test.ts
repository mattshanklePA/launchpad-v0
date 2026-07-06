import { describe, it, expect, afterEach } from "vitest"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { getTenant } from "@/lib/tenant"
import { getFormSteps } from "@/lib/steps"

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

describe("wizard step copy (issue #16 — DoW branding leaking into the DoC wizard)", () => {
  it("gives every tenant its own org name, never another tenant's", () => {
    expect(uspto.orgName).toBe("USPTO")
    expect(dow.orgName).toBe("Department of War")
    expect(doc.orgName).toBe("Department of Commerce")
  })

  it("never lets DoW/DoD-specific Feasibility & Security phrasing leak into doc or uspto", () => {
    const dodOnlyTerms = /\bDoD\b|DoDD|CDAO|Tradewinds|\bSRG\b/
    expect(doc.dataMaturityFraming).not.toMatch(dodOnlyTerms)
    expect(doc.modelSourcingGuidance).not.toMatch(dodOnlyTerms)
    expect(uspto.dataMaturityFraming).not.toMatch(dodOnlyTerms)
    expect(uspto.modelSourcingGuidance).not.toMatch(dodOnlyTerms)
    expect(doc.trlSystemName).toBeUndefined()
    expect(doc.srgCaveat).toBeUndefined()
    expect(doc.humanReviewCitation).toBeUndefined()
  })

  it("keeps DoW's Feasibility & Security copy exactly as before", () => {
    expect(dow.dataMaturityFraming).toBe(
      "In the DoD AI Hierarchy of Needs, AI-ready data is the foundation and maturity drives funding.",
    )
    expect(dow.modelSourcingGuidance).toBe(
      "DoD prefers American-built or U.S.-hosted models running inside the accredited boundary (e.g., Amazon Bedrock in GovCloud, authorized at IL4/IL5). Foreign/unknown sourcing requires additional review.",
    )
    expect(dow.trlSystemName).toBe("Tradewinds")
    expect(dow.srgCaveat).toBe("FedRAMP authorization alone does not satisfy the DoD SRG.")
    expect(dow.humanReviewCitation).toBe("Governable / DoDD 3000.09")
  })

  describe("getFormSteps()", () => {
    const withTenant = (id: string, run: () => void) => {
      const prev = process.env.NEXT_PUBLIC_TENANT
      process.env.NEXT_PUBLIC_TENANT = id
      try {
        run()
      } finally {
        if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
        else process.env.NEXT_PUBLIC_TENANT = prev
      }
    }

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_TENANT
    })

    it("names the DoC tenant, never 'Department of War', in the Value and Strategic Alignment steps", () => {
      withTenant("doc", () => {
        const steps = getFormSteps()
        const valueStep = steps.find((s) => s.name === "Value")!
        const alignmentStep = steps.find((s) => s.name === "Strategic Alignment")!
        expect(valueStep.prompt).toContain("Department of Commerce")
        expect(alignmentStep.title).toBe("Align with Department of Commerce Goals")
        expect(alignmentStep.prompt).not.toMatch(/Department of War/)
        expect(valueStep.prompt).not.toMatch(/Department of War/)
      })
    })

    it("keeps DoW's Strategic Alignment step copy exactly as before", () => {
      withTenant("dow", () => {
        const steps = getFormSteps()
        const alignmentStep = steps.find((s) => s.name === "Strategic Alignment")!
        expect(alignmentStep.title).toBe("Align with Department of War Goals")
        expect(alignmentStep.prompt).toBe("Does this align with the Department of War's strategic priorities? Which ones?")
      })
    })
  })
})
