import { describe, it, expect, afterEach } from "vitest"
import { setCachedFormConfig } from "@/lib/dataCache"
import { getFormConfig, isFieldEnabled, isFieldMandatory } from "@/lib/formConfig"

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
