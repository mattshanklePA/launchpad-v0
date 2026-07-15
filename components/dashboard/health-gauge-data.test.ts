import { describe, it, expect } from "vitest"
import { clampHealthScore, getHealthBand, DEFAULT_HEALTH_THRESHOLDS } from "./health-gauge-data"

describe("clampHealthScore", () => {
  it("passes through in-range scores unchanged", () => {
    expect(clampHealthScore(64)).toBe(64)
  })

  it("clamps below 0 up to 0", () => {
    expect(clampHealthScore(-15)).toBe(0)
  })

  it("clamps above 100 down to 100", () => {
    expect(clampHealthScore(140)).toBe(100)
  })

  it("treats NaN as 0", () => {
    expect(clampHealthScore(Number.NaN)).toBe(0)
  })
})

describe("getHealthBand", () => {
  it("is critical below the watch threshold", () => {
    expect(getHealthBand(49)).toBe("critical")
  })

  it("is watch at the watch threshold and above", () => {
    expect(getHealthBand(50)).toBe("watch")
    expect(getHealthBand(79)).toBe("watch")
  })

  it("is healthy at the healthy threshold and above", () => {
    expect(getHealthBand(80)).toBe("healthy")
    expect(getHealthBand(100)).toBe("healthy")
  })

  it("clamps out-of-range scores before banding", () => {
    expect(getHealthBand(-10)).toBe("critical")
    expect(getHealthBand(500)).toBe("healthy")
  })

  it("honors custom thresholds", () => {
    const thresholds = { watch: 30, healthy: 60 }
    expect(getHealthBand(35, thresholds)).toBe("watch")
    expect(getHealthBand(65, thresholds)).toBe("healthy")
  })

  it("exports the default thresholds used when none are passed", () => {
    expect(DEFAULT_HEALTH_THRESHOLDS).toEqual({ watch: 50, healthy: 80 })
  })
})
