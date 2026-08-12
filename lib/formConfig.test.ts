import { describe, it, expect, afterEach } from "vitest"
import { setCachedFormConfig } from "@/lib/dataCache"
import { getFormConfig, isFieldEnabled, isFieldMandatory, isFieldVisible, setFieldMandatory } from "@/lib/formConfig"
import { initialFormData, type FormData } from "@/lib/steps"
import { doc } from "@/lib/tenant/doc"
import type { TenantConfig } from "@/lib/tenant"

// ISS-2: the permission-denied message names two org tiers, so it reads from
// the tenant. This path returns before any I/O, so no fetch mock is needed.
describe("setFieldMandatory — permission message wording", () => {
  // A bureau-scoped admin: `canMarkFieldMandatory` is false for them, which is
  // the branch that produces the message.
  const bureauAdmin = { role: "admin" as const, businessUnit: "noaa" }

  it("uses Commerce's tier words for the DoC tenant", async () => {
    const result = await setFieldMandatory("coreProblem", true, "a@doc.gov", bureauAdmin, doc)
    expect(result).toEqual({
      ok: false,
      error: "Only a department-level admin can mark a field mandatory for all bureaus",
    })
  })

  it("uses a non-Commerce bureau-tier tenant's own tier words", async () => {
    const es2 = {
      ...doc,
      id: "es2",
      tierLabels: { department: "Command", unit: "Directorate", unitPlural: "Directorates", subUnit: "Branch", subUnitPlural: "Branches" },
    } as TenantConfig
    const result = await setFieldMandatory("coreProblem", true, "a@es2.mil", bureauAdmin, es2)
    expect(result.error).toBe("Only a command-level admin can mark a field mandatory for all directorates")
  })
})

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
  setCachedFormConfig({ enabled: {}, mandatory: {}, updatedAt: new Date(0).toISOString() })
})

describe("isFieldMandatory", () => {
  it("is true for an OMB-level field on a bureau-tier tenant even though the registry entry itself is unlocked", () => {
    withTenant("doc", () => {
      expect(isFieldMandatory("stageOfDevelopment")).toBe(true)
    })
  })

  it("is false for the same OMB field on a flat tenant unless the admin explicitly toggled it — reads the plain enabled map instead", () => {
    withTenant("uspto", () => {
      expect(isFieldMandatory("stageOfDevelopment")).toBe(false)
    })
  })

  it("is true once an admin-set mandatory override is recorded", () => {
    withTenant("doc", () => {
      setCachedFormConfig({ enabled: {}, mandatory: { problemImpact: true }, updatedAt: new Date(0).toISOString() })
      expect(isFieldMandatory("problemImpact")).toBe(true)
      expect(isFieldMandatory("targetAudience")).toBe(false)
    })
  })
})

describe("isFieldEnabled", () => {
  it("hides a bureau-scoped field from a submitter outside that bureau (mechanism-level check via businessUnit)", () => {
    withTenant("doc", () => {
      // No registry field is bureau-scoped yet (see the TODO in
      // lib/fieldRegistry.ts), so this exercises the always-true fallback —
      // scoping is asserted directly against fieldsForBureau in
      // lib/fieldRegistry.test.ts. Here we confirm passing a businessUnit
      // never hides an OMB/department/general field.
      expect(isFieldEnabled("stageOfDevelopment", "census")).toBe(true)
      expect(isFieldEnabled("coreProblem", "census")).toBe(true)
    })
  })

  it("an OMB field stays a plain optional toggle for USPTO/DoW", () => {
    withTenant("uspto", () => {
      setCachedFormConfig({ enabled: { stageOfDevelopment: false }, mandatory: {}, updatedAt: new Date(0).toISOString() })
      expect(isFieldEnabled("stageOfDevelopment")).toBe(false)
    })
  })

  it("an OMB field cannot be hidden for DoC even if the enabled map says false (stale/tampered state)", () => {
    withTenant("doc", () => {
      setCachedFormConfig({ enabled: { stageOfDevelopment: false }, mandatory: {}, updatedAt: new Date(0).toISOString() })
      expect(isFieldEnabled("stageOfDevelopment")).toBe(true)
    })
  })
})

describe("getFormConfig", () => {
  it("defaults every registry field to enabled and every mandatory override to unset", () => {
    const config = getFormConfig()
    expect(config.enabled.coreProblem).toBe(true)
    expect(config.mandatory).toEqual({})
  })
})

// isFieldVisible — the shared conditional-disclosure resolver (issue #60):
// cascade + admin enabled + each field's `showWhen` prerequisite, in one
// place so the wizard and lib/submissionReadiness.ts can't drift apart.
describe("isFieldVisible", () => {
  const fd = (overrides: Partial<FormData> = {}): FormData => ({ ...initialFormData, ...overrides })

  it("a field with no showWhen is always visible once enabled — unaffected by unrelated formData", () => {
    expect(isFieldVisible("coreProblem", fd())).toBe(true)
  })

  it("hides an admin-disabled field even when its showWhen would otherwise pass", () => {
    withTenant("uspto", () => {
      setCachedFormConfig({
        enabled: { accessControlRequirements: false },
        mandatory: {},
        updatedAt: new Date(0).toISOString(),
      })
      expect(isFieldVisible("accessControlRequirements", fd({ involvesSensitiveData: "yes" }))).toBe(false)
    })
  })

  describe("high-impact risk fields (#26-34)", () => {
    const riskFields: (keyof FormData)[] = [
      "preDeploymentTesting",
      "aiImpactAssessmentCompleted",
      "aiImpactAssessment",
      "independentReviewConducted",
      "ongoingMonitoringPlan",
      "operatorTrainingEstablished",
      "failSafeMechanism",
      "humanOversightAppeal",
      "publicConsultationSteps",
    ]

    it("hidden pre-deployment even when high-impact", () => {
      for (const key of riskFields) {
        expect(isFieldVisible(key, fd({ highImpact: "high_impact", stageOfDevelopment: "pre_deployment" }))).toBe(false)
      }
    })

    it("hidden once deployed if not high-impact", () => {
      for (const key of riskFields) {
        expect(isFieldVisible(key, fd({ highImpact: "not_high_impact", stageOfDevelopment: "deployed" }))).toBe(false)
      }
    })

    it("visible only once both high-impact AND deployed", () => {
      for (const key of riskFields) {
        expect(isFieldVisible(key, fd({ highImpact: "high_impact", stageOfDevelopment: "deployed" }))).toBe(true)
      }
    })
  })

  describe("highImpactJustification (dependent sub-field: highImpact = presumed_not_high_impact)", () => {
    it("hidden unless the high-impact answer is 'presumed, but determined not'", () => {
      expect(isFieldVisible("highImpactJustification", fd({ highImpact: "high_impact" }))).toBe(false)
      expect(isFieldVisible("highImpactJustification", fd({ highImpact: "not_high_impact" }))).toBe(false)
      expect(isFieldVisible("highImpactJustification", fd())).toBe(false)
    })
    it("visible when presumed high-impact but determined not", () => {
      expect(isFieldVisible("highImpactJustification", fd({ highImpact: "presumed_not_high_impact" }))).toBe(true)
    })
  })

  describe("topicArea / aiClassification (stage-dependent: pre-deployment onward)", () => {
    it("hidden until a development stage is chosen, visible for any non-retired stage", () => {
      for (const key of ["topicArea", "aiClassification"] as const) {
        expect(isFieldVisible(key, fd())).toBe(false)
        expect(isFieldVisible(key, fd({ stageOfDevelopment: "pre_deployment" }))).toBe(true)
        expect(isFieldVisible(key, fd({ stageOfDevelopment: "pilot" }))).toBe(true)
        expect(isFieldVisible(key, fd({ stageOfDevelopment: "deployed" }))).toBe(true)
        expect(isFieldVisible(key, fd({ stageOfDevelopment: "retired" }))).toBe(false)
      }
    })
  })

  describe("hasPii / demographicFeatures (stage-dependent: pilot or deployed)", () => {
    it("hidden pre-deployment, visible for pilot or deployed", () => {
      for (const key of ["hasPii", "demographicFeatures"] as const) {
        expect(isFieldVisible(key, fd({ stageOfDevelopment: "pre_deployment" }))).toBe(false)
        expect(isFieldVisible(key, fd({ stageOfDevelopment: "pilot" }))).toBe(true)
        expect(isFieldVisible(key, fd({ stageOfDevelopment: "deployed" }))).toBe(true)
      }
    })
  })

  describe("hasATO (stage-dependent)", () => {
    it("hidden pre-deployment", () => {
      expect(isFieldVisible("hasATO", fd({ stageOfDevelopment: "pre_deployment" }))).toBe(false)
    })
    it("visible for pilot or deployed", () => {
      expect(isFieldVisible("hasATO", fd({ stageOfDevelopment: "pilot" }))).toBe(true)
      expect(isFieldVisible("hasATO", fd({ stageOfDevelopment: "deployed" }))).toBe(true)
    })
  })

  describe("atoSystemName (dependent sub-field: hasATO = yes AND stage is pilot/deployed)", () => {
    it("hidden when hasATO is no, in_progress, or unset", () => {
      expect(isFieldVisible("atoSystemName", fd({ hasATO: "no", stageOfDevelopment: "deployed" }))).toBe(false)
      expect(isFieldVisible("atoSystemName", fd({ hasATO: "in_progress", stageOfDevelopment: "deployed" }))).toBe(false)
      expect(isFieldVisible("atoSystemName", fd())).toBe(false)
    })
    it("hidden when hasATO is yes but the stage isn't pilot/deployed yet", () => {
      expect(isFieldVisible("atoSystemName", fd({ hasATO: "yes", stageOfDevelopment: "pre_deployment" }))).toBe(false)
    })
    it("visible when hasATO is yes and stage is pilot or deployed", () => {
      expect(isFieldVisible("atoSystemName", fd({ hasATO: "yes", stageOfDevelopment: "pilot" }))).toBe(true)
      expect(isFieldVisible("atoSystemName", fd({ hasATO: "yes", stageOfDevelopment: "deployed" }))).toBe(true)
    })
  })

  describe("systemSourceVendorName (dependent sub-field: systemSource is contract/vendor AND stage is pilot/deployed)", () => {
    it("hidden when developed in-house or unset", () => {
      expect(isFieldVisible("systemSourceVendorName", fd({ systemSource: "in_house", stageOfDevelopment: "deployed" }))).toBe(false)
      expect(isFieldVisible("systemSourceVendorName", fd())).toBe(false)
    })
    it("hidden when vendor/contract but the stage isn't pilot/deployed yet", () => {
      expect(isFieldVisible("systemSourceVendorName", fd({ systemSource: "contract", stageOfDevelopment: "pre_deployment" }))).toBe(false)
    })
    it("visible when under contract or purchased and stage is pilot or deployed", () => {
      expect(isFieldVisible("systemSourceVendorName", fd({ systemSource: "contract", stageOfDevelopment: "pilot" }))).toBe(true)
      expect(isFieldVisible("systemSourceVendorName", fd({ systemSource: "vendor", stageOfDevelopment: "deployed" }))).toBe(true)
    })
  })

  describe("openSourceCodeLink (dependent sub-field: customCode = yes)", () => {
    it("hidden when customCode is no or unset", () => {
      expect(isFieldVisible("openSourceCodeLink", fd({ customCode: "no" }))).toBe(false)
      expect(isFieldVisible("openSourceCodeLink", fd())).toBe(false)
    })
    it("visible when customCode is yes", () => {
      expect(isFieldVisible("openSourceCodeLink", fd({ customCode: "yes" }))).toBe(true)
    })
  })

  describe("accessControlRequirements (dependent sub-field: PII = yes)", () => {
    it("hidden when involvesSensitiveData is no or unset", () => {
      expect(isFieldVisible("accessControlRequirements", fd({ involvesSensitiveData: "no" }))).toBe(false)
      expect(isFieldVisible("accessControlRequirements", fd())).toBe(false)
    })
    it("visible when involvesSensitiveData is yes", () => {
      expect(isFieldVisible("accessControlRequirements", fd({ involvesSensitiveData: "yes" }))).toBe(true)
    })
  })

  describe("subset per submission scenario", () => {
    const GATED_FIELDS: (keyof FormData)[] = [
      "hasATO",
      "aiImpactAssessment",
      "preDeploymentTesting",
      "ongoingMonitoringPlan",
      "humanOversightAppeal",
      "accessControlRequirements",
    ]

    it("pre-deployment, non-high-impact: none of the gated fields show", () => {
      const data = fd({ stageOfDevelopment: "pre_deployment", highImpact: "not_high_impact", involvesSensitiveData: "no" })
      expect(GATED_FIELDS.filter((k) => isFieldVisible(k, data))).toEqual([])
    })

    it("deployed, non-high-impact: only the stage-dependent field (hasATO) shows", () => {
      const data = fd({ stageOfDevelopment: "deployed", highImpact: "not_high_impact", involvesSensitiveData: "no" })
      expect(GATED_FIELDS.filter((k) => isFieldVisible(k, data))).toEqual(["hasATO"])
    })

    it("deployed and high-impact: hasATO plus all four risk fields show", () => {
      const data = fd({ stageOfDevelopment: "deployed", highImpact: "high_impact", involvesSensitiveData: "no" })
      expect(GATED_FIELDS.filter((k) => isFieldVisible(k, data))).toEqual([
        "hasATO",
        "aiImpactAssessment",
        "preDeploymentTesting",
        "ongoingMonitoringPlan",
        "humanOversightAppeal",
      ])
    })
  })
})
