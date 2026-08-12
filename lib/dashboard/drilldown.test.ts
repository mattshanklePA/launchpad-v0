import { describe, it, expect } from "vitest"
import { getKpiDrilldown } from "@/lib/dashboard/drilldown"
import { getDashboardMetrics } from "@/lib/dashboard/metrics"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { businessUnitLabel } from "@/lib/reviewWorkflow"
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
  useCaseTitle?: string
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
      highImpactFactors: p.highImpactFactors ?? [],
      aiDecisionalImpact: p.aiDecisionalImpact ?? "",
      readinessScore: p.readinessScore ?? "",
      nationalSecuritySystem: p.nationalSecuritySystem ?? "no",
      researchOnly: p.researchOnly ?? "no",
      stageOfDevelopment: p.stageOfDevelopment ?? "deployed",
      useCaseDescription: p.useCaseDescription ?? "",
      ...(p.useCaseTitle ? { useCaseTitle: p.useCaseTitle } : {}),
      ...(p.bureauSignoff ? { bureauSignoff: p.bureauSignoff } : {}),
    } as any,
  }
}

const DEPT: DashboardScope = { level: "department" }
const NOAA: DashboardScope = { level: "bureau", businessUnit: "noaa" }

const submissions: Submission[] = [
  sub({ id: "n1", businessUnit: "noaa", office: "nws", status: "approved", highImpactFactors: ["safety"], readinessScore: "ready", bureauSignoff: { bureau: "noaa", decision: "approved", signedOffByName: "A", signedOffByEmail: "a@noaa.gov", signedOffAt: "2026-01-01" } }),
  sub({ id: "n2", businessUnit: "noaa", office: "nws", status: "approved", readinessScore: "needs_work", ownerEmail: "sam@doc.gov", useCaseTitle: "Weather Alert Summarizer" }), // approved, no sign-off -> awaiting
  sub({ id: "n3", businessUnit: "noaa", office: "nmfs", status: "in_review", readinessScore: "early_stage" }),
  sub({ id: "c1", businessUnit: "census", office: "decennial", status: "submitted", nationalSecuritySystem: "yes" }), // excluded
  sub({ id: "c2", businessUnit: "census", office: "decennial", status: "rejected", researchOnly: "yes" }), // excluded
  sub({ id: "t1", businessUnit: "nist", status: "submitted", stageOfDevelopment: "" }), // review
  sub({ id: "i1", businessUnit: "ita", office: "global_markets", status: "submitted", useCaseDescription: "AI meeting transcription and summarization tool for staff calls" }), // consolidated match
]

const DUPLICATE_TEXT = "Predictive maintenance analytics for field equipment sensors using historical performance data"
const dupA = sub({ id: "dup-noaa", businessUnit: "noaa", office: "nesdis", status: "submitted", useCaseDescription: DUPLICATE_TEXT })
const dupB = sub({ id: "dup-census", businessUnit: "census", office: "economic", status: "submitted", useCaseDescription: DUPLICATE_TEXT })
const withDuplicates = [...submissions, dupA, dupB]

describe("getKpiDrilldown", () => {
  it("matches getDashboardMetrics' counts for every KPI, department scope", () => {
    const metrics = getDashboardMetrics(DEPT, submissions, doc)
    const drilldown = getKpiDrilldown(DEPT, submissions, doc)

    expect(drilldown.pipeline).toHaveLength(metrics.pipelineStatus.total)
    expect(drilldown.readiness).toHaveLength(metrics.readiness.ready)
    expect(drilldown["high-impact"]).toHaveLength(metrics.highImpact.count)
    expect(drilldown["omb-reportable"]).toHaveLength(metrics.ombReportability.reportable)
    expect(drilldown.signoff).toHaveLength(metrics.awaitingSignoff.count)
    expect(drilldown.duplicates).toHaveLength(metrics.crossBureauDuplicates.clusterCount)
    expect(drilldown.rmf).toHaveLength(metrics.rmfRollup.at_risk)
  })

  it("matches getDashboardMetrics' counts for every KPI, bureau scope", () => {
    const metrics = getDashboardMetrics(NOAA, submissions, doc)
    const drilldown = getKpiDrilldown(NOAA, submissions, doc)

    expect(drilldown.pipeline).toHaveLength(metrics.pipelineStatus.total)
    expect(drilldown.readiness).toHaveLength(metrics.readiness.ready)
    expect(drilldown["high-impact"]).toHaveLength(metrics.highImpact.count)
    expect(drilldown["omb-reportable"]).toHaveLength(metrics.ombReportability.reportable)
    expect(drilldown.signoff).toHaveLength(metrics.awaitingSignoff.count)
    expect(drilldown.rmf).toHaveLength(metrics.rmfRollup.at_risk)
  })

  it("matches the cross-bureau duplicate cluster count, including a pending cluster", () => {
    const metrics = getDashboardMetrics(NOAA, withDuplicates, doc)
    const drilldown = getKpiDrilldown(NOAA, withDuplicates, doc)
    expect(drilldown.duplicates).toHaveLength(metrics.crossBureauDuplicates.clusterCount)
    expect(drilldown.duplicates).toHaveLength(1)
    expect(drilldown.duplicates[0].memberIds.sort()).toEqual(["dup-census", "dup-noaa"])
  })

  it("excludes a duplicate cluster with no member in the scope's bureau", () => {
    const drilldown = getKpiDrilldown({ level: "bureau", businessUnit: "nist" }, withDuplicates, doc)
    expect(drilldown.duplicates).toEqual([])
  })

  it("view models carry title, bureau/bureauLabel, stage, and cardField", () => {
    const drilldown = getKpiDrilldown(NOAA, submissions, doc)
    const n2 = drilldown.pipeline.find((i) => i.id === "n2")!
    expect(n2).toMatchObject({
      id: "n2",
      title: "Weather Alert Summarizer",
      bureau: "noaa",
      bureauLabel: businessUnitLabel("noaa"),
      stage: "Approved",
    })
    expect(typeof n2.cardField).toBe("string")
  })

  it("readiness list is limited to the ready bucket", () => {
    const drilldown = getKpiDrilldown(NOAA, submissions, doc)
    expect(drilldown.readiness.map((i) => i.id)).toEqual(["n1"])
    expect(drilldown.readiness[0].cardField).toBe("Ready")
  })

  it("high-impact cardField carries determineHighImpact's rationale", () => {
    const drilldown = getKpiDrilldown(NOAA, submissions, doc)
    expect(drilldown["high-impact"].map((i) => i.id)).toEqual(["n1"])
    expect(drilldown["high-impact"][0].cardField).toContain("safety")
  })

  it("omb-reportable cardField carries the reportability reason and consolidation status", () => {
    const drilldown = getKpiDrilldown(DEPT, submissions, doc)
    const i1 = drilldown["omb-reportable"].find((i) => i.id === "i1")!
    expect(i1.cardField).toContain("Consolidated")
    const n1 = drilldown["omb-reportable"].find((i) => i.id === "n1")!
    expect(n1.cardField).toContain("Individual")
  })

  it("signoff list is the approved-but-unsigned submissions", () => {
    const drilldown = getKpiDrilldown(NOAA, submissions, doc)
    expect(drilldown.signoff.map((i) => i.id)).toEqual(["n2"])
    expect(drilldown.signoff[0].cardField).toBe("Awaiting bureau sign-off")
  })

  // ISS-2 regression: the drill-down label used to hardcode "bureau", which
  // the `tenantHasBureauTier()` gate does not protect — ES2 passes that gate.
  it("labels the signoff drill-down with a non-Commerce bureau-tier tenant's own tier word", () => {
    const es2 = {
      ...doc,
      id: "es2",
      tierLabels: { department: "Command", unit: "Directorate", unitPlural: "Directorates", subUnit: "Branch", subUnitPlural: "Branches" },
    }
    const drilldown = getKpiDrilldown(NOAA, submissions, es2)
    expect(drilldown.signoff[0].cardField).toBe("Awaiting directorate sign-off")
  })

  it("is scope-correct: a bureau-scoped viewer never gets another bureau's item", () => {
    const drilldown = getKpiDrilldown(NOAA, submissions, doc)
    expect(drilldown.pipeline.map((i) => i.id).sort()).toEqual(["n1", "n2", "n3"])
  })

  it("is always empty for signoff and duplicates on a tenant with no bureau tier (USPTO)", () => {
    const usptoSubs = [
      sub({ id: "u1", businessUnit: "patents", status: "approved" }),
      sub({ id: "u2", businessUnit: "trademarks", status: "approved", useCaseDescription: DUPLICATE_TEXT }),
      sub({ id: "u3", businessUnit: "patents", status: "submitted", useCaseDescription: DUPLICATE_TEXT }),
    ]
    const drilldown = getKpiDrilldown(DEPT, usptoSubs, uspto)
    expect(drilldown.signoff).toEqual([])
    expect(drilldown.duplicates).toEqual([])
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
const rmfGap = rmfSub("rmf-gap", "noaa", { ...initialFormData, stageOfDevelopment: "deployed" })
const rmfSubmissions = [rmfOnTrack, rmfGap]

describe("rmf drilldown", () => {
  it("lists only the at-risk submissions, matching rmfRollupSummary's at_risk count", () => {
    const metrics = getDashboardMetrics({ level: "bureau", businessUnit: "noaa" }, rmfSubmissions, doc)
    const drilldown = getKpiDrilldown({ level: "bureau", businessUnit: "noaa" }, rmfSubmissions, doc)
    expect(drilldown.rmf).toHaveLength(metrics.rmfRollup.at_risk)
    expect(drilldown.rmf.map((i) => i.id)).toEqual(["rmf-gap"])
  })

  it("carries the resolved profile's rationale as cardField", () => {
    const drilldown = getKpiDrilldown({ level: "bureau", businessUnit: "noaa" }, rmfSubmissions, doc)
    expect(drilldown.rmf[0].cardField.length).toBeGreaterThan(0)
  })

  it("is scope-correct: a bureau-scoped viewer never gets another bureau's at-risk item", () => {
    const drilldown = getKpiDrilldown({ level: "bureau", businessUnit: "census" }, rmfSubmissions, doc)
    expect(drilldown.rmf).toEqual([])
  })
})
