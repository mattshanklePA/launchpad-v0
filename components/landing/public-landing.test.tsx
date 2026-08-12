import { describe, it, expect, vi } from "vitest"

// The module self-hosts Fraunces/Public Sans via next/font, which only resolves
// under Next's build. Stub it so the copy builders can be imported directly.
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "", style: {} })
  return { Fraunces: font, Public_Sans: font }
})

import {
  landingStrings,
  heroPreviewItems,
  proofSignals,
  featureItems,
  howItWorksSteps,
} from "./public-landing"
import { ALL_TENANTS } from "@/lib/tenant"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { es2 } from "@/lib/tenant/es2"
import { tenantHasBureauTier } from "@/lib/rationalization"

// Both branches of every `bureauTier` conditional, for every tenant — the
// guardrails below have to hold for copy the reader can actually reach.
const CASES = ALL_TENANTS.flatMap((tenant) =>
  [true, false].map((bureauTier) => ({ tenant, bureauTier, strings: landingStrings(tenant, bureauTier) })),
)

describe("public landing copy (ISS-5)", () => {
  it("never names another organization or its programs", () => {
    // Asserted over rendered strings, not the file: `uspto-gray-text` and
    // friends are Tailwind class names, not copy.
    //
    // The tenant's own name is stripped first — the page legitimately says
    // "Strategic priorities at USPTO" on USPTO's own deployment. What must
    // never appear is somebody else's.
    const forbidden = ["USPTO", "Commerce", "Patents", "Trademarks", "Placeholder"]
    for (const { tenant, bureauTier, strings } of CASES) {
      const own = [tenant.orgName, tenant.shortName].filter(Boolean)
      for (const s of strings) {
        const withoutOwnName = own.reduce((acc, name) => acc.split(name).join(""), s)
        for (const word of forbidden) {
          expect(
            withoutOwnName.includes(word),
            `${tenant.id} (bureauTier=${bureauTier}): "${s}" names "${word}"`,
          ).toBe(false)
        }
      }
    }
  })

  it("keeps somebody else's name out even on the tenant most likely to leak one", () => {
    // ES2 shares no vocabulary with the three existing tenants, so anything
    // hardcoded in this file shows up here with nothing to hide behind.
    const page = landingStrings(es2, true).join(" ") + landingStrings(es2, false).join(" ")
    for (const word of ["USPTO", "Commerce", "Patents", "Trademarks", "Placeholder", "OMB", "Grant"]) {
      expect(page, word).not.toMatch(new RegExp(word, "i"))
    }
  })

  it("never renders an unfilled placeholder", () => {
    // The testimonial block shipped "[Placeholder: pilot … quote …]" to
    // production. Nothing on this page may read like that again.
    for (const { tenant, strings } of CASES) {
      for (const s of strings) {
        expect(s, `${tenant.id}: "${s}"`).not.toMatch(/\[Placeholder/i)
      }
    }
  })

  it("says OMB only where it resolves from a tenant-supplied field, never hardcoded", () => {
    // `inventoryLabel` is the field this issue added for exactly this. The one
    // other source is `riskFramework.label`, which the "Built to recognized AI
    // governance frameworks" card interpolates — USPTO's is
    // "DoC / OMB AI risk management" (accurate: USPTO is a Commerce bureau).
    // Neither is a string this file wrote.
    for (const { tenant, bureauTier, strings } of CASES) {
      for (const s of strings) {
        if (!s.includes("OMB")) continue
        const fromTenantField =
          (tenant.inventoryLabel.includes("OMB") && s.includes(tenant.inventoryLabel)) ||
          (tenant.riskFramework.label.includes("OMB") && s.includes(tenant.riskFramework.label))
        expect(
          fromTenantField,
          `${tenant.id} (bureauTier=${bureauTier}): "${s}" hardcodes OMB`,
        ).toBe(true)
      }
    }
    // The two tenants whose config never says OMB never see the word at all.
    for (const tenant of [dow, es2]) {
      expect(tenant.inventoryLabel).not.toMatch(/OMB/)
      expect(tenant.riskFramework.label).not.toMatch(/OMB/)
      for (const bureauTier of [true, false]) {
        expect(landingStrings(tenant, bureauTier).join(" "), tenant.id).not.toMatch(/OMB/)
      }
    }
  })

  it("no longer claims the inventory field set is captured at intake", () => {
    for (const { tenant, bureauTier, strings } of CASES) {
      const page = strings.join(" ")
      expect(page, `${tenant.id} (bureauTier=${bureauTier})`).not.toMatch(/34[- ]field/i)
      expect(page, `${tenant.id} (bureauTier=${bureauTier})`).not.toMatch(/all 34 fields/i)
      expect(page, `${tenant.id} (bureauTier=${bureauTier})`).not.toMatch(/from day one/i)
    }
    // What it says instead: a short intake, with the record completed in vetting.
    const [submit] = howItWorksSteps(es2, true)
    expect(submit.description).toBe(
      "Plumb walks a submitter through a short intake in about two minutes, asking the follow-up questions a reviewer would.",
    )
    expect(featureItems(es2, true)[0].description).toMatch(/during vetting/)
    expect(proofSignals(es2)[0].description).toMatch(/during vetting/)
  })

  it("drops the provenance card for every tenant and replaces it with a framework claim", () => {
    for (const tenant of ALL_TENANTS) {
      const signals = proofSignals(tenant)
      expect(signals).toHaveLength(3)
      expect(signals.map((s) => s.title)).not.toContain("USPTO & Commerce provenance")
      expect(signals[2].title).toBe("Built to recognized AI governance frameworks")
      expect(signals[2].description).toContain(tenant.riskFramework.label)
    }
  })
})

describe("landing inventoryLabel wiring (ISS-5)", () => {
  it("gives every tenant a non-empty inventoryLabel", () => {
    for (const tenant of ALL_TENANTS) {
      expect(typeof tenant.inventoryLabel, tenant.id).toBe("string")
      expect(tenant.inventoryLabel.trim().length, tenant.id).toBeGreaterThan(0)
    }
    expect(doc.inventoryLabel).toBe("OMB inventory")
    expect(uspto.inventoryLabel).toBe("OMB inventory")
    expect(dow.inventoryLabel).toBe("AI use case inventory")
    expect(es2.inventoryLabel).toBe("AI use case inventory")
  })

  it("resolves the inventory-facing copy from it", () => {
    const features = featureItems(es2, true)
    expect(features[1].title).toBe("Built-in AI use case inventory")
    expect(features[3].title).toBe("One-click AI use case inventory export")
    expect(howItWorksSteps(es2, true)[2].description).toContain("exports the current AI use case inventory")

    const docFeatures = featureItems(doc, true)
    expect(docFeatures[1].title).toBe("Built-in OMB inventory")
    expect(howItWorksSteps(doc, true)[2].description).toContain("exports the current OMB inventory in one click")
  })
})

describe("hero preview rows (ISS-5)", () => {
  const DEFAULT_LABELS = ["Duplicate detection assistant", "Grant application triage", "Correspondence summarizer"]

  it("leaves USPTO, DoW, and DoC on the unchanged default list", () => {
    for (const tenant of [uspto, dow, doc]) {
      expect(tenant.heroPreviewItems, `${tenant.id}.heroPreviewItems`).toBeUndefined()
      expect(heroPreviewItems(tenant).map((r) => r.label), tenant.id).toEqual(DEFAULT_LABELS)
      expect(heroPreviewItems(tenant).map((r) => r.status), tenant.id).toEqual(["needs_work", "ready", "early"])
    }
  })

  it("gives ES2 its own rows, none of them the civilian-agency default", () => {
    expect(heroPreviewItems(es2)).toEqual([
      { label: "Contract clause recommendation", status: "needs_work" },
      { label: "Training content refresh from doctrine", status: "ready" },
      { label: "FMS case document summarization", status: "early" },
    ])
    for (const label of heroPreviewItems(es2).map((r) => r.label)) {
      expect(DEFAULT_LABELS).not.toContain(label)
    }
  })
})

describe("landing copy still respects the tier-vocabulary sweep", () => {
  it("uses each tenant's own unit word in the bureau-tier duplicate copy", () => {
    expect(featureItems(es2, true)[2].title).toBe("Cross-program office duplicate detection")
    expect(featureItems(doc, true)[2].title).toBe("Cross-bureau duplicate detection")
    // Tenants without the tier get the neutral wording, unchanged.
    expect(featureItems(uspto, tenantHasBureauTier(uspto))[2].title).toBe("Duplicate detection")
  })
})
