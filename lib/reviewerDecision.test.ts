import { describe, it, expect } from "vitest"
import {
  readReviewerStep,
  reviewerDecidesEnabled,
  hasEnoughWords,
  NONE_YET,
} from "@/lib/reviewerDecision"
import { uspto } from "@/lib/tenant/uspto"
import { dow } from "@/lib/tenant/dow"
import { doc } from "@/lib/tenant/doc"

// A record Plumb's rule calls high impact (a manually ticked factor).
const HI = { highImpactFactors: ["safety"] }
// A record the rule calls not high impact.
const NOT_HI = { highImpactFactors: [] }

describe("reviewerDecidesEnabled", () => {
  it("is off when the setting is missing (USPTO, Commerce, DoW today)", () => {
    expect(reviewerDecidesEnabled({ features: {} } as any)).toBe(false)
    for (const t of [uspto, doc, dow]) expect(reviewerDecidesEnabled(t)).toBe(false)
  })
  it("is on only when the setting is true", () => {
    expect(reviewerDecidesEnabled({ features: { reviewerDecides: true } } as any)).toBe(true)
  })
})

describe("hasEnoughWords", () => {
  it("wants at least three words", () => {
    expect(hasEnoughWords("")).toBe(false)
    expect(hasEnoughWords(undefined)).toBe(false)
    expect(hasEnoughWords("too short")).toBe(false)
    expect(hasEnoughWords("  covers   a pilot  ")).toBe(true)
  })
})

describe("readReviewerStep: high impact", () => {
  it("returns 'none yet' when not answered, even with a suggestion", () => {
    const r = readReviewerStep("highImpact", { ...HI, highImpact: "" } as any)
    expect(r.suggestion).toBe("high_impact")
    expect(r.answer).toBe(NONE_YET)
    expect(r.differs).toBe(false)
    expect(r.reasonNeeded).toBe(false)
  })
  it("same as the suggestion: no reason needed", () => {
    const r = readReviewerStep("highImpact", { ...HI, highImpact: "high_impact" } as any)
    expect(r.answer).toBe("high_impact")
    expect(r.differs).toBe(false)
    expect(r.reasonNeeded).toBe(false)
  })
  it("different with no reason: reason needed, not present", () => {
    const r = readReviewerStep("highImpact", { ...HI, highImpact: "not_high_impact" } as any)
    expect(r.differs).toBe(true)
    expect(r.reasonNeeded).toBe(true)
    expect(r.reasonPresent).toBe(false)
  })
  it("different with a reason of a few words: reason present", () => {
    const r = readReviewerStep("highImpact", {
      ...HI,
      highImpact: "not_high_impact",
      highImpactReview: { byName: "R", byEmail: "r@x.gov", at: "t", reason: "No decisions about people" },
    } as any)
    expect(r.reasonNeeded).toBe(true)
    expect(r.reasonPresent).toBe(true)
  })
  it("suggests not high impact when the rule finds nothing", () => {
    const r = readReviewerStep("highImpact", { ...NOT_HI, highImpact: "not_high_impact" } as any)
    expect(r.suggestion).toBe("not_high_impact")
    expect(r.differs).toBe(false)
  })
  it("a stored answer with no stamp reads as an answer (as today)", () => {
    const r = readReviewerStep("highImpact", { ...NOT_HI, highImpact: "not_high_impact" } as any)
    expect(r.answer).toBe("not_high_impact")
  })
})

describe("readReviewerStep: risk framework", () => {
  const snapshot = { overall: "attention", functions: {}, rationale: "", flags: [] }
  it("returns 'none yet' with a snapshot but no review", () => {
    const r = readReviewerStep("rmf", { rmfProfileSnapshot: snapshot } as any)
    expect(r.suggestion).toBe("attention")
    expect(r.answer).toBe(NONE_YET)
    expect(r.differs).toBe(false)
  })
  it("confirmed: the answer is the suggestion", () => {
    const r = readReviewerStep("rmf", {
      rmfProfileSnapshot: snapshot,
      rmfProfileReview: { decision: "confirmed", proposedOverall: "attention", byName: "R", byEmail: "r@x.gov", at: "t" },
    } as any)
    expect(r.answer).toBe("attention")
    expect(r.differs).toBe(false)
    expect(r.reasonNeeded).toBe(false)
  })
  it("override without notes: differs, reason needed and missing", () => {
    const r = readReviewerStep("rmf", {
      rmfProfileSnapshot: snapshot,
      rmfProfileReview: { decision: "overridden", proposedOverall: "attention", overriddenOverall: "on_track", byName: "R", byEmail: "r@x.gov", at: "t" },
    } as any)
    expect(r.answer).toBe("on_track")
    expect(r.differs).toBe(true)
    expect(r.reasonNeeded).toBe(true)
    expect(r.reasonPresent).toBe(false)
  })
  it("override with notes: reason present", () => {
    const r = readReviewerStep("rmf", {
      rmfProfileSnapshot: snapshot,
      rmfProfileReview: { decision: "overridden", proposedOverall: "attention", overriddenOverall: "on_track", notes: "Controls already in place", byName: "R", byEmail: "r@x.gov", at: "t" },
    } as any)
    expect(r.reasonPresent).toBe(true)
  })
  it("uses the server's own suggestion, not the proposedOverall the browser sent", () => {
    const r = readReviewerStep("rmf", {
      rmfProfileSnapshot: snapshot,
      rmfProfileReview: { decision: "overridden", proposedOverall: "on_track", overriddenOverall: "on_track", byName: "R", byEmail: "r@x.gov", at: "t" },
    } as any)
    expect(r.suggestion).toBe("attention")
    expect(r.differs).toBe(true)
  })
})
