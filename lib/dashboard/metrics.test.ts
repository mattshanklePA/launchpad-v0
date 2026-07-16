import { describe, it, expect } from "vitest"
import {
  scopedSubmissions,
  pipelineStatusCounts,
  readinessDistribution,
  highImpactCount,
  awaitingSignoff,
  ombReportabilitySummary,
  crossBureauDuplicatesSummary,
  bureauRollupRows,
  officeRollupRowsForScope,
  rmfRollupSummary,
  getDashboardMetrics,
} from "@/lib/dashboard/metrics"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { visibleSubmissions } from "@/lib/reviewWorkflow"
import { initialFormData } from "@/lib/steps"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import type { Submission } from "@/lib/submissions"

type SubInput = {
  id: string
  businessUnit: string
  office?: string
  status?: string
  ownerEmail?: string
  highImpact?: "high_impact" | "presumed_not_high_impact" | "not_high_impact" | ""
  highImpactFactors?: string[]
  aiDecisionalImpact?: "yes" | "no" | ""
  readinessScore?: "ready" | "needs_work" | "early_stage" | ""
  nationalSecuritySystem?: "yes" | "no" | ""
  researchOnly?: "yes" | "no" | ""
  stageOfDevelopment?: "pre_deployment" | "pilot" | "deployed" | "retired" | ""
  useCaseDescription?: string
  bureauSignoff?: { bureau: string; decision: "approved" | "rejected"; signedOffByName: string; signedOffByEmail: string; signedOffAt: string }
}

function sub(p: SubInput): Submission {
  return {
    id: p.id,
    submittedAt: new Date(0).toISOString(),
    status: p.status,
    businessUnit: p.businessUnit,
    office: p.office,
    ownerEmail: p.ownerEmail,
    formData: {
      submitterEmail: p.ownerEmail ?? "",
      highImpact: p.highImpact ?? "",
      highImpactFactors: p.highImpactFactors ?? [],
      aiDecisionalImpact: p.aiDecisionalImpact ?? "",
      readinessScore: p.readinessScore ?? "",
      nationalSecuritySystem: p.nationalSecuritySystem ?? "no",
      researchOnly: p.researchOnly ?? "no",
      stageOfDevelopment: p.stageOfDevelopment ?? "deployed",
      useCaseDescription: p.useCaseDescription ?? "",
      ...(p.bureauSignoff ? { bureauSignoff: p.bureauSignoff } : {}),
    } as any,
  }
}

const DEPT: DashboardScope = { level: "department" }
const NOAA: DashboardScope = { level: "bureau", businessUnit: "noaa" }
const NOAA_NWS: DashboardScope = { level: "office", businessUnit: "noaa", office: "nws" }
const PERSONAL: DashboardScope = { level: "personal", email: "sam@doc.gov" }

const submissions: Submission[] = [
  sub({ id: "n1", businessUnit: "noaa", office: "nws", status: "approved", highImpactFactors: ["safety"], readinessScore: "ready", bureauSignoff: { bureau: "noaa", decision: "approved", signedOffByName: "A", signedOffByEmail: "a@noaa.gov", signedOffAt: "2026-01-01" } }),
  sub({ id: "n2", businessUnit: "noaa", office: "nws", status: "approved", readinessScore: "needs_work", ownerEmail: "sam@doc.gov" }), // approved, no sign-off -> awaiting
  sub({ id: "n3", businessUnit: "noaa", office: "nmfs", status: "in_review", readinessScore: "early_stage" }),
  sub({ id: "c1", businessUnit: "census", office: "decennial", status: "submitted", nationalSecuritySystem: "yes" }), // excluded
  sub({ id: "c2", businessUnit: "census", office: "decennial", status: "rejected", researchOnly: "yes" }), // excluded (research-only, not decisional)
  sub({ id: "t1", businessUnit: "nist", status: "submitted", stageOfDevelopment: "" }), // ambiguous -> review
  sub({ id: "i1", businessUnit: "ita", office: "global_markets", status: "submitted", useCaseDescription: "AI meeting transcription and summarization tool for staff calls" }), // consolidated match
]

// A cross-bureau duplicate pair: identical description text (guarantees
// similarity = 1.0, well above the 0.25 roll-up threshold), different
// bureaus, and text that doesn't match any lib/ombConsolidation.ts category
// (so the pair isn't excluded as "same consolidation category" instead).
const DUPLICATE_TEXT = "Predictive maintenance analytics for field equipment sensors using historical performance data"
const dupA = sub({ id: "dup-noaa", businessUnit: "noaa", office: "nesdis", status: "submitted", useCaseDescription: DUPLICATE_TEXT })
const dupB = sub({ id: "dup-census", businessUnit: "census", office: "economic", status: "submitted", useCaseDescription: DUPLICATE_TEXT })
const withDuplicates = [...submissions, dupA, dupB]

describe("scopedSubmissions", () => {
  it("returns everything for department scope", () => {
    expect(scopedSubmissions(DEPT, submissions)).toHaveLength(submissions.length)
  })

  it("constrains to one bureau for bureau scope", () => {
    const rows = scopedSubmissions(NOAA, submissions)
    expect(rows.map((s) => s.id).sort()).toEqual(["n1", "n2", "n3"])
  })

  it("constrains to one bureau + office for office scope", () => {
    const rows = scopedSubmissions(NOAA_NWS, submissions)
    expect(rows.map((s) => s.id).sort()).toEqual(["n1", "n2"])
  })

  it("constrains to owner email for personal scope", () => {
    const rows = scopedSubmissions(PERSONAL, submissions)
    expect(rows.map((s) => s.id)).toEqual(["n2"])
  })

  it("never counts a row outside the scope's bureau/office (matches visibleSubmissions)", () => {
    const reviewerRows = visibleSubmissions(submissions, { role: "reviewer", businessUnit: "noaa" })
    expect(scopedSubmissions(NOAA, submissions).map((s) => s.id).sort()).toEqual(
      reviewerRows.map((s) => s.id).sort(),
    )
    const officeReviewerRows = visibleSubmissions(submissions, { role: "reviewer", businessUnit: "noaa", office: "nws" })
    expect(scopedSubmissions(NOAA_NWS, submissions).map((s) => s.id).sort()).toEqual(
      officeReviewerRows.map((s) => s.id).sort(),
    )
  })
})

describe("pipelineStatusCounts", () => {
  it("counts by status, scoped to the bureau", () => {
    const card = pipelineStatusCounts(NOAA, submissions)
    expect(card.total).toBe(3)
    expect(card.counts.approved).toBe(2)
    expect(card.counts.in_review).toBe(1)
    expect(card.counts.submitted).toBe(0)
  })

  it("counts across every bureau for department scope", () => {
    const card = pipelineStatusCounts(DEPT, submissions)
    expect(card.total).toBe(submissions.length)
    expect(card.counts.submitted).toBe(3) // c1, t1, i1
    expect(card.counts.rejected).toBe(1)
  })
})

describe("readinessDistribution", () => {
  it("buckets by formData.readinessScore, defaulting unset to not_assessed", () => {
    const card = readinessDistribution(NOAA, submissions)
    expect(card).toEqual({ ready: 1, needs_work: 1, early_stage: 1, not_assessed: 0, total: 3 })
  })

  it("buckets unset submissions as not_assessed at department scope", () => {
    const card = readinessDistribution(DEPT, submissions)
    expect(card.not_assessed).toBe(4) // c1, c2, t1, i1
    expect(card.total).toBe(submissions.length)
  })
})

describe("highImpactCount", () => {
  it("uses determineHighImpact's recommendation, not the raw self-reported flag", () => {
    const card = highImpactCount(NOAA, submissions)
    expect(card.count).toBe(1) // only n1 (highImpactFactors: ["safety"])
    expect(card.total).toBe(3)
  })

  it("is 0 when nothing in scope has a manual or inferred high-impact signal", () => {
    const card = highImpactCount({ level: "bureau", businessUnit: "census" }, submissions)
    expect(card.count).toBe(0)
  })
})

describe("awaitingSignoff", () => {
  it("counts approved submissions with no recorded bureau sign-off, for a bureau-tier tenant", () => {
    const card = awaitingSignoff(NOAA, submissions, doc)
    expect(card.total).toBe(2) // n1, n2 are approved
    expect(card.count).toBe(1) // only n2 lacks a sign-off record
  })

  it("is always 0 for a tenant with no bureau tier (USPTO)", () => {
    const usptoSubs = [sub({ id: "u1", businessUnit: "patents", status: "approved" })]
    const card = awaitingSignoff({ level: "bureau", businessUnit: "patents" }, usptoSubs, uspto)
    expect(card).toEqual({ count: 0, total: 1 })
  })
})

describe("ombReportabilitySummary", () => {
  it("classifies reportable/excluded/review and the consolidated/individual split, scoped", () => {
    const card = ombReportabilitySummary(DEPT, submissions)
    expect(card.excluded).toBe(2) // c1 (NSS), c2 (research-only, non-decisional)
    expect(card.review).toBe(1) // t1 (no stage set)
    expect(card.reportable).toBe(4) // n1, n2, n3, i1
    expect(card.consolidated).toBe(1) // i1 matches meeting_transcription
    expect(card.individual).toBe(3) // n1, n2, n3
  })
})

describe("crossBureauDuplicatesSummary", () => {
  it("finds no clusters when nothing duplicates across bureaus", () => {
    expect(crossBureauDuplicatesSummary(DEPT, submissions, doc)).toEqual({ clusterCount: 0, pendingCount: 0 })
  })

  it("reports a pending cluster that touches an in-scope bureau", () => {
    const card = crossBureauDuplicatesSummary({ level: "bureau", businessUnit: "noaa" }, withDuplicates, doc)
    expect(card).toEqual({ clusterCount: 1, pendingCount: 1 })
  })

  it("excludes a duplicate cluster with no member in the scope's bureau", () => {
    const card = crossBureauDuplicatesSummary({ level: "bureau", businessUnit: "nist" }, withDuplicates, doc)
    expect(card).toEqual({ clusterCount: 0, pendingCount: 0 })
  })

  it("is always empty for a tenant with no bureau tier (USPTO)", () => {
    const usptoSubs = [
      sub({ id: "u1", businessUnit: "patents", useCaseDescription: DUPLICATE_TEXT }),
      sub({ id: "u2", businessUnit: "trademarks", useCaseDescription: DUPLICATE_TEXT }),
    ]
    expect(crossBureauDuplicatesSummary(DEPT, usptoSubs, uspto)).toEqual({ clusterCount: 0, pendingCount: 0 })
  })
})

describe("bureauRollupRows", () => {
  it("returns one row per bureau present in scope, ordered per tenant.unit.options", () => {
    const rows = bureauRollupRows(DEPT, submissions, doc)
    // doc.unit.options order is os, bea, bis, census, eda, ita, mbda, nist, noaa, ...
    expect(rows.map((r) => r.value)).toEqual(["census", "ita", "nist", "noaa"])
    const noaaRow = rows.find((r) => r.value === "noaa")!
    expect(noaaRow.total).toBe(3)
    expect(noaaRow.highImpact).toBe(0) // n1's highImpact is a recommendation, not the raw formData flag this row reads
  })

  it("collapses to a single row for a bureau-scoped viewer", () => {
    const rows = bureauRollupRows(NOAA, submissions, doc)
    expect(rows.map((r) => r.value)).toEqual(["noaa"])
    expect(rows[0].total).toBe(3)
  })

  it("is [] for personal scope", () => {
    expect(bureauRollupRows(PERSONAL, submissions, doc)).toEqual([])
  })
})

describe("officeRollupRowsForScope", () => {
  it("delegates to officeRollupRows for a bureau scope", () => {
    const rows = officeRollupRowsForScope(NOAA, submissions, doc)
    const nws = rows.find((r) => r.value === "nws")!
    expect(nws.total).toBe(2)
  })

  it("is [] for department and personal scope", () => {
    expect(officeRollupRowsForScope(DEPT, submissions, doc)).toEqual([])
    expect(officeRollupRowsForScope(PERSONAL, submissions, doc)).toEqual([])
  })
})

function rmfSub(id: string, businessUnit: string, formData: Record<string, unknown>): Submission {
  return { id, submittedAt: new Date(0).toISOString(), status: "approved", businessUnit, formData: formData as any }
}

const rmfOnTrack = rmfSub("rmf-ok", "noaa", {
  ...initialFormData,
  stageOfDevelopment: "deployed",
  reviewStatus: "approved",
  bureauSignoff: { bureau: "noaa", decision: "approved", signedOffByName: "x", signedOffByEmail: "x@noaa.gov", signedOffAt: "2026-01-01" },
  departmentApproval: { decision: "approved", byName: "d", byEmail: "d@doc.gov", at: "2026-01-01" },
  hasATO: "yes",
  atoSystemName: "System X",
  isWithheld: "no",
  topicArea: "cybersecurity",
  aiClassification: "generative_ai",
  coreProblem: "p",
  businessValue: "v",
  solutionSummary: "s",
  highImpact: "not_high_impact",
})
const rmfAtRisk = rmfSub("rmf-gap", "noaa", { ...initialFormData, stageOfDevelopment: "deployed" })
const rmfUnknown = rmfSub("rmf-unknown", "noaa", { ...initialFormData, stageOfDevelopment: "" })
const rmfSubmissions = [rmfOnTrack, rmfAtRisk, rmfUnknown]

describe("rmfRollupSummary", () => {
  it("counts by resolveRmfProfile's effective overall level, scoped", () => {
    const card = rmfRollupSummary({ level: "bureau", businessUnit: "noaa" }, rmfSubmissions, doc)
    expect(card).toEqual({ on_track: 1, attention: 0, at_risk: 1, unknown: 1, total: 3 })
  })

  it("never counts a row outside the scope's bureau", () => {
    const card = rmfRollupSummary({ level: "bureau", businessUnit: "census" }, rmfSubmissions, doc)
    expect(card.total).toBe(0)
  })
})

describe("getDashboardMetrics", () => {
  it("bundles every card for a scope in one call", () => {
    const metrics = getDashboardMetrics(NOAA, submissions, doc)
    expect(metrics.scope).toEqual(NOAA)
    expect(metrics.pipelineStatus.total).toBe(3)
    expect(metrics.readiness.total).toBe(3)
    expect(metrics.bureauRollup.map((r) => r.value)).toEqual(["noaa"])
    expect(metrics.officeRollup.length).toBeGreaterThan(0)
  })

  it("includes the RMF rollup card", () => {
    const metrics = getDashboardMetrics({ level: "bureau", businessUnit: "noaa" }, rmfSubmissions, doc)
    expect(metrics.rmfRollup).toEqual({ on_track: 1, attention: 0, at_risk: 1, unknown: 1, total: 3 })
  })

  it("never lets a bureau scope's metrics reflect another bureau's submissions", () => {
    const metrics = getDashboardMetrics({ level: "bureau", businessUnit: "census" }, submissions, doc)
    expect(metrics.pipelineStatus.total).toBe(2)
    expect(metrics.highImpact.total).toBe(2)
    expect(metrics.awaitingSignoff.total).toBe(0)
  })
})
