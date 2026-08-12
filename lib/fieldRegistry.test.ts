import { describe, it, expect, afterEach } from "vitest"
import {
  FIELD_REGISTRY,
  FIELD_REGISTRY_BY_KEY,
  getFieldRegistry,
  getFieldRegistryByKey,
  fieldLevel,
  fieldsForBureau,
  canToggleField,
  canMarkFieldMandatory,
  isDepartmentLevelViewer,
  type FieldDefinition,
} from "@/lib/fieldRegistry"
import { initialFormData, type FormData } from "@/lib/steps"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import type { TenantConfig } from "@/lib/tenant"

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

// A bureau-tier tenant that is not Commerce — the vocabulary a submitter on
// an ES2-shaped instance must see on steps 1 and 2 (ISS-3).
const es2 = {
  ...doc,
  id: "es2",
  tierLabels: {
    department: "Command",
    unit: "Directorate",
    unitPlural: "Directorates",
    subUnit: "Branch",
    subUnitPlural: "Branches",
  },
} as TenantConfig

// Every label carrying OMB's authority (`level: "omb"` or `omb: true`), frozen
// byte-for-byte. This is federal wording from OMB's published data dictionary
// (docs/omb-2025-inventory-fields.md), not our vocabulary — `hasPii`'s
// "…maintained by the agency?" is the clearest case: "agency" there is OMB's
// word. A future tier-vocabulary sweep must not quietly rewrite any of it.
const OMB_LABELS: Record<string, string> = {
  stageOfDevelopment: "Stage of Development",
  highImpact: "High-impact AI?",
  highImpactJustification: "High-impact justification",
  topicArea: "Use Case Topic Area",
  aiClassification: "AI Classification",
  hasATO: "Associated ATO?",
  atoSystemName: "ATO system name",
  systemSource: "Built in-house, under contract, or purchased?",
  systemSourceVendorName: "Vendor name",
  operationalDate: "Operational / pilot start date",
  trainingDataDescription: "Training / evaluation data",
  federalDataCatalogLink: "Federal Data Catalog entry",
  hasPii: "Involves PII maintained by the agency?",
  piaLink: "Privacy Impact Assessment (PIA) link",
  demographicFeatures: "Demographic variables used as model features",
  customCode: "Includes custom-developed code?",
  openSourceCodeLink: "Open source code link",
  nationalSecuritySystem: "National Security System / IC use?",
  researchOnly: "Research-only use?",
  highImpactFactors: "High-impact factors",
  preDeploymentTesting: "Pre-deployment / real-world testing done?",
  aiImpactAssessmentCompleted: "AI impact assessment completed?",
  aiImpactAssessment: "Potential impacts and how they were identified",
  independentReviewConducted: "Independent review conducted?",
  ongoingMonitoringPlan: "Ongoing monitoring plan?",
  operatorTrainingEstablished: "Periodic operator training established?",
  failSafeMechanism: "Appropriate fail-safe in place?",
  humanOversightAppeal: "Established appeal process?",
  publicConsultationSteps: "Steps taken to consult end users and the public",
}

describe("OMB-authored labels are frozen (ISS-3 guardrail)", () => {
  const ombFieldsFor = (tenant: TenantConfig) =>
    getFieldRegistry(tenant).filter((f) => f.level === "omb" || f.omb)

  it("covers exactly the OMB-level field set, so a new OMB field can't slip past this guardrail", () => {
    expect(ombFieldsFor(doc).map((f) => f.fieldKey).sort()).toEqual(Object.keys(OMB_LABELS).sort())
  })

  it("keeps every OMB label byte-identical, for every tenant", () => {
    for (const tenant of [doc, uspto, es2]) {
      for (const f of ombFieldsFor(tenant)) {
        expect(f.label, `${tenant.id}: ${f.fieldKey}`).toBe(OMB_LABELS[f.fieldKey as string])
      }
    }
  })

  it("leaves OMB's own use of \"agency\" alone even on a tenant that calls its top tier something else", () => {
    const byKey = getFieldRegistryByKey(es2)
    expect(byKey.hasPii.label).toBe("Involves PII maintained by the agency?")
  })
})

describe("org-tier field labels resolve through the tenant (ISS-3)", () => {
  const TIER_KEYS = ["submitterOffice", "submitterSubOffice", "affectedBusinessUnits"] as const

  it("gives Commerce its own vocabulary — the three approved changes", () => {
    const byKey = getFieldRegistryByKey(doc)
    // Approved: was "Business Unit", now matches what the wizard's own step-1
    // label (`unit.label`) and the components swept in #177/#178 already say.
    expect(byKey.submitterOffice.label).toBe("Bureau")
    // Unchanged for Commerce: doc.tierLabels.subUnit is already "Office".
    expect(byKey.submitterSubOffice.label).toBe("Office")
    // Approved: closes the mismatch #178 recorded against submissionReadiness.
    expect(byKey.affectedBusinessUnits.label).toBe("Affected Bureaus")
    expect(byKey.affectedBusinessUnits.description).toBe(
      "Which bureaus, processes, or groups the problem affects (multi-select).",
    )
  })

  it("never shows a non-Commerce tenant Commerce's or USPTO's vocabulary", () => {
    const byKey = getFieldRegistryByKey(es2)
    expect(byKey.submitterOffice.label).toBe("Directorate")
    expect(byKey.submitterSubOffice.label).toBe("Branch")
    expect(byKey.affectedBusinessUnits.label).toBe("Affected Directorates")
    for (const key of TIER_KEYS) {
      expect(byKey[key].label, key).not.toMatch(/business unit/i)
      expect(byKey[key].label, key).not.toMatch(/bureau/i)
    }
    expect(byKey.affectedBusinessUnits.description).not.toMatch(/business unit|bureau/i)
  })

  it("moves only the label — fieldKey, step, level, and locked are structural", () => {
    const docByKey = getFieldRegistryByKey(doc)
    const es2ByKey = getFieldRegistryByKey(es2)
    for (const key of TIER_KEYS) {
      expect(es2ByKey[key].fieldKey).toBe(docByKey[key].fieldKey)
      expect(es2ByKey[key].step).toBe(docByKey[key].step)
      expect(es2ByKey[key].phase).toBe(docByKey[key].phase)
      expect(es2ByKey[key].locked).toBe(docByKey[key].locked)
      expect(es2ByKey[key].level).toBe(docByKey[key].level)
    }
  })

  it("leaves every other label identical across tenants", () => {
    const docFields = getFieldRegistry(doc)
    const es2Fields = getFieldRegistry(es2)
    const tierKeys = new Set<string>(TIER_KEYS)
    for (let i = 0; i < docFields.length; i++) {
      if (tierKeys.has(docFields[i].fieldKey as string)) continue
      expect(es2Fields[i].label, docFields[i].fieldKey as string).toBe(docFields[i].label)
      expect(es2Fields[i].description, docFields[i].fieldKey as string).toBe(docFields[i].description)
    }
  })
})

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

  it("high-impact risk fields (#26-34) require highImpact = high_impact AND stageOfDevelopment = deployed", () => {
    for (const key of [
      "preDeploymentTesting",
      "aiImpactAssessmentCompleted",
      "aiImpactAssessment",
      "independentReviewConducted",
      "ongoingMonitoringPlan",
      "operatorTrainingEstablished",
      "failSafeMechanism",
      "humanOversightAppeal",
      "publicConsultationSteps",
    ]) {
      const predicate = getField(key).showWhen
      expect(predicate).toBeDefined()
      expect(predicate!(fd({ highImpact: "high_impact", stageOfDevelopment: "deployed" }))).toBe(true)
      expect(predicate!(fd({ highImpact: "high_impact", stageOfDevelopment: "pilot" }))).toBe(false)
      expect(predicate!(fd({ highImpact: "high_impact", stageOfDevelopment: "pre_deployment" }))).toBe(false)
      expect(predicate!(fd({ highImpact: "not_high_impact", stageOfDevelopment: "deployed" }))).toBe(false)
      expect(predicate!(fd({ highImpact: "presumed_not_high_impact", stageOfDevelopment: "deployed" }))).toBe(false)
    }
  })

  it("highImpactJustification requires highImpact = presumed_not_high_impact", () => {
    const predicate = getField("highImpactJustification").showWhen!
    expect(predicate(fd({ highImpact: "presumed_not_high_impact" }))).toBe(true)
    expect(predicate(fd({ highImpact: "high_impact" }))).toBe(false)
    expect(predicate(fd({ highImpact: "not_high_impact" }))).toBe(false)
    expect(predicate(fd())).toBe(false)
  })

  it("topicArea and aiClassification require a development stage of pre-deployment, pilot, or deployed", () => {
    for (const key of ["topicArea", "aiClassification"]) {
      const predicate = getField(key).showWhen!
      expect(predicate(fd({ stageOfDevelopment: "pre_deployment" }))).toBe(true)
      expect(predicate(fd({ stageOfDevelopment: "pilot" }))).toBe(true)
      expect(predicate(fd({ stageOfDevelopment: "deployed" }))).toBe(true)
      expect(predicate(fd({ stageOfDevelopment: "retired" }))).toBe(false)
      expect(predicate(fd())).toBe(false)
    }
  })

  it("operationalDate, systemSource, trainingDataDescription, hasPii, demographicFeatures, and customCode require pilot or deployed", () => {
    for (const key of [
      "operationalDate",
      "systemSource",
      "trainingDataDescription",
      "hasPii",
      "demographicFeatures",
      "customCode",
    ]) {
      const predicate = getField(key).showWhen!
      expect(predicate(fd({ stageOfDevelopment: "pre_deployment" }))).toBe(false)
      expect(predicate(fd({ stageOfDevelopment: "pilot" }))).toBe(true)
      expect(predicate(fd({ stageOfDevelopment: "deployed" }))).toBe(true)
      expect(predicate(fd({ stageOfDevelopment: "retired" }))).toBe(false)
    }
  })

  it("hasATO requires stageOfDevelopment to be pilot or deployed", () => {
    const predicate = getField("hasATO").showWhen!
    expect(predicate(fd({ stageOfDevelopment: "pre_deployment" }))).toBe(false)
    expect(predicate(fd({ stageOfDevelopment: "pilot" }))).toBe(true)
    expect(predicate(fd({ stageOfDevelopment: "deployed" }))).toBe(true)
    expect(predicate(fd({ stageOfDevelopment: "retired" }))).toBe(false)
  })

  it("atoSystemName requires hasATO = yes AND stageOfDevelopment to be pilot or deployed", () => {
    const predicate = getField("atoSystemName").showWhen!
    expect(predicate(fd({ hasATO: "yes", stageOfDevelopment: "pilot" }))).toBe(true)
    expect(predicate(fd({ hasATO: "yes", stageOfDevelopment: "deployed" }))).toBe(true)
    expect(predicate(fd({ hasATO: "yes", stageOfDevelopment: "pre_deployment" }))).toBe(false)
    expect(predicate(fd({ hasATO: "in_progress", stageOfDevelopment: "deployed" }))).toBe(false)
    expect(predicate(fd({ hasATO: "no", stageOfDevelopment: "deployed" }))).toBe(false)
  })

  it("systemSourceVendorName requires systemSource to be contract or vendor AND stageOfDevelopment to be pilot or deployed", () => {
    const predicate = getField("systemSourceVendorName").showWhen!
    expect(predicate(fd({ systemSource: "contract", stageOfDevelopment: "pilot" }))).toBe(true)
    expect(predicate(fd({ systemSource: "vendor", stageOfDevelopment: "deployed" }))).toBe(true)
    expect(predicate(fd({ systemSource: "contract", stageOfDevelopment: "pre_deployment" }))).toBe(false)
    expect(predicate(fd({ systemSource: "in_house", stageOfDevelopment: "deployed" }))).toBe(false)
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

  it("federalDataCatalogLink, piaLink — optional fields — have no showWhen and are never blocking", () => {
    for (const key of ["federalDataCatalogLink", "piaLink"]) {
      expect(getField(key).showWhen).toBeUndefined()
    }
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
