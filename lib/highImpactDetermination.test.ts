import { describe, it, expect } from "vitest"
import { determineHighImpact } from "@/lib/highImpactDetermination"

describe("determineHighImpact", () => {
  describe("explicit highImpactFactors (manual path)", () => {
    it("recommends high-impact when the AI output could affect rights", () => {
      const result = determineHighImpact({ highImpactFactors: ["rights"] })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /rights/i.test(r))).toBe(true)
    })

    it("recommends high-impact when the AI output could affect safety", () => {
      const result = determineHighImpact({ highImpactFactors: ["safety"] })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /safety/i.test(r))).toBe(true)
    })

    it("recommends high-impact when the AI output could affect access to benefits", () => {
      const result = determineHighImpact({ highImpactFactors: ["benefits_access"] })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /benefits/i.test(r))).toBe(true)
    })

    it("recommends high-impact when the AI output could affect resource allocation", () => {
      const result = determineHighImpact({ highImpactFactors: ["resource_allocation"] })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /resource/i.test(r))).toBe(true)
    })

    it("recommends high-impact when the AI output could affect enforcement actions", () => {
      const result = determineHighImpact({ highImpactFactors: ["enforcement"] })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /enforcement/i.test(r))).toBe(true)
    })

    it("recommends high-impact with one reason per selected factor when multiple apply", () => {
      const result = determineHighImpact({ highImpactFactors: ["safety", "enforcement"] })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons).toHaveLength(2)
    })

    it("recommends not-high-impact when no factors are flagged", () => {
      const result = determineHighImpact({ highImpactFactors: [] })
      expect(result.recommendation).toBe("no")
      expect(result.reasons[0]).toMatch(/none of the ai output/i)
    })

    it("recommends not-high-impact when factors haven't been answered yet", () => {
      const result = determineHighImpact({ highImpactFactors: undefined as unknown as string[] })
      expect(result.recommendation).toBe("no")
    })
  })

  // Inference layer: recommends high-impact from risk signals LaunchPad already
  // captures (lib/riskProfile.ts's fields, plus problem/solution text as a
  // secondary signal) even when nobody checked an explicit highImpactFactors
  // box. Added for https://github.com/mattshanklePA/launchpad-v0/issues/27 —
  // the NOAA severe-weather-alert item was recommended "Not high-impact"
  // despite being flagged decisional AI in its Risk Profile.
  describe("inferred signals (no explicit highImpactFactors set)", () => {
    it("infers rights from decisional AI (decision or outcome about an individual)", () => {
      const result = determineHighImpact({
        highImpactFactors: [],
        aiDecisionalImpact: "yes",
      })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /decisional impact on individuals.*rights/i.test(r))).toBe(true)
    })

    it("infers safety from a high-severity, life-safety problem/solution description", () => {
      const result = determineHighImpact({
        highImpactFactors: [],
        severity: "high",
        problemImpact: "Slower comprehension can delay protective action during severe weather.",
      })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /life-safety.*safety/i.test(r))).toBe(true)
    })

    it("does not infer safety from life-safety language when severity isn't high", () => {
      const result = determineHighImpact({
        highImpactFactors: [],
        severity: "medium",
        problemImpact: "Delays protective action during severe weather.",
      })
      expect(result.recommendation).toBe("no")
    })

    it("infers access to benefits from decisional AI plus eligibility/benefits language", () => {
      const result = determineHighImpact({
        highImpactFactors: [],
        aiDecisionalImpact: "yes",
        proposedSolution: "Automatically issues an eligibility determination for the federal grant program.",
      })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /benefits eligibility or adjudication.*access to benefits/i.test(r))).toBe(
        true,
      )
    })

    it("infers resource allocation from decisional AI plus resource-allocation language", () => {
      const result = determineHighImpact({
        highImpactFactors: [],
        aiDecisionalImpact: "yes",
        proposedSolution: "Automatically decides budget allocation across regional field offices.",
      })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /resource allocation context.*resource allocation/i.test(r))).toBe(true)
    })

    it("infers enforcement from decisional AI plus enforcement/adjudication language", () => {
      const result = determineHighImpact({
        highImpactFactors: [],
        aiDecisionalImpact: "yes",
        proposedSolution: "Automatically issues a penalty determination following an investigation.",
      })
      expect(result.recommendation).toBe("yes")
      expect(
        result.reasons.some((r) => /enforcement \/ adjudication context.*enforcement actions/i.test(r)),
      ).toBe(true)
    })

    it("does not infer benefits/resource/enforcement from text alone without decisional AI", () => {
      const result = determineHighImpact({
        highImpactFactors: [],
        aiDecisionalImpact: "no",
        proposedSolution:
          "Automatically issues an eligibility determination, decides budget allocation, and issues penalties after an investigation.",
      })
      expect(result.recommendation).toBe("no")
    })

    it("recommends not-high-impact for a clean, low-risk submission with no signals", () => {
      const result = determineHighImpact({
        highImpactFactors: [],
        aiDecisionalImpact: "no",
        severity: "medium",
        coreProblem: "Staff spend time manually searching a large publications corpus.",
        problemImpact: "Search time is a recurring tax on technical staff.",
        proposedSolution: "A cited retrieval assistant that returns ranked, summarized results for staff to verify.",
      })
      expect(result.recommendation).toBe("no")
      expect(result.reasons[0]).toMatch(/none of the ai output/i)
    })

    it("combines a manual factor with an inferred one without dropping either reason", () => {
      const result = determineHighImpact({
        highImpactFactors: ["safety"],
        aiDecisionalImpact: "yes",
      })
      expect(result.recommendation).toBe("yes")
      expect(result.reasons.some((r) => /affect the safety of individuals/i.test(r))).toBe(true)
      expect(result.reasons.some((r) => /decisional impact on individuals.*rights/i.test(r))).toBe(true)
    })
  })
})
