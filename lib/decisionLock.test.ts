import { describe, it, expect } from "vitest"
import { isDecisionLocked } from "@/lib/decisionLock"

const signoff = { bureau: "noaa", decision: "approved", signedOffByName: "R", signedOffByEmail: "r@x.gov", signedOffAt: "t" }

describe("isDecisionLocked", () => {
  it("never locks an in-review record", () => {
    for (const s of ["draft", "submitted", "in_review", "needs_info", undefined]) {
      expect(isDecisionLocked({ reviewStatus: s }, true)).toBe(false)
      expect(isDecisionLocked({ reviewStatus: s }, false)).toBe(false)
    }
  })
  it("locks approved and rejected records that carry a sign-off", () => {
    expect(isDecisionLocked({ reviewStatus: "approved", bureauSignoff: signoff }, true)).toBe(true)
    expect(isDecisionLocked({ reviewStatus: "rejected", bureauSignoff: signoff }, true)).toBe(true)
  })
  it("on a tenant with a bureau tier, a decision not yet signed off stays reversible", () => {
    expect(isDecisionLocked({ reviewStatus: "approved" }, true)).toBe(false)
  })
  it("on a tenant with no bureau tier the decision itself is the sign-off", () => {
    expect(isDecisionLocked({ reviewStatus: "approved" }, false)).toBe(true)
    expect(isDecisionLocked({ reviewStatus: "rejected" }, false)).toBe(true)
  })
})
