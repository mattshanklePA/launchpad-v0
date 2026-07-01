import { describe, it, expect } from "vitest"
import { similarity, findSimilar } from "@/lib/similarity"
import { docSeedSubmissions } from "@/lib/seedSubmissionsDoc"
import type { Submission } from "@/lib/submissions"

function mkSub(id: string, businessUnit: string, text: Partial<{
  useCaseTitle: string
  coreProblem: string
  proposedSolution: string
  useCaseDescription: string
}>): Submission {
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
    } as any,
  }
}

const census = docSeedSubmissions.find((s) => s.id === "doc-census-survey-assistant")!
const ita = docSeedSubmissions.find((s) => s.id === "doc-ita-exporter-assistant")!
const os = docSeedSubmissions.find((s) => s.id === "doc-os-response-copilot")!

describe("similarity", () => {
  it("scores an identical submission against itself at ~1.0", () => {
    expect(similarity(census, census)).toBeCloseTo(1, 5)
  })

  it("scores completely unrelated submissions at ~0", () => {
    const a = mkSub("a", "nist", {
      useCaseTitle: "Kubernetes cluster autoscaling tuner",
      coreProblem: "Container workloads provision compute nodes overnight, wasting budget.",
      proposedSolution: "A scheduler heuristic that scales node pools down using utilization curves from the past week.",
      useCaseDescription: "Infrastructure automation for right-sizing compute clusters.",
    })
    const b = mkSub("b", "noaa", {
      useCaseTitle: "Medieval falconry apprenticeship tracker",
      coreProblem: "Apprentice falconers lack a structured log of training milestones.",
      proposedSolution: "A journal that records falconry apprenticeship milestones and mentor sign-off.",
      useCaseDescription: "A recordkeeping tool for falconry apprenticeships.",
    })
    expect(similarity(a, b)).toBe(0)
  })

  it("scores the Census/ITA public-assistant near-duplicates well above the flag threshold", () => {
    expect(similarity(census, ita)).toBeGreaterThan(0.2)
  })

  it("scores the OS copilot as a weaker but still-detectable match against Census and ITA", () => {
    // OS is an internal drafting copilot rather than a public Q&A assistant, so its
    // wording overlaps less than Census/ITA do with each other — still clearly above
    // the similarity of two genuinely unrelated submissions.
    expect(similarity(os, census)).toBeGreaterThan(0.06)
    expect(similarity(os, ita)).toBeGreaterThan(0.06)
  })
})

describe("findSimilar", () => {
  it("finds the three DoC near-duplicates across each other, excluding self", () => {
    const matches = findSimilar(ita, docSeedSubmissions, { threshold: 0.2 })
    expect(matches.map((m) => m.submission.id)).toContain("doc-census-survey-assistant")
    expect(matches.map((m) => m.submission.id)).not.toContain("doc-ita-exporter-assistant")

    const osMatches = findSimilar(os, docSeedSubmissions, { threshold: 0.06 })
    const osMatchIds = osMatches.map((m) => m.submission.id)
    expect(osMatchIds).toContain("doc-census-survey-assistant")
    expect(osMatchIds).toContain("doc-ita-exporter-assistant")
    expect(osMatchIds).not.toContain("doc-os-response-copilot")
  })

  it("attaches the match's bureau and a score in [0, 1]", () => {
    const [top] = findSimilar(census, docSeedSubmissions, { threshold: 0.2 })
    expect(top.bureau).toBe("ita")
    expect(top.score).toBeGreaterThan(0)
    expect(top.score).toBeLessThanOrEqual(1)
  })

  // Controlled fixtures with disjoint, hand-picked tokens for exact, predictable
  // overlap fractions — independent of the real seed-data wording above.
  const target = mkSub("target", "nist", {
    coreProblem: "alpha bravo charlie delta echo foxtrot golf hotel",
  })
  const match90 = mkSub("match90", "census", { coreProblem: "alpha bravo charlie delta echo foxtrot golf india" }) // 7/9 = 0.78
  const match50 = mkSub("match50", "ita", { coreProblem: "alpha bravo charlie delta india juliet kilo lima" }) // 4/12 = 0.33
  const match10 = mkSub("match10", "bis", { coreProblem: "alpha india juliet kilo lima mike november oscar" }) // 1/15 = 0.067
  const unrelated = mkSub("unrelated", "noaa", { coreProblem: "papa quebec romeo sierra tango uniform victor whiskey" }) // 0
  const pool = [target, match90, match50, match10, unrelated]

  it("respects the threshold option", () => {
    const ids = findSimilar(target, pool, { threshold: 0.3 }).map((m) => m.submission.id)
    expect(ids).toEqual(["match90", "match50"])
  })

  it("respects the limit option and sorts by descending score", () => {
    const ids = findSimilar(target, pool, { threshold: 0, limit: 2 }).map((m) => m.submission.id)
    expect(ids).toEqual(["match90", "match50"])
  })

  it("excludes the target submission itself even at a zero threshold", () => {
    const ids = findSimilar(target, pool, { threshold: 0, limit: 10 }).map((m) => m.submission.id)
    expect(ids).not.toContain("target")
  })
})
