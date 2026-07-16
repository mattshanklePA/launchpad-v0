import { describe, it, expect } from "vitest"
import { migrateIsWithheld, migrateFormData } from "@/lib/formDataMigrations"

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

describe("migrateFormData", () => {
  it("adds isWithheld without disturbing other fields", () => {
    const raw = { useCaseTitle: "Test", publicIndicator: "public", coreProblem: "x" }
    const migrated = migrateFormData(raw)
    expect(migrated.isWithheld).toBe("no")
    expect(migrated.useCaseTitle).toBe("Test")
    expect(migrated.coreProblem).toBe("x")
  })

  it("does not mutate the input object", () => {
    const raw = { publicIndicator: "excluded" }
    migrateFormData(raw)
    expect(raw).toEqual({ publicIndicator: "excluded" })
  })
})
