import { describe, it, expect } from "vitest"
import { initialFormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import {
  getRmfProfileSnapshot,
  getRmfProfileReview,
  buildRmfProfileSnapshotPatch,
  buildRmfProfileReviewPatch,
  resolveRmfProfile,
} from "@/lib/rmfProfileReview"

const noDeptTier = { features: { rmf: true } } as any

function sub(formData: Record<string, unknown> = {}): Submission {
  return {
    id: "a",
    submittedAt: new Date(0).toISOString(),
    formData: { ...initialFormData, ...formData } as any,
  }
}

describe("getRmfProfileSnapshot / getRmfProfileReview", () => {
  it("returns undefined when nothing is recorded", () => {
    expect(getRmfProfileSnapshot(sub())).toBeUndefined()
    expect(getRmfProfileReview(sub())).toBeUndefined()
  })

  it("reads a recorded snapshot and review from form_data", () => {
    const s = sub({
      rmfProfileSnapshot: { functions: {}, overall: "at_risk", rationale: "r", flags: [] },
      rmfProfileReview: { decision: "confirmed", proposedOverall: "at_risk", byName: "Priya", byEmail: "p@doc.gov", at: "2026-01-01" },
    })
    expect(getRmfProfileSnapshot(s)?.overall).toBe("at_risk")
    expect(getRmfProfileReview(s)?.byName).toBe("Priya")
  })
})

describe("buildRmfProfileSnapshotPatch", () => {
  it("computes and wraps a profile from the submission's own form data", () => {
    const patch = buildRmfProfileSnapshotPatch(initialFormData, noDeptTier)
    expect(patch.rmfProfileSnapshot.overall).toBe("unknown")
  })
})

describe("buildRmfProfileReviewPatch", () => {
  const proposed = { functions: {}, overall: "attention", rationale: "r", flags: [] } as any

  it("builds a confirm patch with the proposed level snapshotted", () => {
    const patch = buildRmfProfileReviewPatch("confirmed", proposed, {
      byName: "Dana",
      byEmail: "dana@census.gov",
      at: "2026-02-01",
    })
    expect(patch.rmfProfileReview).toEqual({
      decision: "confirmed",
      proposedOverall: "attention",
      byName: "Dana",
      byEmail: "dana@census.gov",
      at: "2026-02-01",
    })
  })

  it("builds an override patch carrying both the proposed and overridden level", () => {
    const patch = buildRmfProfileReviewPatch("overridden", proposed, {
      byName: "Jordan",
      byEmail: "jordan@mbda.gov",
      at: "2026-02-02",
      overriddenOverall: "at_risk",
      notes: "Bureau flagged an unresolved appeal gap.",
    })
    expect(patch.rmfProfileReview.decision).toBe("overridden")
    expect(patch.rmfProfileReview.proposedOverall).toBe("attention")
    expect(patch.rmfProfileReview.overriddenOverall).toBe("at_risk")
    expect(patch.rmfProfileReview.notes).toBe("Bureau flagged an unresolved appeal gap.")
  })

  it("omits overriddenOverall when confirming (never carries a stale override)", () => {
    const patch = buildRmfProfileReviewPatch("confirmed", proposed, {
      byName: "Dana",
      byEmail: "dana@census.gov",
      at: "2026-02-01",
    })
    expect(patch.rmfProfileReview.overriddenOverall).toBeUndefined()
  })
})

describe("resolveRmfProfile", () => {
  it("falls back to a fresh computeRmfProfile when no snapshot is stored (older/seeded data)", () => {
    const resolved = resolveRmfProfile(sub(), noDeptTier)
    expect(resolved.profile.overall).toBe("unknown")
    expect(resolved.isProposal).toBe(true)
    expect(resolved.effectiveOverall).toBe("unknown")
  })

  it("prefers the stored snapshot over recomputing", () => {
    const s = sub({
      stageOfDevelopment: "deployed", // would compute non-"unknown" live
      rmfProfileSnapshot: { functions: {}, overall: "unknown", rationale: "stale but authoritative", flags: [] },
    })
    const resolved = resolveRmfProfile(s, noDeptTier)
    expect(resolved.profile.rationale).toBe("stale but authoritative")
  })

  it("is not a proposal once a review is recorded, and badges the confirmed level", () => {
    const s = sub({
      rmfProfileSnapshot: { functions: {}, overall: "attention", rationale: "r", flags: [] },
      rmfProfileReview: { decision: "confirmed", proposedOverall: "attention", byName: "Priya", byEmail: "p@doc.gov", at: "2026-01-01" },
    })
    const resolved = resolveRmfProfile(s, noDeptTier)
    expect(resolved.isProposal).toBe(false)
    expect(resolved.effectiveOverall).toBe("attention")
  })

  it("badges the overridden level, not the proposed one, once overridden", () => {
    const s = sub({
      rmfProfileSnapshot: { functions: {}, overall: "attention", rationale: "r", flags: [] },
      rmfProfileReview: {
        decision: "overridden",
        proposedOverall: "attention",
        overriddenOverall: "at_risk",
        byName: "Jordan",
        byEmail: "jordan@mbda.gov",
        at: "2026-02-02",
      },
    })
    const resolved = resolveRmfProfile(s, noDeptTier)
    expect(resolved.isProposal).toBe(false)
    expect(resolved.effectiveOverall).toBe("at_risk")
  })
})
