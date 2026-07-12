import { describe, it, expect, afterEach } from "vitest"
import { setCachedFormConfig } from "@/lib/dataCache"
import { getFormConfig, isFieldEnabled, isFieldMandatory, isFieldVisible } from "@/lib/formConfig"
import { initialFormData, type FormData } from "@/lib/steps"

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

  describe("high-impact risk fields (aiImpactAssessment, preDeploymentTesting, ongoingMonitoringPlan, humanOversightAppeal)", () => {
    const riskFields: (keyof FormData)[] = [
      "aiImpactAssessment",
      "preDeploymentTesting",
      "ongoingMonitoringPlan",
      "humanOversightAppeal",
    ]

    it("hidden pre-deployment even when high-impact", () => {
      for (const key of riskFields) {
        expect(isFieldVisible(key, fd({ highImpact: "yes", stageOfDevelopment: "pre_deployment" }))).toBe(false)
      }
    })

    it("hidden once deployed if not high-impact", () => {
      for (const key of riskFields) {
        expect(isFieldVisible(key, fd({ highImpact: "no", stageOfDevelopment: "deployed" }))).toBe(false)
      }
    })

    it("visible only once both high-impact AND deployed", () => {
      for (const key of riskFields) {
        expect(isFieldVisible(key, fd({ highImpact: "yes", stageOfDevelopment: "deployed" }))).toBe(true)
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
      const data = fd({ stageOfDevelopment: "pre_deployment", highImpact: "no", involvesSensitiveData: "no" })
      expect(GATED_FIELDS.filter((k) => isFieldVisible(k, data))).toEqual([])
    })

    it("deployed, non-high-impact: only the stage-dependent field (hasATO) shows", () => {
      const data = fd({ stageOfDevelopment: "deployed", highImpact: "no", involvesSensitiveData: "no" })
      expect(GATED_FIELDS.filter((k) => isFieldVisible(k, data))).toEqual(["hasATO"])
    })

    it("deployed and high-impact: hasATO plus all four risk fields show", () => {
      const data = fd({ stageOfDevelopment: "deployed", highImpact: "yes", involvesSensitiveData: "no" })
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
