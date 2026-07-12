import { describe, it, expect } from "vitest"
import { officesForBureau, officeRollupRows } from "@/lib/officeRollup"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import type { Submission } from "@/lib/submissions"

type SubInput = {
  id: string
  businessUnit: string
  office?: string
  status?: string
  highImpact?: "high_impact" | "presumed_not_high_impact" | "not_high_impact" | ""
}

function sub(p: SubInput): Submission {
  return {
    id: p.id,
    submittedAt: new Date().toISOString(),
    formData: { highImpact: p.highImpact ?? "" } as any,
    status: p.status,
    businessUnit: p.businessUnit,
    office: p.office,
  }
}

describe("officesForBureau", () => {
  it("returns the configured offices for a DoC bureau that has them", () => {
    const offices = officesForBureau("noaa", doc)
    expect(offices.map((o) => o.value)).toEqual(["nws", "nmfs", "nesdis"])
  })

  it("returns [] for a bureau with no offices configured", () => {
    expect(officesForBureau("nist", doc)).toEqual([])
  })

  it("returns [] for a tenant that doesn't use the office concept at all", () => {
    expect(officesForBureau(uspto.unit.options[0]?.value ?? "patents", uspto)).toEqual([])
  })
})

describe("officeRollupRows", () => {
  const submissions = [
    sub({ id: "a", businessUnit: "noaa", office: "nws", status: "approved", highImpact: "high_impact" }),
    sub({ id: "b", businessUnit: "noaa", office: "nws", status: "in_review" }),
    sub({ id: "c", businessUnit: "noaa", office: "nmfs", status: "submitted" }),
    sub({ id: "d", businessUnit: "noaa" }), // no office set -> "Unassigned"
    sub({ id: "e", businessUnit: "census", office: "decennial" }), // different bureau, excluded
    sub({ id: "f", businessUnit: "nist" }), // bureau with no offices at all
  ]

  it("aggregates office x status counts and high-impact tally, scoped to one bureau", () => {
    const rows = officeRollupRows(submissions, "noaa", doc)
    const nws = rows.find((r) => r.value === "nws")!
    expect(nws.total).toBe(2)
    expect(nws.counts.approved).toBe(1)
    expect(nws.counts.in_review).toBe(1)
    expect(nws.highImpact).toBe(1)

    const nmfs = rows.find((r) => r.value === "nmfs")!
    expect(nmfs.total).toBe(1)
    expect(nmfs.counts.submitted).toBe(1)

    const nesdis = rows.find((r) => r.value === "nesdis")!
    expect(nesdis.total).toBe(0)
  })

  it("groups bureau submissions with no office under an Unassigned row", () => {
    const rows = officeRollupRows(submissions, "noaa", doc)
    const unassigned = rows.find((r) => r.value === "")!
    expect(unassigned).toBeDefined()
    expect(unassigned.label).toBe("Unassigned")
    expect(unassigned.total).toBe(1)
  })

  it("excludes submissions from other bureaus", () => {
    const rows = officeRollupRows(submissions, "noaa", doc)
    const total = rows.reduce((sum, r) => sum + r.total, 0)
    expect(total).toBe(4) // a, b, c, d are the only noaa submissions
  })

  it("returns [] for a bureau with no offices configured (parity with today)", () => {
    expect(officeRollupRows(submissions, "nist", doc)).toEqual([])
  })
})
