import { describe, it, expect } from "vitest"
import { migrateIsWithheld, migrateAffectedBusinessUnits, migrateFormData } from "@/lib/formDataMigrations"

describe("migrateIsWithheld", () => {
  it("passes through an already-migrated value unchanged", () => {
    expect(migrateIsWithheld({ isWithheld: "yes_risk_to_disclosure" })).toBe("yes_risk_to_disclosure")
    expect(migrateIsWithheld({ isWithheld: "yes_disclosure_prohibited" })).toBe("yes_disclosure_prohibited")
    expect(migrateIsWithheld({ isWithheld: "other" })).toBe("other")
    expect(migrateIsWithheld({ isWithheld: "no" })).toBe("no")
  })

  it("maps a legacy public indicator to 'no'", () => {
    expect(migrateIsWithheld({ publicIndicator: "public" })).toBe("no")
  })

  it("maps a legacy excluded indicator to 'other' — the old flag never recorded why", () => {
    expect(migrateIsWithheld({ publicIndicator: "excluded" })).toBe("other")
  })

  it("returns '' for a submission with neither field answered yet", () => {
    expect(migrateIsWithheld({})).toBe("")
    expect(migrateIsWithheld(null)).toBe("")
    expect(migrateIsWithheld(undefined)).toBe("")
  })

  it("ignores an unrecognized isWithheld value rather than trusting corrupt data", () => {
    expect(migrateIsWithheld({ isWithheld: "not-a-real-value" })).toBe("")
  })
})

describe("migrateAffectedBusinessUnits", () => {
  it("passes through an already-migrated array unchanged", () => {
    expect(migrateAffectedBusinessUnits({ affectedBusinessUnits: ["patents", "trademarks"] })).toEqual([
      "patents",
      "trademarks",
    ])
    expect(migrateAffectedBusinessUnits({ affectedBusinessUnits: [] })).toEqual([])
  })

  it("wraps a legacy single-value affectedSystem string into a one-element array", () => {
    expect(migrateAffectedBusinessUnits({ affectedSystem: "cross_functional" })).toEqual(["cross_functional"])
  })

  it("returns [] for a submission with neither field answered yet", () => {
    expect(migrateAffectedBusinessUnits({})).toEqual([])
    expect(migrateAffectedBusinessUnits(null)).toEqual([])
    expect(migrateAffectedBusinessUnits(undefined)).toEqual([])
  })

  it("returns [] rather than wrapping an empty legacy string", () => {
    expect(migrateAffectedBusinessUnits({ affectedSystem: "" })).toEqual([])
  })

  it("ignores a corrupt non-string-array value rather than trusting it", () => {
    expect(migrateAffectedBusinessUnits({ affectedBusinessUnits: [1, 2] as any, affectedSystem: "patents" })).toEqual([
      "patents",
    ])
  })
})

describe("migrateFormData", () => {
  it("adds isWithheld without disturbing other fields", () => {
    const raw = { useCaseTitle: "Test", publicIndicator: "public", coreProblem: "x" }
    const migrated = migrateFormData(raw)
    expect(migrated.isWithheld).toBe("no")
    expect(migrated.useCaseTitle).toBe("Test")
    expect(migrated.coreProblem).toBe("x")
  })

  it("migrates a legacy single-value affectedSystem into affectedBusinessUnits", () => {
    const raw = { affectedSystem: "it_systems" }
    const migrated = migrateFormData(raw)
    expect(migrated.affectedBusinessUnits).toEqual(["it_systems"])
  })

  it("does not mutate the input object", () => {
    const raw = { publicIndicator: "excluded" }
    migrateFormData(raw)
    expect(raw).toEqual({ publicIndicator: "excluded" })
  })
})
