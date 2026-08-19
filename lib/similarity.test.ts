import { describe, it, expect } from "vitest"
import { similarity, findSimilar, clusterSignals } from "@/lib/similarity"
import { docSeedSubmissions } from "@/lib/seedSubmissionsDoc"
import { doc } from "@/lib/tenant/doc"
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

describe("clusterSignals", () => {
  function member(id: string, overrides: Partial<Submission["formData"]>): Submission {
    return {
      id,
      submittedAt: new Date(0).toISOString(),
      businessUnit: "nist",
      formData: {
        useCaseTitle: "",
        coreProblem: "",
        proposedSolution: "",
        useCaseDescription: "",
        submitterOffice: "nist",
        ...overrides,
      } as any,
    }
  }

  it("returns five rows, each a percentage in [0, 100]", () => {
    const a = member("a", { proposedSolution: "alpha bravo charlie" })
    const b = member("b", { proposedSolution: "alpha bravo delta" })
    const rows = clusterSignals([a, b], doc)
    expect(rows.map((r) => r.label)).toEqual([
      "Solution approach",
      "Problem statement",
      "Users and context",
      "Affected areas",
      "Benefits",
    ])
    for (const row of rows) {
      expect(row.score).toBeGreaterThanOrEqual(0)
      expect(row.score).toBeLessThanOrEqual(100)
    }
  })

  it("scores the solution-approach field's Jaccard overlap and names its top shared terms for a known pair", () => {
    const a = member("a", { proposedSolution: "Scores vendor risk from CPARS history for contracting officers." })
    const b = member("b", { proposedSolution: "Scores vendor risk from CPARS records for supply planners." })
    const [solutionRow] = clusterSignals([a, b], doc)
    // tokenize()'s stemming: "scores" -> "scor", "cpars" -> "cpar" (its normalize()
    // strips a trailing "es"/"s" before this module ever sees the token).
    // Set A = {scor, vendor, risk, cpar, history, contract, officer} (7)
    // Set B = {scor, vendor, risk, cpar, record, supply, planner} (7)
    // Shared = {scor, vendor, risk, cpar} (4) -> Jaccard = 4 / (7+7-4) = 0.4
    expect(solutionRow.score).toBe(40)
    expect(solutionRow.topTerms).toEqual(["cpar", "risk", "scor"])
  })

  it("is empty-safe: [] topTerms and 0 score for fields with nothing in common", () => {
    const a = member("a", { userValue: "alpha bravo charlie", businessValue: "" })
    const b = member("b", { userValue: "delta echo foxtrot", businessValue: "" })
    const benefitsRow = clusterSignals([a, b], doc).find((r) => r.label === "Benefits")!
    expect(benefitsRow.score).toBe(0)
    expect(benefitsRow.topTerms).toEqual([])
  })

  it("averages pairwise across every member, not just the first two", () => {
    const a = member("a", { proposedSolution: "alpha bravo charlie delta" })
    const b = member("b", { proposedSolution: "alpha bravo echo foxtrot" })
    const c = member("c", { proposedSolution: "golf hotel india juliet" }) // shares nothing with a or b
    const [solutionRow] = clusterSignals([a, b, c], doc)
    // Pairs: a-b share {alpha, bravo} out of 4+4-2=6 -> 0.333; a-c and b-c share nothing -> 0.
    // Average of the three pairs = 0.333/3 = 0.111 -> 11%.
    expect(solutionRow.score).toBe(11)
  })
})
