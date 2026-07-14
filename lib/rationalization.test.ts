import { describe, it, expect } from "vitest"
import { docSeedSubmissions } from "@/lib/seedSubmissionsDoc"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import { dow } from "@/lib/tenant/dow"
import type { Submission } from "@/lib/submissions"
import {
  clusterDuplicates,
  tenantHasBureauTier,
  getRationalization,
  clusterForSubmission,
  isRationalizationPending,
  canApprove,
  canRationalizeCluster,
  rationalizationBlockReason,
  buildRationalizationPatch,
  type RationalizationCluster,
} from "@/lib/rationalization"

function mkSub(id: string, businessUnit: string, text: Partial<{
  useCaseTitle: string
  coreProblem: string
  proposedSolution: string
  useCaseDescription: string
}>, extraFormData: Record<string, unknown> = {}): Submission {
  return {
    id,
    submittedAt: new Date(0).toISOString(),
    businessUnit,
    formData: {
      useCaseTitle: "",
      coreProblem: "",
      proposedSolution: "",
      useCaseDescription: "",
      submitterOffice: businessUnit,
      ...text,
      ...extraFormData,
    } as any,
  }
}

// Controlled fixtures with disjoint, hand-picked tokens for exact, predictable
// overlap fractions relative to ROLLUP_DUPLICATE_THRESHOLD (0.25) — mirrors
// lib/similarity.test.ts's approach, independent of real seed-data wording.
const target = mkSub("target", "nist", { coreProblem: "alpha bravo charlie delta echo foxtrot golf hotel" })
const crossBureauMatch = mkSub("cross-match", "census", {
  coreProblem: "alpha bravo charlie delta echo foxtrot golf india", // 7/9 = 0.78 — well above threshold
})
const belowThresholdMatch = mkSub("below-threshold", "ita", {
  coreProblem: "alpha india juliet kilo lima mike november oscar", // 1/15 = 0.067 — below threshold
})
const sameBureauMatch = mkSub("same-bureau", "nist", {
  coreProblem: "alpha bravo charlie delta echo foxtrot golf india", // same high overlap, but same bureau as target
})
const unrelated = mkSub("unrelated", "noaa", { coreProblem: "papa quebec romeo sierra tango uniform victor whiskey" })

describe("clusterDuplicates", () => {
  it("groups the golden DoC seed's intended Census/ITA cross-bureau pair into one cluster", () => {
    const clusters = clusterDuplicates(docSeedSubmissions, doc)
    const clusterIds = clusters.map((c) => c.memberIds.slice().sort())
    expect(clusterIds).toContainEqual(["doc-census-survey-assistant", "doc-ita-exporter-assistant"].sort())

    const pair = clusters.find((c) => c.memberIds.includes("doc-census-survey-assistant"))!
    expect(pair.bureaus.slice().sort()).toEqual(["census", "ita"])
    expect(pair.scope).toBe("cross_bureau")
    expect(pair.maxSimilarity).toBeGreaterThan(0.25)
  })

  it("produces deterministic cluster ids (lexicographically smallest member id) across repeated calls", () => {
    const first = clusterDuplicates(docSeedSubmissions, doc)
    const second = clusterDuplicates(docSeedSubmissions, doc)
    expect(first.map((c) => c.id)).toEqual(second.map((c) => c.id))
    const pair = first.find((c) => c.memberIds.includes("doc-census-survey-assistant"))!
    expect(pair.id).toBe("doc-census-survey-assistant")
  })

  it("does not cluster submissions with no match at all", () => {
    const clusters = clusterDuplicates([target, belowThresholdMatch, unrelated], doc)
    expect(clusters).toEqual([])
  })

  it("does not cluster a submission with itself", () => {
    const clusters = clusterDuplicates([target], doc)
    expect(clusters).toEqual([])
  })

  it("respects the roll-up threshold: clusters above it, not below it", () => {
    const clusters = clusterDuplicates([target, crossBureauMatch, belowThresholdMatch], doc)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].memberIds.slice().sort()).toEqual(["cross-match", "target"])
    expect(clusters[0].scope).toBe("cross_bureau")
  })

  it("clusters a strong match filed under the same bureau as intra_bureau (issue #68)", () => {
    const clusters = clusterDuplicates([target, sameBureauMatch], doc)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].memberIds.slice().sort()).toEqual(["same-bureau", "target"])
    expect(clusters[0].bureaus).toEqual(["nist"])
    expect(clusters[0].scope).toBe("intra_bureau")
  })

  it("is a no-op for tenants without a bureau tier (USPTO/DoW), even against the DoC seed", () => {
    expect(clusterDuplicates(docSeedSubmissions, uspto)).toEqual([])
    expect(clusterDuplicates(docSeedSubmissions, dow)).toEqual([])
  })
})

describe("tenantHasBureauTier", () => {
  it("is true for DoC and false for USPTO/DoW", () => {
    expect(tenantHasBureauTier(doc)).toBe(true)
    expect(tenantHasBureauTier(uspto)).toBe(false)
    expect(tenantHasBureauTier(dow)).toBe(false)
  })
})

describe("approve-gate predicate", () => {
  const cluster: RationalizationCluster = {
    id: "cross-match",
    memberIds: ["cross-match", "target"],
    bureaus: ["census", "nist"],
    scope: "cross_bureau",
    maxSimilarity: 0.78,
  }
  const clusters = [cluster]

  it("blocks approval when the submission is in an unresolved cluster", () => {
    const s = mkSub("target", "nist", {})
    expect(clusterForSubmission(s, clusters)).toBe(cluster)
    expect(isRationalizationPending(s, clusters)).toBe(true)
    expect(canApprove(s, clusters)).toBe(false)
    expect(rationalizationBlockReason(s, clusters)).toMatch(/rationalization pending/i)
  })

  it("allows approval once the cluster is decided (consolidated)", () => {
    const s = mkSub("target", "nist", {}, {
      rationalization: {
        clusterId: "cross-match",
        decision: "consolidated",
        leadSubmissionId: "cross-match",
        decidedBy: "Jane Reviewer",
        decidedAt: new Date(0).toISOString(),
      },
    })
    expect(isRationalizationPending(s, clusters)).toBe(false)
    expect(canApprove(s, clusters)).toBe(true)
    expect(rationalizationBlockReason(s, clusters)).toBeUndefined()
  })

  it("allows approval once the cluster is decided (keep-separate)", () => {
    const s = mkSub("target", "nist", {}, {
      rationalization: {
        clusterId: "cross-match",
        decision: "keep_separate",
        decidedBy: "Jane Reviewer",
        decidedAt: new Date(0).toISOString(),
      },
    })
    expect(isRationalizationPending(s, clusters)).toBe(false)
    expect(canApprove(s, clusters)).toBe(true)
  })

  it("treats a decision recorded against a stale cluster id as still pending", () => {
    const s = mkSub("target", "nist", {}, {
      rationalization: {
        clusterId: "some-other-cluster",
        decision: "keep_separate",
        decidedBy: "Jane Reviewer",
        decidedAt: new Date(0).toISOString(),
      },
    })
    expect(isRationalizationPending(s, clusters)).toBe(true)
    expect(canApprove(s, clusters)).toBe(false)
  })

  it("allows approval for a submission that is not a member of any cluster", () => {
    const s = mkSub("unrelated", "noaa", {})
    expect(clusterForSubmission(s, clusters)).toBeUndefined()
    expect(isRationalizationPending(s, clusters)).toBe(false)
    expect(canApprove(s, clusters)).toBe(true)
    expect(rationalizationBlockReason(s, clusters)).toBeUndefined()
  })

  it("is a no-op ([] clusters) so nothing is ever blocked for USPTO/DoW", () => {
    const s = mkSub("anything", "patents", {})
    expect(canApprove(s, [])).toBe(true)
  })

  it("blocks approval of an undecided intra-bureau cluster too (issue #68)", () => {
    const intraCluster: RationalizationCluster = {
      id: "same-bureau",
      memberIds: ["same-bureau", "target"],
      bureaus: ["nist"],
      scope: "intra_bureau",
      maxSimilarity: 0.78,
    }
    const s = mkSub("target", "nist", {})
    expect(isRationalizationPending(s, [intraCluster])).toBe(true)
    expect(canApprove(s, [intraCluster])).toBe(false)

    const decided = mkSub("target", "nist", {}, {
      rationalization: {
        clusterId: "same-bureau",
        decision: "keep_separate",
        decidedBy: "NIST Reviewer",
        decidedAt: new Date(0).toISOString(),
      },
    })
    expect(canApprove(decided, [intraCluster])).toBe(true)
  })
})

describe("canRationalizeCluster", () => {
  const intraCluster: RationalizationCluster = {
    id: "same-bureau",
    memberIds: ["same-bureau", "target"],
    bureaus: ["nist"],
    scope: "intra_bureau",
    maxSimilarity: 0.78,
  }
  const crossCluster: RationalizationCluster = {
    id: "cross-match",
    memberIds: ["cross-match", "target"],
    bureaus: ["census", "nist"],
    scope: "cross_bureau",
    maxSimilarity: 0.78,
  }
  const bureauReviewer = { role: "reviewer", businessUnit: "nist" }
  const otherBureauReviewer = { role: "reviewer", businessUnit: "noaa" }
  const departmentViewer = { role: "admin", businessUnit: "os" }

  it("lets a bureau reviewer decide their own bureau's intra-bureau cluster", () => {
    expect(canRationalizeCluster(intraCluster, bureauReviewer)).toBe(true)
  })

  it("blocks a bureau reviewer from deciding another bureau's intra-bureau cluster", () => {
    expect(canRationalizeCluster(intraCluster, otherBureauReviewer)).toBe(false)
  })

  it("blocks a bureau reviewer from deciding a cross-bureau cluster, even one that includes their bureau", () => {
    expect(canRationalizeCluster(crossCluster, bureauReviewer)).toBe(false)
  })

  it("lets a department-level viewer decide both intra-bureau and cross-bureau clusters", () => {
    expect(canRationalizeCluster(intraCluster, departmentViewer)).toBe(true)
    expect(canRationalizeCluster(crossCluster, departmentViewer)).toBe(true)
  })

  it("treats a viewer with no business unit as department-level too", () => {
    expect(canRationalizeCluster(crossCluster, { role: "admin" })).toBe(true)
  })
})

describe("getRationalization / buildRationalizationPatch", () => {
  it("reads the decision persisted on form_data.rationalization", () => {
    const s = mkSub("target", "nist", {}, {
      rationalization: { clusterId: "c1", decision: "keep_separate", decidedBy: "A", decidedAt: "2026-01-01T00:00:00.000Z" },
    })
    expect(getRationalization(s)).toEqual({
      clusterId: "c1",
      decision: "keep_separate",
      decidedBy: "A",
      decidedAt: "2026-01-01T00:00:00.000Z",
    })
  })

  it("returns undefined when no decision has been recorded", () => {
    expect(getRationalization(mkSub("target", "nist", {}))).toBeUndefined()
  })

  it("builds a consolidated patch with the chosen lead", () => {
    const cluster: RationalizationCluster = {
      id: "c1",
      memberIds: ["a", "b"],
      bureaus: ["census", "ita"],
      scope: "cross_bureau",
      maxSimilarity: 0.5,
    }
    const patch = buildRationalizationPatch(cluster, "consolidated", {
      leadSubmissionId: "a",
      decidedBy: "Jane Reviewer",
      decidedAt: "2026-01-01T00:00:00.000Z",
    })
    expect(patch).toEqual({
      rationalization: {
        clusterId: "c1",
        decision: "consolidated",
        leadSubmissionId: "a",
        decidedBy: "Jane Reviewer",
        decidedAt: "2026-01-01T00:00:00.000Z",
      },
    })
  })

  it("omits leadSubmissionId for a keep-separate patch even if one is passed", () => {
    const cluster: RationalizationCluster = {
      id: "c1",
      memberIds: ["a", "b"],
      bureaus: ["census", "ita"],
      scope: "cross_bureau",
      maxSimilarity: 0.5,
    }
    const patch = buildRationalizationPatch(cluster, "keep_separate", {
      leadSubmissionId: "a",
      decidedBy: "Jane Reviewer",
      decidedAt: "2026-01-01T00:00:00.000Z",
    })
    expect(patch.rationalization.leadSubmissionId).toBeUndefined()
  })
})
