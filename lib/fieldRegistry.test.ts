import { describe, it, expect, afterEach } from "vitest"
import {
  FIELD_REGISTRY,
  FIELD_REGISTRY_BY_KEY,
  fieldLevel,
  fieldsForBureau,
  canToggleField,
  canMarkFieldMandatory,
  isDepartmentLevelViewer,
  type FieldDefinition,
} from "@/lib/fieldRegistry"
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

// Guarded lookup — FIELD_REGISTRY_BY_KEY is a Record<string, FieldDefinition>,
// but a typo'd or removed key would silently yield `undefined` at runtime, so
// fail fast with a clear message rather than throwing a bare TypeError deep
// inside a `.level`/`.locked` access.
const getField = (key: string): FieldDefinition => {
  const def = FIELD_REGISTRY_BY_KEY[key]
  if (!def) throw new Error(`Expected FIELD_REGISTRY_BY_KEY to contain "${key}"`)
  return def
}

// A complete FieldDefinition fixture for tests that only care about
// `level` — avoids `as FieldDefinition` casts on partial object literals.
const baseFieldFixture: FieldDefinition = {
  fieldKey: "successMetrics",
  label: "Test field",
  description: "test fixture",
  reasonToInclude: "test fixture",
  phase: 4,
  step: 7,
  locked: false,
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TENANT
})

// A synthetic bureau-scoped optional field for tests — the registry itself
// doesn't define one yet (see the TODO in lib/fieldRegistry.ts), but the
// mechanism must support one once a bureau adds it.
const censusOnlyField: FieldDefinition = {
  fieldKey: "successMetrics", // reuse a real FormData key so type-checking stays honest
  label: "Census-only field",
  description: "test fixture",
  reasonToInclude: "test fixture",
  phase: 4,
  step: 7,
  level: "bureau",
  businessUnit: "census",
  locked: false,
}

describe("fieldLevel", () => {
  it("defaults to 'bureau' when unset", () => {
    expect(fieldLevel({ ...baseFieldFixture, level: undefined })).toBe("bureau")
  })
  it("returns the explicit level when set", () => {
    expect(fieldLevel({ ...baseFieldFixture, level: "omb" })).toBe("omb")
  })
})

describe("registry cascade metadata", () => {
  it("marks the DoC-mandated AI risk fields as level: department, locked", () => {
    for (const key of ["involvesSensitiveData", "aiDecisionalImpact", "aiModelSourcing", "aiHumanReview"]) {
      const def = getField(key)
      expect(def.level).toBe("department")
      expect(def.locked).toBe(true)
    }
  })

  it("marks the OMB inventory fields as level: omb", () => {
    const ombFields = FIELD_REGISTRY.filter((f) => f.omb)
    expect(ombFields.length).toBeGreaterThan(0)
    for (const f of ombFields) expect(f.level).toBe("omb")
  })

  it("leaves OMB inventory fields unlocked in the registry itself — the cascade enforces the mandate only for bureau-tier tenants", () => {
    const stage = getField("stageOfDevelopment")
    expect(stage.locked).toBe(false)
  })
})

describe("fieldsForBureau", () => {
  it("returns OMB + department + a bureau's own scoped fields, and never another bureau's", () => {
    withTenant("doc", () => {
      // No registry field is bureau-scoped yet (see the TODO in
      // lib/fieldRegistry.ts) — temporarily add one so this test exercises
      // the real `fieldsForBureau`, not a reimplementation of its logic.
      const mandatoryKeys = FIELD_REGISTRY.filter((f) => fieldLevel(f) !== "bureau").map((f) => f.fieldKey)
      FIELD_REGISTRY.push(censusOnlyField)
      try {
        const census = fieldsForBureau("census")
        const nist = fieldsForBureau("nist")

        expect(census).toContain(censusOnlyField)
        expect(nist).not.toContain(censusOnlyField)

        // Every OMB/department field is present for both bureaus.
        for (const key of mandatoryKeys) {
          expect(census.some((f) => f.fieldKey === key)).toBe(true)
          expect(nist.some((f) => f.fieldKey === key)).toBe(true)
        }
      } finally {
        FIELD_REGISTRY.pop()
      }
    })
  })

  it("returns the general optional pool (unscoped bureau-level fields) for every bureau", () => {
    withTenant("doc", () => {
      const forCensus = fieldsForBureau("census")
      const forNist = fieldsForBureau("nist")
      // coreProblem is level: "bureau" (default) with no businessUnit — general pool.
      expect(forCensus.some((f) => f.fieldKey === "coreProblem")).toBe(true)
      expect(forNist.some((f) => f.fieldKey === "coreProblem")).toBe(true)
    })
  })

  it("returns the full registry unfiltered for tenants without a bureau tier (USPTO/DoW)", () => {
    withTenant("uspto", () => {
      expect(fieldsForBureau("patents")).toEqual(FIELD_REGISTRY)
      expect(fieldsForBureau(undefined)).toEqual(FIELD_REGISTRY)
    })
    withTenant("dow", () => {
      expect(fieldsForBureau("forscom")).toEqual(FIELD_REGISTRY)
    })
  })
})

describe("isDepartmentLevelViewer", () => {
  it("is true for an OS-bureau viewer or a viewer with no bureau assignment", () => {
    expect(isDepartmentLevelViewer({ role: "admin", businessUnit: "os" })).toBe(true)
    expect(isDepartmentLevelViewer({ role: "admin" })).toBe(true)
    expect(isDepartmentLevelViewer({ role: "admin", businessUnit: "" })).toBe(true)
  })
  it("is false for a bureau-scoped viewer, and for no viewer", () => {
    expect(isDepartmentLevelViewer({ role: "admin", businessUnit: "census" })).toBe(false)
    expect(isDepartmentLevelViewer(null)).toBe(false)
    expect(isDepartmentLevelViewer(undefined)).toBe(false)
  })
})

describe("canToggleField", () => {
  it("is never togglable when locked, regardless of level or tenant", () => {
    withTenant("doc", () => {
      const def = getField("involvesSensitiveData")
      expect(canToggleField(def, { role: "admin", businessUnit: "os" })).toBe(false)
      expect(canToggleField(def, { role: "admin" })).toBe(false)
    })
  })

  it("is never togglable for an OMB/department field on a bureau-tier tenant, even by a department admin", () => {
    withTenant("doc", () => {
      const def = getField("stageOfDevelopment") // level: omb, locked: false
      expect(canToggleField(def, { role: "admin", businessUnit: "census" })).toBe(false)
      expect(canToggleField(def, { role: "admin", businessUnit: "os" })).toBe(false)
      expect(canToggleField(def, { role: "admin" })).toBe(false)
    })
  })

  it("treats the same OMB field as a plain optional toggle on a flat tenant (USPTO/DoW unaffected)", () => {
    withTenant("uspto", () => {
      const def = getField("stageOfDevelopment")
      expect(canToggleField(def, { role: "admin", businessUnit: "patents" })).toBe(true)
    })
    withTenant("dow", () => {
      const def = getField("stageOfDevelopment")
      expect(canToggleField(def, { role: "admin" })).toBe(true)
    })
  })

  it("a bureau-scoped optional field is togglable only by that bureau's viewer, or a department-level viewer", () => {
    withTenant("doc", () => {
      expect(canToggleField(censusOnlyField, { role: "admin", businessUnit: "census" })).toBe(true)
      expect(canToggleField(censusOnlyField, { role: "admin", businessUnit: "nist" })).toBe(false)
      expect(canToggleField(censusOnlyField, { role: "admin", businessUnit: "os" })).toBe(true)
      expect(canToggleField(censusOnlyField, { role: "admin" })).toBe(true)
    })
  })

  it("the general optional pool is togglable by any admin, unless a department admin has since marked it mandatory", () => {
    withTenant("doc", () => {
      const def = getField("coreProblem") // locked: true system field — swap for an unlocked one
      const unlocked = getField("problemImpact") // level: bureau (default), unlocked, unscoped
      expect(canToggleField(unlocked, { role: "admin", businessUnit: "census" })).toBe(true)
      expect(canToggleField(unlocked, { role: "admin", businessUnit: "nist" })).toBe(true)
      expect(canToggleField(unlocked, { role: "admin", businessUnit: "census" }, { mandatory: true })).toBe(false)
      expect(canToggleField(unlocked, { role: "admin", businessUnit: "os" }, { mandatory: true })).toBe(true)
      expect(def.locked).toBe(true) // sanity check on the fixture assumption above
    })
  })
})

// showWhen — conditional disclosure (issue #60). Tested directly against the
// registry's own predicates (not through isFieldEnabled/the cascade — that's
// covered by isFieldVisible in lib/formConfig.test.ts) so a change to a
// predicate's logic is caught right at its source.
describe("showWhen", () => {
  const fd = (overrides: Partial<FormData> = {}): FormData => ({ ...initialFormData, ...overrides })

  it("fields with no showWhen have none set — always show once enabled", () => {
    expect(getField("coreProblem").showWhen).toBeUndefined()
  })

  it("high-impact risk fields require highImpact = yes AND stageOfDevelopment = deployed", () => {
    for (const key of [
      "aiImpactAssessment",
      "preDeploymentTesting",
      "ongoingMonitoringPlan",
      "humanOversightAppeal",
      "independentReviewConducted",
      "operatorTrainingEstablished",
      "failSafeMechanism",
    ]) {
      const predicate = getField(key).showWhen
      expect(predicate).toBeDefined()
      expect(predicate!(fd({ highImpact: "yes", stageOfDevelopment: "deployed" }))).toBe(true)
      expect(predicate!(fd({ highImpact: "yes", stageOfDevelopment: "pilot" }))).toBe(false)
      expect(predicate!(fd({ highImpact: "yes", stageOfDevelopment: "pre_deployment" }))).toBe(false)
      expect(predicate!(fd({ highImpact: "no", stageOfDevelopment: "deployed" }))).toBe(false)
    }
  })

  it("hasATO requires stageOfDevelopment to be pilot or deployed", () => {
    const predicate = getField("hasATO").showWhen!
    expect(predicate(fd({ stageOfDevelopment: "pre_deployment" }))).toBe(false)
    expect(predicate(fd({ stageOfDevelopment: "pilot" }))).toBe(true)
    expect(predicate(fd({ stageOfDevelopment: "deployed" }))).toBe(true)
    expect(predicate(fd({ stageOfDevelopment: "retired" }))).toBe(false)
  })

  it("atoSystemName requires hasATO = yes", () => {
    const predicate = getField("atoSystemName").showWhen!
    expect(predicate(fd({ hasATO: "yes" }))).toBe(true)
    expect(predicate(fd({ hasATO: "in_progress" }))).toBe(false)
    expect(predicate(fd({ hasATO: "no" }))).toBe(false)
  })

  it("systemSourceVendorName requires systemSource to be contract or vendor", () => {
    const predicate = getField("systemSourceVendorName").showWhen!
    expect(predicate(fd({ systemSource: "contract" }))).toBe(true)
    expect(predicate(fd({ systemSource: "vendor" }))).toBe(true)
    expect(predicate(fd({ systemSource: "in_house" }))).toBe(false)
  })

  it("openSourceCodeLink requires customCode = yes", () => {
    const predicate = getField("openSourceCodeLink").showWhen!
    expect(predicate(fd({ customCode: "yes" }))).toBe(true)
    expect(predicate(fd({ customCode: "no" }))).toBe(false)
    expect(predicate(fd())).toBe(false)
  })

  it("accessControlRequirements requires involvesSensitiveData = yes", () => {
    const predicate = getField("accessControlRequirements").showWhen!
    expect(predicate(fd({ involvesSensitiveData: "yes" }))).toBe(true)
    expect(predicate(fd({ involvesSensitiveData: "no" }))).toBe(false)
    expect(predicate(fd())).toBe(false)
  })
})

describe("canMarkFieldMandatory", () => {
  it("only a department-level viewer can mark an ordinary bureau field mandatory, and only on a bureau-tier tenant", () => {
    withTenant("doc", () => {
      const unlocked = getField("problemImpact")
      expect(canMarkFieldMandatory(unlocked, { role: "admin", businessUnit: "os" })).toBe(true)
      expect(canMarkFieldMandatory(unlocked, { role: "admin" })).toBe(true)
      expect(canMarkFieldMandatory(unlocked, { role: "admin", businessUnit: "census" })).toBe(false)
    })
    withTenant("uspto", () => {
      const unlocked = getField("problemImpact")
      expect(canMarkFieldMandatory(unlocked, { role: "admin" })).toBe(false)
    })
  })

  it("cannot mark a locked or already-mandatory (omb/department) field mandatory — already non-togglable", () => {
    withTenant("doc", () => {
      const lockedSystemField = getField("coreProblem")
      const ombField = getField("stageOfDevelopment")
      expect(canMarkFieldMandatory(lockedSystemField, { role: "admin" })).toBe(false)
      expect(canMarkFieldMandatory(ombField, { role: "admin" })).toBe(false)
    })
  })
})
