import { describe, it, expect } from "vitest"
import { buildPortfolioReport } from "@/lib/portfolioReport"
import { es2 } from "@/lib/tenant/es2"
import { uspto } from "@/lib/tenant/uspto"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { initialFormData } from "@/lib/steps"
import type { FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { medianTimeToDecision } from "@/lib/timeToDecision"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { DEFAULT_COPY } from "@/lib/tenant/copy"

// A small hand-built set with known answers (see the table in each test). All
// times are 17:00 UTC (noon in New York), so no day count sits on a boundary.
const NOW = Date.parse("2026-12-10T17:00:00Z")
const at = (month: number, day: number) => `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T17:00:00Z`

type Risk = "high" | "medium" | "low"
const RISK_FIELDS: Record<Risk, Partial<FormData>> = {
  high: { involvesSensitiveData: "yes", aiDecisionalImpact: "no", aiModelSourcing: "foreign", aiHumanReview: "yes" },
  medium: { involvesSensitiveData: "yes", aiDecisionalImpact: "no", aiModelSourcing: "american_built", aiHumanReview: "yes" },
  low: { involvesSensitiveData: "no", aiDecisionalImpact: "no", aiModelSourcing: "american_built", aiHumanReview: "yes" },
}

type Spec = {
  id: string
  office: string
  program?: string
  status: string
  risk: Risk
  submitted: string
  decided?: string
  words: string
  focus?: string[]
  measure?: boolean
  reason?: string
  reviewer?: string
}

function idea(s: Spec): Submission {
  const fd: Record<string, unknown> = {
    ...initialFormData,
    ...RISK_FIELDS[s.risk],
    useCaseTitle: `Title ${s.id}`,
    coreProblem: s.words,
    proposedSolution: s.words,
    useCaseDescription: s.words,
    submitterOffice: s.office,
    submitterSubOffice: s.program ?? "",
    reviewStatus: s.status,
    usptoFocusArea: s.focus ?? ["dow_ai_first"],
    successMetrics: s.measure === false ? "" : "Files returned per month",
    keyMetrics: [],
  }
  if (s.reason) fd.riskPlainReason = s.reason
  if (s.reviewer) fd.assignedReviewerName = s.reviewer
  if (s.decided) {
    fd.bureauSignoff = {
      bureau: s.office,
      decision: s.status === "approved" ? "approved" : "rejected",
      signedOffByName: "Alan Brooks",
      signedOffByEmail: "alan.brooks@es2.demo",
      signedOffAt: s.decided,
    }
  }
  return { id: s.id, submittedAt: s.submitted, status: s.status, businessUnit: s.office, office: s.program ?? "", formData: fd as unknown as FormData }
}

const DUP_WORDS = "score vendor past performance history before award source selection delivery risk"
const SET: Submission[] = [
  idea({ id: "a1", office: "atr", program: "acws", status: "in_review", risk: "high", submitted: at(11, 20), words: "alphazebra quillfish", reason: "Scores people for promotion; a person must decide.", reviewer: "Pat Reviewer" }),
  idea({ id: "a2", office: "atr", program: "atis", status: "approved", risk: "low", submitted: at(11, 1), decided: at(11, 11), words: "bravomoose tangerine", focus: [] }),
  idea({ id: "a3", office: "atr", program: "adams", status: "submitted", risk: "medium", submitted: at(12, 5), words: "charliefox pelican", focus: ["no_such_focus"], measure: false }),
  idea({ id: "h1", office: "hrfm", status: "rejected", risk: "high", submitted: at(11, 1), decided: at(11, 15), words: "deltaotter marigold", reason: "Scores people for promotion; a person must decide." }),
  idea({ id: "h2", office: "hrfm", status: "approved", risk: "medium", submitted: at(11, 10), decided: at(11, 16), words: "echoheron basalt" }),
  idea({ id: "h3", office: "hrfm", status: "in_review", risk: "high", submitted: at(11, 25), words: "foxtrotlynx cobalt", reason: "Reads personnel files." }),
  idea({ id: "l1", office: "logfin", status: "approved", risk: "low", submitted: at(11, 1), decided: at(11, 9), words: "golfibis walnut" }),
  idea({ id: "l2", office: "logfin", status: "in_review", risk: "high", submitted: at(12, 1), words: "hotelkestrel juniper" }),
  idea({ id: "d1", office: "logfin", status: "submitted", risk: "medium", submitted: at(11, 5), words: DUP_WORDS, measure: false }),
  idea({ id: "d2", office: "bts", status: "in_review", risk: "medium", submitted: at(11, 8), words: DUP_WORDS, measure: false }),
]
const label = (value: string) => es2.unit.options.find((o) => o.value === value)!.label

const report = () => buildPortfolioReport(SET, es2, NOW)

describe("buildPortfolioReport: summary numbers (hand-built set)", () => {
  it("period runs from the earliest submitted date to now", () => {
    const r = report()
    expect(r.period.start).toBe(at(11, 1))
    expect(r.period.end).toBe(new Date(NOW).toISOString())
    expect(r.period.label).toBe("1 Nov 2026 to 10 Dec 2026")
  })

  it("risk: counts and the most common plain reason among high-risk ideas", () => {
    const { risk } = report().summary
    expect([risk.high, risk.medium, risk.low]).toEqual([4, 4, 2])
    expect(risk.total).toBe(10)
    expect(risk.topReason).toEqual({ text: "Scores people for promotion; a person must decide.", count: 2 })
  })

  it("decisions: decided, approved, not approved, median and what it covers", () => {
    const { decisions } = report().summary
    expect(decisions).toMatchObject({ decided: 4, approved: 3, notApproved: 1, medianDays: 8, medianCovers: 4 })
  })

  it("overlap: groups, ideas covered, offices involved, largest group", () => {
    const { overlap } = report().summary
    expect(overlap).toMatchObject({ groups: 1, ideas: 2, offices: 2 })
    expect(overlap.largest).toEqual({ title: "Title d1", offices: [label("logfin"), label("bts")] })
  })

  it("data check: office and risk, no measure, empty offices, no priority", () => {
    const { dataCheck } = report().summary
    expect(dataCheck.withOfficeAndRisk).toBe(10)
    expect(dataCheck.noMeasure).toBe(3)
    expect(dataCheck.noMeasureIds.sort()).toEqual(["a3", "d1", "d2"])
    expect(dataCheck.officesWithNoIdeas).toBe(1)
    expect(dataCheck.officesWithNoIdeasLabels).toEqual([label("cerp")])
    expect(dataCheck.noPriority).toBe(2)
  })

  it("an idea with no measure counts only when successMetrics and keyMetrics are both empty", () => {
    const withKey = idea({ id: "k1", office: "bts", status: "submitted", risk: "low", submitted: at(12, 1), words: "kiloheron", measure: false })
    ;(withKey.formData as unknown as { keyMetrics: string[] }).keyMetrics = ["Hours saved"]
    expect(buildPortfolioReport([withKey], es2, NOW).summary.dataCheck.noMeasure).toBe(0)
  })

  it('"no priority" counts an idea with no focus area and one with only unknown ids, not a known enterprise or office one', () => {
    const r = report()
    expect(r.ideas.find((i) => i.id === "a2")!.priority).toEqual({ labels: [], text: "No priority" })
    expect(r.ideas.find((i) => i.id === "a3")!.priority.text).toBe("No priority")
    const office = idea({ id: "p1", office: "atr", status: "submitted", risk: "low", submitted: at(12, 1), words: "papaya", focus: ["atr_contract_speed"] })
    const hit = buildPortfolioReport([office], es2, NOW)
    expect(hit.summary.dataCheck.noPriority).toBe(0)
    expect(hit.ideas[0].priority.labels).toEqual(["Faster, more accurate contract actions"])
  })
})

describe("buildPortfolioReport: by program office", () => {
  it("one row per office in config order, an empty office has a zero row with no median", () => {
    const { offices } = report()
    expect(offices.rows.map((r) => r.id)).toEqual(es2.unit.options.map((o) => o.value))
    const cerp = offices.rows.find((r) => r.id === "cerp")!
    expect(cerp).toMatchObject({ ideas: 0, highRisk: 0, inReview: 0, decided: 0, medianDays: undefined, share: 0 })
  })

  it("known rows, and rows add up to totals", () => {
    const { offices } = report()
    const row = (id: string) => offices.rows.find((r) => r.id === id)!
    expect(row("atr")).toMatchObject({ ideas: 3, highRisk: 1, inReview: 1, decided: 1, medianDays: 10 })
    expect(row("hrfm")).toMatchObject({ ideas: 3, highRisk: 2, inReview: 1, decided: 2, medianDays: 6 })
    expect(row("logfin")).toMatchObject({ ideas: 3, highRisk: 1, inReview: 1, decided: 1, medianDays: 8 })
    expect(row("bts")).toMatchObject({ ideas: 1, highRisk: 0, inReview: 1, decided: 0, medianDays: undefined })
    const sum = (k: "ideas" | "highRisk" | "inReview" | "decided") => offices.rows.reduce((n, r) => n + r[k], 0)
    expect(offices.totals).toMatchObject({ ideas: 10, highRisk: 4, inReview: 4, decided: 4, medianDays: 8 })
    for (const k of ["ideas", "highRisk", "inReview", "decided"] as const) expect(sum(k)).toBe(offices.totals[k])
    expect(offices.rows.reduce((n, r) => n + r.share, 0)).toBeCloseTo(1)
    expect(row("atr").share).toBeCloseTo(0.3)
  })

  it("an idea with no known office gets its own row so the rows still add up", () => {
    const stray = idea({ id: "s1", office: "", status: "submitted", risk: "low", submitted: at(12, 1), words: "stray" })
    const { offices, summary } = buildPortfolioReport([...SET, stray], es2, NOW)
    expect(offices.rows.reduce((n, r) => n + r.ideas, 0)).toBe(offices.totals.ideas)
    expect(offices.rows.at(-1)).toMatchObject({ id: "", ideas: 1 })
    expect(summary.dataCheck.withOfficeAndRisk).toBe(10)
  })

  it("median with an even count matches medianTimeToDecision", () => {
    expect(report().summary.decisions.medianDays).toBe(medianTimeToDecision(SET))
    expect(report().summary.decisions.medianDays).toBe(8)
  })
})

describe("buildPortfolioReport: needs a leader's decision", () => {
  it("is at most 3, longest waiting first, from the two rules only", () => {
    const { needsLeader } = report()
    expect(needsLeader.items.map((i) => [i.kind, i.id, i.daysWaiting])).toEqual([
      ["overlap", "d1", 35],
      ["high_risk", "a1", 20],
      ["high_risk", "h3", 15],
    ])
    expect(needsLeader.openCount).toBe(6)
  })

  it("lists a duplicate group once, naming its offices, linked to the group", () => {
    const items = report().needsLeader.items.filter((i) => i.kind === "overlap")
    expect(items).toHaveLength(1)
    expect(items[0].why).toContain(label("logfin"))
    expect(items[0].why).toContain(label("bts"))
    expect(items[0].href).toBe("/clusters/d1")
  })

  it("never lists a decided idea, and always has a holder", () => {
    const { items } = report().needsLeader
    for (const i of items) {
      expect(["approved", "rejected"]).not.toContain(SET.find((s) => s.id === i.id)!.status)
      expect(i.heldBy.trim()).not.toBe("")
    }
    expect(items.find((i) => i.id === "a1")!.heldBy).toBe("Pat Reviewer")
    expect(items.find((i) => i.id === "h3")!.heldBy).toBe(label("hrfm"))
    expect(items.find((i) => i.id === "d1")!.heldBy).toBe(label("logfin"))
    expect(items.find((i) => i.id === "a1")!.href).toBe("/submissions/a1")
  })

  it("a group that has been decided no longer waits", () => {
    const decidedSet = SET.map((s) =>
      s.id === "d1" || s.id === "d2"
        ? { ...s, formData: { ...s.formData, rationalization: { clusterId: "d1", decision: "keep_separate", decidedBy: "x", decidedAt: at(12, 1) } } as unknown as FormData }
        : s,
    )
    const { items } = buildPortfolioReport(decidedSet, es2, NOW).needsLeader
    expect(items.some((i) => i.kind === "overlap")).toBe(false)
  })
})

describe("buildPortfolioReport: office filter", () => {
  const r = buildPortfolioReport(SET, es2, NOW, "logfin")
  it("filters every section to that office and says so", () => {
    expect(r.officeId).toBe("logfin")
    expect(r.scopeLabel).toBe(label("logfin"))
    expect(r.summary.risk).toMatchObject({ high: 1, medium: 1, low: 1, total: 3 })
    expect(r.summary.decisions).toMatchObject({ decided: 1, medianDays: 8, medianCovers: 1 })
    expect(r.summary.overlap).toMatchObject({ groups: 1, ideas: 1, offices: 2 })
    expect(r.summary.dataCheck).toMatchObject({ noMeasure: 1, officesWithNoIdeas: 0, noPriority: 0 })
    expect(r.period.start).toBe(at(11, 1))
    expect(r.offices.rows.map((x) => x.id)).toEqual(["logfin"])
    expect(r.offices.totals.ideas).toBe(3)
    expect(r.ideas.map((i) => i.id).sort()).toEqual(["d1", "l1", "l2"])
    expect(r.needsLeader.items.map((i) => i.id)).toEqual(["d1", "l2"])
    expect(r.needsLeader.openCount).toBe(2)
  })
  it("has no scope label for the whole portfolio", () => {
    expect(report().scopeLabel).toBeUndefined()
  })
})

describe("buildPortfolioReport: every idea", () => {
  it("defaults to highest risk first, then longest open", () => {
    expect(report().ideas.map((i) => i.id)).toEqual(["a1", "h3", "h1", "l2", "d1", "d2", "h2", "a3", "a2", "l1"])
  })

  it("carries labels, plain status, risk level, days, decided by, and the record link", () => {
    const byId = (id: string) => report().ideas.find((i) => i.id === id)!
    expect(byId("a1")).toMatchObject({
      title: "Title a1",
      office: label("atr"),
      program: "Army Contract Writing System (ACWS)",
      status: "In review",
      risk: "High",
      reason: "Scores people for promotion; a person must decide.",
      days: "20 days open",
      decidedBy: "Not yet",
      href: "/submissions/a1",
    })
    expect(byId("a2")).toMatchObject({ status: "Approved", risk: "Low", days: "10 days to decide", decidedBy: "Alan Brooks" })
    expect(byId("h2").risk).toBe("Medium")
    expect(byId("h1").status).toBe("Rejected")
  })

  it("uses the standard line for the risk level when the record has no plain reason and no high-impact reason", () => {
    expect(report().ideas.find((i) => i.id === "l2")!.reason).toBe(DEFAULT_COPY.portfolioReasonHigh)
  })

  it("uses the first high-impact reason with the citation removed when there is no plain reason", () => {
    const s = idea({ id: "x1", office: "atr", status: "submitted", risk: "medium", submitted: at(12, 1), words: "xray" })
    ;(s.formData as unknown as Record<string, unknown>).highImpactFactors = ["rights"]
    const reason = buildPortfolioReport([s], es2, NOW).ideas[0].reason
    expect(reason).toBe("AI output could meaningfully affect an individual's rights.")
  })
})

describe("buildPortfolioReport: flags the screen filters read (F5-2)", () => {
  it("marks decided ideas and ideas that sit in a look-alike group", () => {
    const r = report()
    const byId = new Map(r.ideas.map((i) => [i.id, i]))
    expect(r.ideas.filter((i) => i.decided).map((i) => i.id).sort()).toEqual(["a2", "h1", "h2", "l1"])
    expect(r.ideas.filter((i) => i.inOverlap).map((i) => i.id).sort()).toEqual(["d1", "d2"])
    expect(byId.get("a1")).toMatchObject({ decided: false, inOverlap: false })
  })

  it("with an office, an idea in a group that spans offices still counts as overlapping", () => {
    const r = buildPortfolioReport(SET, es2, NOW, "logfin")
    expect(r.ideas.filter((i) => i.inOverlap).map((i) => i.id)).toEqual(["d1"])
  })
})

describe("buildPortfolioReport: days use the fixed New York day", () => {
  it("2 Nov 23:00 in New York is 1 day before 3 Nov 23:00, whatever the viewer's zone", () => {
    const s = idea({ id: "z1", office: "atr", status: "submitted", risk: "low", submitted: "2026-11-01T03:00:00Z", words: "zulu" })
    const r = buildPortfolioReport([s], es2, Date.parse("2026-11-03T03:00:00Z"))
    expect(r.ideas[0].days).toBe("2 days open")
  })
})

describe("buildPortfolioReport: the ES2 seed", () => {
  const now = Date.now()
  const r = buildPortfolioReport(es2SeedSubmissions, es2, now)

  it("matches the approved numbers", () => {
    expect(r.ideas).toHaveLength(42)
    expect(r.summary.risk.high).toBe(6)
    expect(r.summary.decisions.decided).toBe(14)
    expect(r.summary.overlap.groups).toBe(3)
    expect(r.summary.decisions.medianDays).toBe(11)
    expect(r.offices.totals.ideas).toBe(42)
    expect(r.offices.rows.reduce((n, x) => n + x.ideas, 0)).toBe(42)
  })

  it("lists at most 3 leader items, each with a holder", () => {
    expect(r.needsLeader.items.length).toBeGreaterThan(0)
    expect(r.needsLeader.items.length).toBeLessThanOrEqual(3)
    for (const i of r.needsLeader.items) expect(i.heldBy).not.toBe("")
  })

  it("returns no banned word anywhere in its text", () => {
    const strings: string[] = []
    const walk = (v: unknown) => {
      if (typeof v === "string") strings.push(v)
      else if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === "object") Object.values(v).forEach(walk)
    }
    walk(r)
    // Hrefs and iso dates are not text a reader sees.
    const text = strings.filter((x) => !x.startsWith("/") && !/^\d{4}-\d\d-\d\dT/.test(x)).join("\n")
    const banned = /\bRMF\b|rationali[sz]ation|reportability|minimum practices|\brequires\b|—|\bAnthropic\b|\bClaude\b|\bSonnet\b|\bOpus\b|\bHaiku\b|\bOpenAI\b|\bChatGPT\b|\bGPT-?\d\w*\b|\bGemini\b|\bLlama\b|\bMistral\b|\bCohere\b/i
    expect(text.match(banned)).toBeNull()
    expect(text).not.toMatch(/\bM-2\d-\d+\b|\bOMB\b|\bNIST\b/)
  })
})

describe("portfolioReport tenant flag", () => {
  it("is on for ES2 only", () => {
    expect(es2.features.portfolioReport).toBe(true)
    for (const t of [uspto, doc, dow]) expect(t.features.portfolioReport).toBe(false)
  })
})
