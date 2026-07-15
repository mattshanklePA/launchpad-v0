import { describe, it, expect, afterEach } from "vitest"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { getTenant, getOrgNameForUnit, tenantHasBureauTier } from "@/lib/tenant"
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

  it("renames the product to Warder and the assistant to Kestrel", () => {
    expect(doc.productName).toBe("Warder")
    expect(doc.assistantName).toBe("Kestrel")
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

describe("tenantHasBureauTier", () => {
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

  it("is true only for doc, whose bureaus declare their own focus areas", () => {
    withTenant("doc", () => expect(tenantHasBureauTier()).toBe(true))
    withTenant("uspto", () => expect(tenantHasBureauTier()).toBe(false))
    withTenant("dow", () => expect(tenantHasBureauTier()).toBe(false))
  })
})

describe("product/assistant naming (issue #31 — Warder/Kestrel for DoC only)", () => {
  it("keeps USPTO and DoW on LaunchPad + Scout, unaffected by the DoC rename", () => {
    expect(uspto.productName).toBe("LaunchPad")
    expect(uspto.assistantName).toBe("Scout")
    expect(dow.productName).toBe("LaunchPad")
    expect(dow.assistantName).toBe("Scout")
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

  describe("bureau-level Strategic Alignment copy (issue #38)", () => {
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

    it("names the submitter's bureau when it declares its own strategic priorities", () => {
      withTenant("doc", () => {
        expect(getOrgNameForUnit("census")).toBe("U.S. Census Bureau")
        const steps = getFormSteps("census")
        const alignmentStep = steps.find((s) => s.name === "Strategic Alignment")!
        expect(alignmentStep.title).toBe("Align with U.S. Census Bureau Goals")
        expect(alignmentStep.prompt).toBe("Does this align with the U.S. Census Bureau's strategic priorities? Which ones?")
      })
    })

    it("falls back to the department name when no bureau is set", () => {
      withTenant("doc", () => {
        expect(getOrgNameForUnit(undefined)).toBe("Department of Commerce")
        expect(getOrgNameForUnit("")).toBe("Department of Commerce")
        const steps = getFormSteps()
        const alignmentStep = steps.find((s) => s.name === "Strategic Alignment")!
        expect(alignmentStep.title).toBe("Align with Department of Commerce Goals")
      })
    })

    it("leaves USPTO and DoW unaffected even though their `unit.options` are populated", () => {
      withTenant("uspto", () => {
        expect(getOrgNameForUnit("patents")).toBe("USPTO")
        const steps = getFormSteps("patents")
        expect(steps.find((s) => s.name === "Strategic Alignment")!.title).toBe("Align with USPTO Goals")
      })
      withTenant("dow", () => {
        expect(getOrgNameForUnit("forscom")).toBe("Department of War")
        const steps = getFormSteps("forscom")
        expect(steps.find((s) => s.name === "Strategic Alignment")!.title).toBe("Align with Department of War Goals")
      })
    })
  })
})
