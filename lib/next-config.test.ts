import { describe, expect, it } from "vitest"
import nextConfig from "../next.config.mjs"

// SEC-5 (#263): two critical Next.js 14.2.35 advisories are reachable only via
// the Image Optimization API. `images.unoptimized: true` is the sole protection
// until the framework upgrade (#242). Do not remove or weaken this test.
describe("next.config.mjs image optimization guard", () => {
  it("keeps images.unoptimized === true", () => {
    expect(nextConfig.images?.unoptimized).toBe(true)
  })
})
