import { describe, it, expect } from "vitest"
import {
  decideStepSave,
  highImpactChoices,
  rmfChoices,
  needsAttentionLine,
  NEEDS_ATTENTION_UNKNOWN,
  stepAdvice,
} from "./reviewStepScreen"
import { NONE_YET } from "./reviewerDecision"
import type { RmfProfile } from "./nistRmf"

const profile = (over: Partial<RmfProfile>): RmfProfile => ({
  functions: {} as RmfProfile["functions"],
  overall: "attention",
  rationale: "r",
  flags: [],
  ...over,
})

describe("decideStepSave (F7-3)", () => {
  it("moves on and saves nothing when nothing is chosen", () => {
    expect(decideStepSave({ suggestion: "high_impact", saved: NONE_YET, chosen: null, reason: "" })).toEqual({ kind: "go" })
  })
  it("saves a choice that matches Plumb with no reason", () => {
    expect(decideStepSave({ suggestion: "high_impact", saved: NONE_YET, chosen: "high_impact", reason: "" })).toEqual({
      kind: "save",
      answer: "high_impact",
      reason: undefined,
    })
  })
  it("explains what is needed, and saves nothing, when the choice differs and the reason is empty or too short", () => {
    for (const reason of ["", "   ", "no"]) {
      const out = decideStepSave({ suggestion: "high_impact", saved: NONE_YET, chosen: "not_high_impact", reason })
      expect(out.kind).toBe("need_reason")
    }
  })
  it("saves a differing choice with a reason of a few words", () => {
    expect(decideStepSave({ suggestion: "high_impact", saved: NONE_YET, chosen: "not_high_impact", reason: " no people are affected " })).toEqual({
      kind: "save",
      answer: "not_high_impact",
      reason: "no people are affected",
    })
  })
  it("just moves on when the choice is the answer already saved", () => {
    expect(decideStepSave({ suggestion: "high_impact", saved: "not_high_impact", chosen: "not_high_impact", reason: "" })).toEqual({ kind: "go" })
  })
})

describe("choices", () => {
  it("high impact keeps today's three answers", () => {
    expect(highImpactChoices().map((c) => c.value)).toEqual(["high_impact", "presumed_not_high_impact", "not_high_impact"])
  })
  it("risk framework offers the three levels, plus unassessed only when that is the suggestion", () => {
    expect(rmfChoices("attention").map((c) => c.value)).toEqual(["on_track", "attention", "at_risk"])
    expect(rmfChoices("unknown").map((c) => c.value)).toEqual(["on_track", "attention", "at_risk", "unknown"])
  })
})

describe("needsAttentionLine", () => {
  it("is null when the state is not needs attention", () => {
    expect(needsAttentionLine(profile({ overall: "on_track", flags: ["Map: x"] }), "on_track")).toBeNull()
  })
  it("names what needs attention from the profile's flags", () => {
    const line = needsAttentionLine(profile({ flags: ["Measure: Testing plan not yet answered."] }), "attention")
    expect(line).toContain("Testing plan not yet answered")
  })
  it("says so when the data does not tell", () => {
    expect(needsAttentionLine(profile({ flags: [] }), "attention")).toBe(NEEDS_ATTENTION_UNKNOWN)
    expect(NEEDS_ATTENTION_UNKNOWN).toBe("Plumb could not tell what is missing. Read the submission.")
  })
})

describe("stepAdvice", () => {
  it("says there is no advice when there is nothing to suggest", () => {
    expect(stepAdvice("disposition", {})).toEqual({ suggests: null, reasons: [], notSure: null })
  })
  it("high impact: one suggestion, at most three reasons", () => {
    const a = stepAdvice("high_impact", { highImpact: { recommendation: "yes", reasons: ["a", "b", "c", "d"] } })
    expect(a.suggests).toBe("High-impact")
    expect(a.reasons).toEqual(["a", "b", "c"])
  })
})
