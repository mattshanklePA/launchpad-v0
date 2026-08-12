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

  it("renames the product to Keystone and the assistant to Plumb", () => {
    expect(doc.productName).toBe("Keystone")
    expect(doc.assistantName).toBe("Plumb")
  })

  it("anchors focus areas to the federal AI framework (OMB)", () => {
    expect(doc.focusAreas.length).toBeGreaterThan(0)
    expect(doc.focusAreas.some((f) => f.category.includes("OMB"))).toBe(true)
  })

  it("enables the AI Hub export feature", () => {
    expect(doc.features.aiHubExport).toBe(true)
  })
})

describe("submit-wizard dropdown options (issue #147 — USPTO-specific lists generalized to tenant config)", () => {
  it("keeps USPTO's exact pre-existing option values (unchanged default)", () => {
    expect(uspto.submitterRoles.map((o) => o.value)).toEqual([
      "patent_examiner", "trademark_examiner", "manager", "it_staff",
      "product_owner", "lead_product_owner", "developer", "other",
    ])
    expect(uspto.affectedSystems.map((o) => o.value)).toEqual([
      "patents", "trademarks", "it_systems", "cross_functional", "other",
    ])
    expect(uspto.targetAudiences.map((o) => o.value)).toEqual([
      "patent_examiner", "trademark_examiner", "supervisory_examiner", "product_owner",
      "lead_product_owner", "developer", "applicant", "other",
    ])
    expect(uspto.dataClassifications.map((o) => o.value)).toEqual(["unclassified", "cui", "il5", "il6"])
  })

  it("gives DoW the DoD Impact Levels, same as USPTO", () => {
    expect(dow.dataClassifications).toEqual(uspto.dataClassifications)
  })

  it("gives DoC FISMA impact levels instead of DoD Impact Levels", () => {
    const values = doc.dataClassifications.map((o) => o.value)
    expect(values).toEqual(["fisma_low", "fisma_moderate", "fisma_high"])
    expect(values.some((v) => v.startsWith("il"))).toBe(false)
  })

  it("gives DoC and DoW their own affected-system and target-audience options, not USPTO's", () => {
    expect(doc.affectedSystems).not.toEqual(uspto.affectedSystems)
    expect(dow.affectedSystems).not.toEqual(uspto.affectedSystems)
    expect(doc.targetAudiences).not.toEqual(uspto.targetAudiences)
    expect(dow.targetAudiences).not.toEqual(uspto.targetAudiences)
  })

  it("every tenant includes the option values its own existing seed data uses, so seed data keeps resolving to a label", () => {
    // Every tenant's seed data uses "other"; USPTO/DoW/DoC all use
    // "cross_functional" for affectedSystem; USPTO/DoC use "applicant" for
    // targetAudience (lib/seedSubmissions.ts, lib/seedSubmissionsDoc.ts,
    // db/migrations/dow/0002_dow_seed.sql).
    for (const tenant of [uspto, dow, doc]) {
      expect(tenant.affectedSystems.map((o) => o.value)).toContain("other")
      expect(tenant.affectedSystems.map((o) => o.value)).toContain("cross_functional")
      expect(tenant.targetAudiences.map((o) => o.value)).toContain("other")
    }
    for (const tenant of [uspto, doc]) {
      expect(tenant.targetAudiences.map((o) => o.value)).toContain("applicant")
    }
  })

  it("only USPTO has rallyExport on, so only USPTO's route options include Rally", () => {
    expect(uspto.features.rallyExport).toBe(true)
    expect(dow.features.rallyExport).toBe(false)
    expect(doc.features.rallyExport).toBe(false)
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

describe("org-tier labels (ISS-1 — tier vocabulary moved off hardcoded Commerce strings)", () => {
  const TIER_FIELDS = ["department", "unit", "unitPlural", "subUnit", "subUnitPlural"] as const

  it("every tenant defines all five tierLabels fields as non-empty strings", () => {
    for (const tenant of [uspto, dow, doc]) {
      for (const field of TIER_FIELDS) {
        const value = tenant.tierLabels[field]
        expect(typeof value, `${tenant.id}.tierLabels.${field}`).toBe("string")
        expect(value.trim().length, `${tenant.id}.tierLabels.${field}`).toBeGreaterThan(0)
      }
    }
  })

  // Regression guardrail: these are the exact words the DoC UI printed when
  // the tier vocabulary was hardcoded ("Bureau sign-off", "All bureaus",
  // "Office breakdown", "Department Dashboard", ...). If any of these change,
  // the Commerce tenant's rendered text changes with it.
  it("resolves DoC to the same words the UI printed before the sweep", () => {
    expect(doc.tierLabels).toEqual({
      department: "Department",
      unit: "Bureau",
      unitPlural: "Bureaus",
      subUnit: "Office",
      subUnitPlural: "Offices",
    })
    // Lowercased inline forms ("across bureaus", "your bureau's sign-off
    // progress", "{bureau} offices") have to resolve back too.
    expect(doc.tierLabels.unit.toLowerCase()).toBe("bureau")
    expect(doc.tierLabels.unitPlural.toLowerCase()).toBe("bureaus")
    expect(doc.tierLabels.subUnitPlural.toLowerCase()).toBe("offices")
    expect(doc.tierLabels.department.toLowerCase()).toBe("department")
  })

  it("keeps each tenant's middle tier in step with its own unit.label", () => {
    expect(doc.tierLabels.unit).toBe(doc.unit.label)
    expect(uspto.tierLabels.unit).toBe(uspto.unit.label)
    // DoW's form-field label is "Command / organization"; the tier noun drops
    // the slash so it reads in headings and inline sentences.
    expect(dow.unit.label).toBe("Command / organization")
    expect(dow.tierLabels.unit).toBe("Command")
  })

  it("never leaks Commerce's bureau vocabulary into USPTO or DoW", () => {
    for (const tenant of [uspto, dow]) {
      for (const field of TIER_FIELDS) {
        expect(tenant.tierLabels[field], `${tenant.id}.tierLabels.${field}`).not.toMatch(/bureau/i)
      }
    }
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

describe("product/assistant naming (issue #148 — Keystone/Plumb for DoC only)", () => {
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

    // Issue #162 slimmed the submit wizard to a 5-step idea flow and removed
    // the Strategic Alignment / Value steps' per-tenant org-name copy along
    // with them (that content is now filled in during vetting, not intake).
    // `getFormSteps()` is tenant-neutral wording now, so there's nothing
    // tenant-specific left to assert here beyond "it returns 7 steps."
    it("returns the 7-step idea intake flow regardless of tenant", () => {
      withTenant("doc", () => {
        expect(getFormSteps().map((s) => s.name)).toEqual([
          "Submitter Info",
          "Business Problem & Opportunity",
          "Proposed Solution & Benefits",
          "Technical Constraints",
          "Idea Overview",
          "Review & Submit",
          "Submission Complete",
        ])
      })
    })
  })

  describe("getOrgNameForUnit (bureau-level naming, issue #38)", () => {
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
      })
    })

    it("falls back to the department name when no bureau is set", () => {
      withTenant("doc", () => {
        expect(getOrgNameForUnit(undefined)).toBe("Department of Commerce")
        expect(getOrgNameForUnit("")).toBe("Department of Commerce")
      })
    })

    it("leaves USPTO and DoW unaffected even though their `unit.options` are populated", () => {
      withTenant("uspto", () => {
        expect(getOrgNameForUnit("patents")).toBe("USPTO")
      })
      withTenant("dow", () => {
        expect(getOrgNameForUnit("forscom")).toBe("Department of War")
      })
    })
  })
})
