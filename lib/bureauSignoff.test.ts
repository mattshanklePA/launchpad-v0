import { describe, it, expect } from "vitest"
import { docSeedSubmissions } from "@/lib/seedSubmissionsDoc"
import type { Submission } from "@/lib/submissions"
import {
  getBureauSignoff,
  getDepartmentApproval,
  buildBureauSignoffPatch,
  buildDepartmentApprovalPatch,
  hasDepartmentTransparency,
  departmentFinalApprovalEnabled,
  signoffProgress,
  approvalTransparency,
} from "@/lib/bureauSignoff"

function sub(id: string, businessUnit: string, formData: Record<string, unknown> = {}): Submission {
  return {
    id,
    submittedAt: new Date(0).toISOString(),
    businessUnit,
    formData: { submitterOffice: businessUnit, ...formData } as any,
  }
}

describe("getBureauSignoff / getDepartmentApproval", () => {
  it("reads a recorded bureau sign-off from form_data", () => {
    const s = sub("a", "nist", {
      bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "Priya", signedOffByEmail: "p@nist.gov", signedOffAt: "2026-01-01" },
    })
    expect(getBureauSignoff(s)?.signedOffByName).toBe("Priya")
  })

  it("returns undefined when no sign-off is recorded", () => {
    expect(getBureauSignoff(sub("a", "nist"))).toBeUndefined()
    expect(getDepartmentApproval(sub("a", "nist"))).toBeUndefined()
  })

  it("reads a recorded department approval from form_data", () => {
    const s = sub("a", "nist", {
      departmentApproval: { decision: "approved", byName: "Renee", byEmail: "r@doc.gov", at: "2026-01-02" },
    })
    expect(getDepartmentApproval(s)?.byName).toBe("Renee")
  })
})

describe("buildBureauSignoffPatch / buildDepartmentApprovalPatch", () => {
  it("builds a sign-off patch from the submission's own bureau", () => {
    const patch = buildBureauSignoffPatch(sub("a", "census"), "approved", {
      signedOffByName: "Dana",
      signedOffByEmail: "dana@census.gov",
      signedOffAt: "2026-02-01",
    })
    expect(patch.bureauSignoff).toEqual({
      bureau: "census",
      decision: "approved",
      signedOffByName: "Dana",
      signedOffByEmail: "dana@census.gov",
      signedOffAt: "2026-02-01",
    })
  })

  it("records a rejection sign-off the same way as an approval", () => {
    const patch = buildBureauSignoffPatch(sub("a", "mbda"), "rejected", {
      signedOffByName: "Jordan",
      signedOffByEmail: "jordan@mbda.gov",
      signedOffAt: "2026-02-02",
    })
    expect(patch.bureauSignoff.decision).toBe("rejected")
  })

  it("builds a department approval patch", () => {
    const patch = buildDepartmentApprovalPatch("approved", { byName: "Renee", byEmail: "r@doc.gov", at: "2026-02-03" })
    expect(patch.departmentApproval).toEqual({ decision: "approved", byName: "Renee", byEmail: "r@doc.gov", at: "2026-02-03" })
  })
})

describe("departmentFinalApprovalEnabled", () => {
  it("is off unless a tenant explicitly turns it on", () => {
    expect(departmentFinalApprovalEnabled({ features: {} } as any)).toBe(false)
  })
  it("is on when a tenant's features flag it", () => {
    expect(departmentFinalApprovalEnabled({ features: { departmentFinalApproval: true } } as any)).toBe(true)
  })
})

describe("hasDepartmentTransparency (the hard limit)", () => {
  it("grants transparency to an OS admin (business_unit = os)", () => {
    expect(hasDepartmentTransparency({ role: "admin", businessUnit: "os" })).toBe(true)
  })
  it("grants transparency to a department admin with no business unit", () => {
    expect(hasDepartmentTransparency({ role: "admin" })).toBe(true)
  })
  it("denies transparency to a bureau-scoped admin", () => {
    expect(hasDepartmentTransparency({ role: "admin", businessUnit: "nist" })).toBe(false)
  })
  it("denies transparency to any reviewer, even one with no business unit", () => {
    expect(hasDepartmentTransparency({ role: "reviewer" })).toBe(false)
    expect(hasDepartmentTransparency({ role: "reviewer", businessUnit: "os" })).toBe(false)
  })
  it("denies transparency without a viewer", () => {
    expect(hasDepartmentTransparency(null)).toBe(false)
  })
})

describe("signoffProgress", () => {
  it("is signed_off when approved and a sign-off is recorded", () => {
    const s = sub("a", "nist", {
      reviewStatus: "approved",
      bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "x", signedOffByEmail: "x@nist.gov", signedOffAt: "2026-01-01" },
    })
    expect(signoffProgress(s)).toBe("signed_off")
  })
  it("is pending when approved but no sign-off is recorded (legacy data)", () => {
    expect(signoffProgress(sub("a", "ita", { reviewStatus: "approved" }))).toBe("pending")
  })
  it("is pending for statuses before a decision", () => {
    expect(signoffProgress(sub("a", "ita", { reviewStatus: "in_review" }))).toBe("pending")
    expect(signoffProgress(sub("a", "ita", { reviewStatus: "submitted" }))).toBe("pending")
  })
  it("is rejected once the status is rejected, regardless of sign-off", () => {
    expect(signoffProgress(sub("a", "mbda", { reviewStatus: "rejected" }))).toBe("rejected")
  })
})

describe("approvalTransparency (the selector's hard limit)", () => {
  const all = [
    sub("a", "nist", {
      reviewStatus: "approved",
      bureauSignoff: { bureau: "nist", decision: "approved", signedOffByName: "Priya", signedOffByEmail: "p@nist.gov", signedOffAt: "2026-01-01" },
    }),
    sub("b", "census", { reviewStatus: "in_review" }),
    sub("c", "census", { reviewStatus: "rejected" }),
  ]

  it("returns every bureau's data for an OS admin", () => {
    const { summaries } = approvalTransparency(all, { role: "admin", businessUnit: "os" })
    expect(summaries.map((s) => s.bureau).sort()).toEqual(["census", "nist"])
  })

  it("returns every bureau's data for a department admin with no business unit", () => {
    const { summaries } = approvalTransparency(all, { role: "admin" })
    expect(summaries.map((s) => s.bureau).sort()).toEqual(["census", "nist"])
  })

  it("scopes a bureau reviewer to only their own bureau", () => {
    const { summaries, items } = approvalTransparency(all, { role: "reviewer", businessUnit: "census" })
    expect(summaries.map((s) => s.bureau)).toEqual(["census"])
    expect(items.every((i) => i.bureau === "census")).toBe(true)
  })

  it("scopes a bureau-assigned admin to only their own bureau, same as a reviewer", () => {
    const { summaries } = approvalTransparency(all, { role: "admin", businessUnit: "nist" })
    expect(summaries.map((s) => s.bureau)).toEqual(["nist"])
  })

  it("reports correct signed-off/pending/rejected counts within scope", () => {
    const { summaries } = approvalTransparency(all, { role: "admin" })
    const nist = summaries.find((s) => s.bureau === "nist")!
    expect(nist).toMatchObject({ total: 1, signedOff: 1, pending: 0, rejected: 0 })
    const census = summaries.find((s) => s.bureau === "census")!
    expect(census).toMatchObject({ total: 2, signedOff: 0, pending: 1, rejected: 1 })
  })
})

describe("approvalTransparency against the golden DoC seed", () => {
  const asSubmissions: Submission[] = docSeedSubmissions

  it("counts the seed's known sign-off state correctly (see lib/seedSubmissionsDoc.ts)", () => {
    const { summaries } = approvalTransparency(asSubmissions, { role: "admin" })

    // NIST: one approved-and-signed-off submission, one still submitted.
    const nist = summaries.find((s) => s.bureau === "nist")!
    expect(nist.signedOff).toBe(1)
    expect(nist.departmentApproved).toBe(1)

    // ITA: one approved submission deliberately left WITHOUT a sign-off record
    // (a pre-feature legacy approval) plus one submitted — both count as pending.
    const ita = summaries.find((s) => s.bureau === "ita")!
    expect(ita.signedOff).toBe(0)
    expect(ita.pending).toBe(2)

    // MBDA: one rejected submission with a recorded (rejection) sign-off.
    const mbda = summaries.find((s) => s.bureau === "mbda")!
    expect(mbda.rejected).toBe(1)
  })
})
