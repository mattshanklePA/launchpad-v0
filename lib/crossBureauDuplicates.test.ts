import { describe, it, expect } from "vitest"
import { docSeedSubmissions } from "@/lib/seedSubmissionsDoc"
import { hasCrossBureauMatch, crossBureauDuplicateCount, ROLLUP_DUPLICATE_THRESHOLD } from "@/lib/crossBureauDuplicates"

// Pins the bureau roll-up's "Possible duplicates" column against the golden
// seed: with the default lib/similarity.ts threshold (0.07), 8 of the 9
// original seed items cross-flag each other on generic token overlap, which
// read as a bug in a demo ("why is everything a duplicate?"). At the
// roll-up's stronger threshold, only the seed's intentional Census/ITA
// near-duplicate pair should surface. The seed's NIST/NOAA/ITA
// "meeting_transcription" trio (items 10-12) all land in the same
// lib/ombConsolidation.ts category, so even though their shared vocabulary
// pushes their pairwise similarity over 0.25, they're excluded as
// consolidatable-by-design rather than flagged as duplicates.

describe("cross-bureau duplicate detection (bureau roll-up threshold)", () => {
  it("flags only the intended Census/ITA comparison pair against the golden seed", () => {
    const flaggedIds = docSeedSubmissions
      .filter((s) => hasCrossBureauMatch(s, docSeedSubmissions))
      .map((s) => s.id)
      .sort()

    expect(flaggedIds).toEqual(["doc-census-survey-assistant", "doc-ita-exporter-assistant"])
  })

  it("does not flag most of the seed the way the default 0.07 threshold does", () => {
    const flaggedCount = docSeedSubmissions.filter((s) => hasCrossBureauMatch(s, docSeedSubmissions)).length
    expect(flaggedCount).toBeLessThan(docSeedSubmissions.length / 2)
  })

  it("does not flag the same-category NIST/NOAA/ITA meeting-transcription trio", () => {
    const trioIds = ["doc-nist-meeting-transcription", "doc-noaa-ops-meeting-recap", "doc-ita-mission-debrief-transcription"]
    for (const id of trioIds) {
      const s = docSeedSubmissions.find((sub) => sub.id === id)!
      expect(hasCrossBureauMatch(s, docSeedSubmissions)).toBe(false)
    }
  })

  it("counts duplicates per bureau, matching the flagged Census/ITA pair", () => {
    expect(crossBureauDuplicateCount(docSeedSubmissions, "census")).toBe(1)
    expect(crossBureauDuplicateCount(docSeedSubmissions, "ita")).toBe(1)
    expect(crossBureauDuplicateCount(docSeedSubmissions, "nist")).toBe(0)
    expect(crossBureauDuplicateCount(docSeedSubmissions, "noaa")).toBe(0)
  })

  it("is stronger than the submission-detail list's default threshold", () => {
    expect(ROLLUP_DUPLICATE_THRESHOLD).toBeGreaterThan(0.07)
  })
})
