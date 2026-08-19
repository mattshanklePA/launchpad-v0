import { describe, it, expect } from "vitest"
import { clusterFallback } from "@/lib/clusterFallback"

// RD-4: assessCluster falls back to this object when the model is
// unavailable. app/cluster-actions.ts is "use server" and outside the vitest
// include globs, so the fallback lives here and is unit-tested directly.
describe("clusterFallback", () => {
  it("recommends keeping separate with a non-empty headline and tradeoff", () => {
    const result = clusterFallback()
    expect(result.recommendation).toBe("keep_separate")
    expect(result.headline.trim()).not.toBe("")
    expect(result.tradeoff.trim()).not.toBe("")
  })

  it("gives exactly three non-empty, generic reasons", () => {
    const result = clusterFallback()
    expect(result.reasons).toHaveLength(3)
    for (const reason of result.reasons) {
      expect(reason.trim()).not.toBe("")
    }
  })

  it("names losing per-office approval records as the tradeoff", () => {
    expect(clusterFallback().tradeoff.toLowerCase()).toContain("approval record")
  })
})
