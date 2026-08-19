import { describe, it, expect } from "vitest"
import {
  buildReviewSteps,
  defaultReviewStep,
  nextReviewStep,
  previousReviewStep,
  reviewStepByKey,
  totalReviewSteps,
  type ReviewStepsInput,
} from "@/lib/reviewSteps"

const allUnsettled: ReviewStepsInput = {
  hasCluster: true,
  clusterSettled: false,
  highImpactSettled: false,
  rmfEnabled: true,
  rmfSettled: false,
  governanceSettled: false,
  dispositionSettled: false,
}

describe("buildReviewSteps", () => {
  it("returns 5 steps starting with cluster when the submission has a pending cluster", () => {
    const steps = buildReviewSteps(allUnsettled)
    expect(steps.map((s) => s.key)).toEqual(["cluster", "high_impact", "rmf", "governance", "disposition"])
    expect(steps.map((s) => s.index)).toEqual([1, 2, 3, 4, 5])
    expect(totalReviewSteps(steps)).toBe(5)
  })

  it("returns 4 steps, no cluster, when the submission has no cluster", () => {
    const steps = buildReviewSteps({ ...allUnsettled, hasCluster: false })
    expect(steps.map((s) => s.key)).toEqual(["high_impact", "rmf", "governance", "disposition"])
    expect(steps.map((s) => s.index)).toEqual([1, 2, 3, 4])
    expect(totalReviewSteps(steps)).toBe(4)
  })

  it("returns 3 steps for a tenant with neither clusters nor RMF (USPTO/DoW parity)", () => {
    const steps = buildReviewSteps({ ...allUnsettled, hasCluster: false, rmfEnabled: false })
    expect(steps.map((s) => s.key)).toEqual(["high_impact", "governance", "disposition"])
    expect(totalReviewSteps(steps)).toBe(3)
  })

  it("drops the RMF step for a tenant with clusters but no RMF", () => {
    const steps = buildReviewSteps({ ...allUnsettled, rmfEnabled: false })
    expect(steps.map((s) => s.key)).toEqual(["cluster", "high_impact", "governance", "disposition"])
  })

  it("carries each step's settled flag through unchanged", () => {
    const steps = buildReviewSteps({
      ...allUnsettled,
      clusterSettled: true,
      highImpactSettled: true,
      rmfSettled: false,
    })
    expect(steps.find((s) => s.key === "cluster")?.settled).toBe(true)
    expect(steps.find((s) => s.key === "high_impact")?.settled).toBe(true)
    expect(steps.find((s) => s.key === "rmf")?.settled).toBe(false)
  })
})

describe("defaultReviewStep", () => {
  it("defaults to the first (cluster) step when nothing is settled", () => {
    expect(defaultReviewStep(buildReviewSteps(allUnsettled))).toBe("cluster")
  })

  it("defaults to the first unsettled step when earlier steps are settled", () => {
    const steps = buildReviewSteps({ ...allUnsettled, clusterSettled: true, highImpactSettled: true })
    expect(defaultReviewStep(steps)).toBe("rmf")
  })

  it("skips a step that doesn't apply to this submission", () => {
    // No cluster: the first unsettled step among [high_impact, rmf, governance, disposition].
    const steps = buildReviewSteps({ ...allUnsettled, hasCluster: false, highImpactSettled: true })
    expect(defaultReviewStep(steps)).toBe("rmf")
  })

  it("falls back to the last step (disposition) once everything else is settled", () => {
    const steps = buildReviewSteps({
      hasCluster: true,
      clusterSettled: true,
      highImpactSettled: true,
      rmfEnabled: true,
      rmfSettled: true,
      governanceSettled: true,
      dispositionSettled: false,
    })
    expect(defaultReviewStep(steps)).toBe("disposition")
  })
})

describe("reviewStepByKey / nextReviewStep / previousReviewStep", () => {
  const steps = buildReviewSteps(allUnsettled)

  it("looks up a step by key", () => {
    expect(reviewStepByKey(steps, "rmf")?.index).toBe(3)
    expect(reviewStepByKey(steps, "cluster")?.index).toBe(1)
  })

  it("returns undefined for a step that doesn't apply", () => {
    const noCluster = buildReviewSteps({ ...allUnsettled, hasCluster: false })
    expect(reviewStepByKey(noCluster, "cluster")).toBeUndefined()
  })

  it("walks forward and backward through the step list", () => {
    expect(nextReviewStep(steps, "cluster")?.key).toBe("high_impact")
    expect(nextReviewStep(steps, "disposition")).toBeUndefined()
    expect(previousReviewStep(steps, "high_impact")?.key).toBe("cluster")
    expect(previousReviewStep(steps, "cluster")).toBeUndefined()
  })
})
