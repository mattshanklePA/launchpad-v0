import { describe, it, expect } from "vitest"
import { determineHighImpact } from "@/lib/highImpactDetermination"

describe("determineHighImpact", () => {
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
