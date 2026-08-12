import { describe, it, expect, afterEach } from "vitest"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { es2 } from "@/lib/tenant/es2"
import { getTenant, getOrgNameForUnit, tenantHasBureauTier, ALL_TENANTS } from "@/lib/tenant"
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

describe("ES2 tenant (ISS-4 — Army CPE ES2)", () => {
  it("has id 'es2' and a program-office org taxonomy whose values the seed data and migration reference", () => {
    expect(es2.id).toBe("es2")
    expect(es2.unit.label).toBe("Program Office")
    // Load-bearing: db/migrations/es2/0000_es2_base_schema.sql's column
    // comments name these exact codes, as does the seed data.
    expect(es2.unit.options.map((o) => o.value)).toEqual(["atr", "hrfm", "logfin", "bts", "cerp"])
    const atr = es2.unit.options.find((o) => o.value === "atr")!
    expect(atr.offices?.map((o) => o.value)).toEqual(["acws", "atis", "fmsaces", "digitalmarket"])
    // Only AT&R has a third tier; the rest are program-office level only.
    for (const unit of es2.unit.options.filter((o) => o.value !== "atr")) {
      expect(unit.offices, `${unit.value}.offices`).toBeUndefined()
    }
  })

  it("keeps the org chart's own wording, including the ampersand-free AT&R name and the FMS-ACES en dash", () => {
    const byValue = Object.fromEntries(es2.unit.options.map((o) => [o.value, o.label]))
    expect(byValue.atr).toBe("Acquisition, Training and Readiness (AT&R)")
    expect(byValue.hrfm).toBe("Human Resources & Force Management (HR-FM)")
    expect(byValue.logfin).toBe("Logistics & Finance (LOG-FIN)")
    expect(byValue.bts).toBe("Business Technology Solutions (BTS)")
    expect(byValue.cerp).toBe("Consolidated ERP (C-ERP)")
    const atrOffices = Object.fromEntries(
      (es2.unit.options.find((o) => o.value === "atr")!.offices || []).map((o) => [o.value, o.label]),
    )
    expect(atrOffices.acws).toBe("Army Contract Writing System (ACWS)")
    expect(atrOffices.atis).toBe("Army Training Information System (ATIS)")
    expect(atrOffices.fmsaces).toBe("Foreign Military Sales – Army Case Execution System (FMS-ACES)")
    expect(atrOffices.digitalmarket).toBe("Digital Market")
  })

  it("gives every program office its own focus areas, which is what turns the bureau tier on", () => {
    for (const unit of es2.unit.options) {
      expect(unit.focusAreas?.length, `${unit.value}.focusAreas`).toBeGreaterThan(0)
    }
    expect(es2.unit.options.find((o) => o.value === "atr")!.focusAreas).toHaveLength(6)
    for (const unit of es2.unit.options.filter((o) => o.value !== "atr")) {
      expect(unit.focusAreas, `${unit.value}.focusAreas`).toHaveLength(3)
    }
  })

  it("anchors enterprise-level focus areas to the DoW AI Strategy and the ethical principles", () => {
    const categories = new Set(es2.focusAreas.map((f) => f.category))
    expect(categories).toEqual(new Set(["DoW AI Strategy", "DoW AI Ethical Principles"]))
    expect(es2.focusAreas.filter((f) => f.category === "DoW AI Ethical Principles")).toHaveLength(5)
  })

  it("stays a configured instance of Keystone/Plumb rather than a second product", () => {
    expect(es2.productName).toBe("Keystone")
    expect(es2.assistantName).toBe("Plumb")
  })

  it("leaves trlSystemName and heroImage unset", () => {
    // No downstream marketplace an internal submitter files into, and the hero
    // falls back to `theme.primary` rather than inheriting another org's image.
    expect(es2.trlSystemName).toBeUndefined()
    expect(es2.heroImage).toBeUndefined()
  })

  it("turns off Commerce's AI Hub export and the second department sign-off tier, keeps RMF on", () => {
    expect(es2.features.aiHubExport).toBe(false)
    expect(es2.features.departmentFinalApproval).toBe(false)
    expect(es2.features.rmf).toBe(true)
    expect(es2.features.rallyExport).toBe(false)
  })

  it("does not reuse DoW's submitterRole values, which are still USPTO's underneath", () => {
    const values = es2.submitterRoles.map((o) => o.value)
    expect(values).not.toContain("patent_examiner")
    expect(values).not.toContain("trademark_examiner")
    expect(values).toContain("contracting_officer")
    expect(es2.submitterRoles).not.toEqual(dow.submitterRoles)
  })

  // The naming rule, enforced: the department is the Department of War / DoW.
  // "DoDD 3000.09" is a published directive number and keeps its own spelling —
  // `\bDoD\b` does not match it, which is exactly the distinction being drawn.
  it("never uses a bare 'DoD' in any of its strings", () => {
    const strings: string[] = []
    const walk = (value: unknown) => {
      if (typeof value === "string") strings.push(value)
      else if (Array.isArray(value)) value.forEach(walk)
      else if (value && typeof value === "object") Object.values(value).forEach(walk)
    }
    walk(es2)
    expect(strings.length).toBeGreaterThan(50)
    for (const s of strings) expect(s, s.slice(0, 80)).not.toMatch(/\bDoD\b/)
    // The directive number survives the rule.
    expect(es2.humanReviewCitation).toBe("Governable / DoDD 3000.09")
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
    for (const tenant of ALL_TENANTS) {
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
    // Same words, so the form-field label and the tier noun can't drift apart.
    // Casing is allowed to differ: `unit.label` is a form-field label (sentence
    // case), `tierLabels.unit` is a tier noun composed into headings and other
    // labels (title case, consistent across tenants) — see uspto.ts.
    expect(doc.tierLabels.unit.toLowerCase()).toBe(doc.unit.label.toLowerCase())
    expect(uspto.tierLabels.unit.toLowerCase()).toBe(uspto.unit.label.toLowerCase())
    expect(uspto.tierLabels.unit).toBe("Business Unit")
    expect(uspto.unit.label).toBe("Business unit")
    // DoW's form-field label is "Command / organization"; the tier noun drops
    // the slash so it reads in headings and inline sentences.
    expect(dow.unit.label).toBe("Command / organization")
    expect(dow.tierLabels.unit).toBe("Command")
    expect(es2.tierLabels.unit).toBe(es2.unit.label)
  })

  // ISS-3B: `affectedBusinessUnits`' registry label is `Affected ${unitPlural}`,
  // so a tier label whose own words disagree on case produced the hybrid
  // "Affected Business units". Every registered tenant is checked, so adding a
  // fourth brings it under this guardrail automatically.
  it("title-cases every tier label, so composed strings never come out half-capitalized", () => {
    // Minor words stay lowercase mid-phrase under normal title-case rules
    // (e.g. a tenant naming its top tier "Office of the Secretary").
    const MINOR_WORDS = new Set(["of", "the", "and", "for", "a", "an", "in", "to"])
    const isTitleCase = (s: string) =>
      s.split(/\s+/).every((word, i) => {
        const firstLetter = word.replace(/[^A-Za-z]/g, "")[0]
        if (!firstLetter) return true
        if (i > 0 && MINOR_WORDS.has(word.toLowerCase())) return true
        return firstLetter === firstLetter.toUpperCase()
      })

    for (const tenant of ALL_TENANTS) {
      for (const field of TIER_FIELDS) {
        expect(isTitleCase(tenant.tierLabels[field]), `${tenant.id}.tierLabels.${field}`).toBe(true)
      }
      // The exact string the field registry composes.
      expect(
        isTitleCase(`Affected ${tenant.tierLabels.unitPlural}`),
        `${tenant.id}: "Affected ${tenant.tierLabels.unitPlural}"`,
      ).toBe(true)
    }
  })

  it("restores USPTO's pre-tierLabels wording for the composed affected-units label", () => {
    expect(`Affected ${uspto.tierLabels.unitPlural}`).toBe("Affected Business Units")
    expect(`Affected ${doc.tierLabels.unitPlural}`).toBe("Affected Bureaus")
    expect(`Affected ${dow.tierLabels.unitPlural}`).toBe("Affected Commands")
  })

  it("never leaks Commerce's bureau vocabulary into USPTO, DoW, or ES2", () => {
    for (const tenant of [uspto, dow, es2]) {
      for (const field of TIER_FIELDS) {
        expect(tenant.tierLabels[field], `${tenant.id}.tierLabels.${field}`).not.toMatch(/bureau/i)
      }
    }
  })

  it("gives ES2 its own program-office vocabulary, with no Commerce or USPTO words in it", () => {
    expect(es2.tierLabels).toEqual({
      department: "Enterprise",
      unit: "Program Office",
      unitPlural: "Program Offices",
      subUnit: "Program",
      subUnitPlural: "Programs",
    })
    for (const field of TIER_FIELDS) {
      expect(es2.tierLabels[field], `es2.tierLabels.${field}`).not.toMatch(/bureau|business unit|department|agency/i)
    }
  })
})

describe("getTenant", () => {
  it("defaults to uspto when NEXT_PUBLIC_TENANT is unset", () => {
    expect(getTenant().id).toBe("uspto")
  })

  it("resolves NEXT_PUBLIC_TENANT=es2 to the ES2 config, without moving the default", () => {
    const prev = process.env.NEXT_PUBLIC_TENANT
    process.env.NEXT_PUBLIC_TENANT = "es2"
    try {
      expect(getTenant()).toBe(es2)
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
      else process.env.NEXT_PUBLIC_TENANT = prev
    }
    expect(getTenant().id).toBe("uspto")
  })

  it("registers exactly the four tenants", () => {
    expect(ALL_TENANTS.map((t) => t.id).sort()).toEqual(["doc", "dow", "es2", "uspto"])
  })
})

// Adding a tenant must not change any existing tenant's rendered output. These
// pin the fields ES2 could plausibly have disturbed had it been built by
// editing shared config rather than adding a file.
describe("adding ES2 leaves USPTO, DoW, and DoC untouched (ISS-4 guardrail)", () => {
  it("keeps each existing tenant's identity and tier labels exactly as they were", () => {
    expect(uspto.tierLabels).toEqual({
      department: "Agency",
      unit: "Business Unit",
      unitPlural: "Business Units",
      subUnit: "Office",
      subUnitPlural: "Offices",
    })
    expect(dow.tierLabels).toEqual({
      department: "Department",
      unit: "Command",
      unitPlural: "Commands",
      subUnit: "Office",
      subUnitPlural: "Offices",
    })
    expect(doc.tierLabels).toEqual({
      department: "Department",
      unit: "Bureau",
      unitPlural: "Bureaus",
      subUnit: "Office",
      subUnitPlural: "Offices",
    })
    expect([uspto.productName, uspto.assistantName]).toEqual(["LaunchPad", "Scout"])
    expect([dow.productName, dow.assistantName]).toEqual(["LaunchPad", "Scout"])
    expect([doc.productName, doc.assistantName]).toEqual(["Keystone", "Plumb"])
  })

  it("keeps each existing tenant's org taxonomy and feature flags as they were", () => {
    expect(uspto.unit.label).toBe("Business unit")
    expect(dow.unit.label).toBe("Command / organization")
    expect(doc.unit.label).toBe("Bureau")
    expect(uspto.features.rallyExport).toBe(true)
    expect(doc.features.aiHubExport).toBe(true)
    expect(doc.features.departmentFinalApproval).toBe(true)
    expect(dow.features.rallyExport).toBe(false)
  })

  it("does not give ES2's program-office codes to anyone else", () => {
    for (const tenant of [uspto, dow, doc]) {
      const values = tenant.unit.options.map((o) => o.value)
      for (const code of ["atr", "hrfm", "logfin", "bts", "cerp"]) {
        expect(values, `${tenant.id} should not carry "${code}"`).not.toContain(code)
      }
    }
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

  it("is true for the tenants whose units declare their own focus areas (doc, es2)", () => {
    withTenant("doc", () => expect(tenantHasBureauTier()).toBe(true))
    // ES2 depends on this: it gates sign-off, cross-program rationalization,
    // and the roll-up views the demo is built around.
    withTenant("es2", () => expect(tenantHasBureauTier()).toBe(true))
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
