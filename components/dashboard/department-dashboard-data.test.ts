import { describe, it, expect, vi } from "vitest"
import {
  resolveDrillScope,
  scopeLabel,
  buildKpiCards,
  buildActionItems,
  computeHealthScore,
  worklistSummaryLabel,
} from "./department-dashboard-data"
import type { DashboardScope } from "@/lib/dashboard/scope"
import type { DashboardMetrics } from "@/lib/dashboard/metrics"
import type { DashboardAction } from "@/lib/dashboard/actions"
import type { KpiDrilldown, KpiDrilldownItem, DuplicateClusterDrilldownItem } from "@/lib/dashboard/drilldown"
import type { ActionItem } from "./action-center-data"
import type { TenantConfig } from "@/lib/tenant"
import { GLOSSARY_TERM_KEYS } from "@/lib/glossary"

const sendDashboardActionNotification = vi.hoisted(() => vi.fn())
vi.mock("@/app/dashboard-actions", () => ({ sendDashboardActionNotification }))

function dashboardAction(overrides: Partial<DashboardAction>): DashboardAction {
  return {
    id: "a",
    kind: "signoff_nudge",
    submissionId: "s",
    submissionTitle: "Idea",
    bureau: "noaa",
    bureauLabel: "NOAA",
    severity: "critical",
    message: "message",
    canAutoSend: true,
    ...overrides,
  }
}

function drilldownItem(id: string): KpiDrilldownItem {
  return { id, title: `Idea ${id}`, bureau: "noaa", bureauLabel: "NOAA", stage: "In review", cardField: "Pending" }
}

function drilldownCluster(id: string): DuplicateClusterDrilldownItem {
  return { ...drilldownItem(id), memberIds: [id, `${id}-b`] }
}

function kpiDrilldown(overrides: Partial<KpiDrilldown> = {}): KpiDrilldown {
  return {
    pipeline: [],
    readiness: [],
    "high-impact": [],
    "omb-reportable": [],
    signoff: [],
    duplicates: [],
    rmf: [],
    ...overrides,
  }
}

const doc = {
  id: "doc",
  orgName: "Department of Commerce",
  unit: {
    label: "Bureau",
    options: [
      {
        value: "census",
        label: "U.S. Census Bureau",
        offices: [{ value: "demo", label: "Demographic Programs" }],
      },
      { value: "nist", label: "NIST", offices: [] },
    ],
  },
  tierLabels: { department: "Department", unit: "Bureau", unitPlural: "Bureaus", subUnit: "Office", subUnitPlural: "Offices" },
  inventoryLabel: "OMB inventory",
  inventoryShortLabel: "OMB",
  minimumPracticesLabel: "M-25-21 minimum practices",
} as unknown as TenantConfig

const uspto = {
  id: "uspto",
  orgName: "USPTO",
  unit: { label: "Business unit", options: [{ value: "patents", label: "Patents" }] },
  tierLabels: {
    department: "Agency",
    unit: "Business unit",
    unitPlural: "Business units",
    subUnit: "Office",
    subUnitPlural: "Offices",
  },
  inventoryLabel: "OMB inventory",
  inventoryShortLabel: "OMB",
  minimumPracticesLabel: "M-25-21 minimum practices",
} as unknown as TenantConfig

// A bureau-tier tenant that is not Commerce — the case `tenantHasBureauTier()`
// does not protect against (ISS-2). Every bureau-tier card/action below has to
// read these words, not Commerce's.
const es2 = {
  id: "es2",
  orgName: "Army CPE ES2",
  unit: { label: "Directorate", options: [{ value: "g3", label: "G-3/5/7" }] },
  tierLabels: {
    department: "Command",
    unit: "Directorate",
    unitPlural: "Directorates",
    subUnit: "Branch",
    subUnitPlural: "Branches",
  },
  inventoryLabel: "AI use case inventory",
  inventoryShortLabel: "Inventory",
  minimumPracticesLabel: "High-impact AI minimum practices",
} as unknown as TenantConfig

function baseMetrics(overrides: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    scope: { level: "department" },
    pipelineStatus: { counts: {} as any, total: 10 },
    readiness: { ready: 4, needs_work: 3, early_stage: 2, not_assessed: 1, total: 10 },
    highImpact: { count: 2, total: 10 },
    awaitingSignoff: { count: 0, total: 5 },
    ombReportability: { reportable: 6, excluded: 2, review: 0, consolidated: 2, individual: 4 },
    crossBureauDuplicates: { clusterCount: 0, pendingCount: 0 },
    bureauRollup: [],
    officeRollup: [],
    rmfRollup: { on_track: 5, attention: 3, at_risk: 0, unknown: 2, total: 10 },
    ...overrides,
  }
}

describe("resolveDrillScope", () => {
  const dept: DashboardScope = { level: "department" }

  it("returns the base scope with no selection", () => {
    expect(resolveDrillScope(dept, null)).toEqual(dept)
  })

  it("drills into a bureau when department-scoped", () => {
    expect(resolveDrillScope(dept, { businessUnit: "census" })).toEqual({ level: "bureau", businessUnit: "census" })
  })

  it("drills into an office when department-scoped", () => {
    expect(resolveDrillScope(dept, { businessUnit: "census", office: "demo" })).toEqual({
      level: "office",
      businessUnit: "census",
      office: "demo",
    })
  })

  it("allows a bureau-scoped base to drill into its own office", () => {
    const bureau: DashboardScope = { level: "bureau", businessUnit: "census" }
    expect(resolveDrillScope(bureau, { businessUnit: "census", office: "demo" })).toEqual({
      level: "office",
      businessUnit: "census",
      office: "demo",
    })
  })

  it("ignores a selection an office-scoped base is too narrow to see", () => {
    const office: DashboardScope = { level: "office", businessUnit: "census", office: "demo" }
    expect(resolveDrillScope(office, { businessUnit: "nist" })).toEqual(office)
  })

  it("ignores a selection a personal-scoped base is too narrow to see", () => {
    const personal: DashboardScope = { level: "personal", email: "a@b.com" }
    expect(resolveDrillScope(personal, { businessUnit: "census" })).toEqual(personal)
  })
})

describe("scopeLabel", () => {
  it("labels department scope with the org name", () => {
    expect(scopeLabel({ level: "department" }, doc)).toBe("Department of Commerce")
  })

  it("labels bureau scope with the bureau's label", () => {
    expect(scopeLabel({ level: "bureau", businessUnit: "census" }, doc)).toBe("U.S. Census Bureau")
  })

  it("labels office scope with bureau and office", () => {
    expect(scopeLabel({ level: "office", businessUnit: "census", office: "demo" }, doc)).toBe(
      "U.S. Census Bureau — Demographic Programs",
    )
  })

  it("falls back to the raw value for an unknown bureau", () => {
    expect(scopeLabel({ level: "bureau", businessUnit: "ghost" }, doc)).toBe("ghost")
  })

  it("labels personal scope with the org name", () => {
    expect(scopeLabel({ level: "personal", email: "a@b.com" }, doc)).toBe("Department of Commerce")
  })
})

describe("buildKpiCards", () => {
  it("includes the core cards for every tenant", () => {
    const cards = buildKpiCards(baseMetrics(), false)
    expect(cards.map((c) => c.id)).toEqual(["pipeline", "readiness", "high-impact", "omb-reportable"])
  })

  it("appends sign-off and duplicate cards only for bureau-tier tenants", () => {
    const cards = buildKpiCards(baseMetrics(), true)
    expect(cards.map((c) => c.id)).toEqual([
      "pipeline",
      "readiness",
      "high-impact",
      "omb-reportable",
      "signoff",
      "duplicates",
    ])
  })

  it("marks readiness good only when every submission in scope is ready", () => {
    const allReady = buildKpiCards(
      baseMetrics({ readiness: { ready: 5, needs_work: 0, early_stage: 0, not_assessed: 0, total: 5 } }),
      false,
    )
    expect(allReady.find((c) => c.id === "readiness")?.status).toBe("good")

    const mixed = buildKpiCards(baseMetrics(), false)
    expect(mixed.find((c) => c.id === "readiness")?.status).toBe("neutral")
  })

  it("flags the duplicates card critical when a cluster is pending", () => {
    const cards = buildKpiCards(
      baseMetrics({ crossBureauDuplicates: { clusterCount: 2, pendingCount: 1 } }),
      true,
    )
    expect(cards.find((c) => c.id === "duplicates")?.status).toBe("critical")
  })

  it("omits the RMF card when rmfEnabled is false, regardless of bureau tier", () => {
    expect(buildKpiCards(baseMetrics(), true).map((c) => c.id)).not.toContain("rmf")
    expect(buildKpiCards(baseMetrics(), true, false).map((c) => c.id)).not.toContain("rmf")
  })

  it("appends the RMF card when rmfEnabled is true", () => {
    const cards = buildKpiCards(baseMetrics(), false, true)
    expect(cards.map((c) => c.id)).toEqual(["pipeline", "readiness", "high-impact", "omb-reportable", "rmf"])
    const rmf = cards.find((c) => c.id === "rmf")!
    expect(rmf.value).toBe(0)
    expect(rmf.delta?.value).toBe("3 need attention")
  })

  it("flags the RMF card critical when at_risk > 0", () => {
    const cards = buildKpiCards(baseMetrics({ rmfRollup: { on_track: 0, attention: 0, at_risk: 2, unknown: 0, total: 2 } }), false, true)
    expect(cards.find((c) => c.id === "rmf")?.status).toBe("critical")
  })

  it("attaches a glossary tooltip + short subtitle to every jargon KPI label (UX #4)", () => {
    const cards = buildKpiCards(baseMetrics(), true, true)
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]))

    for (const id of ["pipeline", "readiness", "omb-reportable", "signoff", "duplicates", "rmf"]) {
      expect(byId[id].glossary, `${id}.glossary`).toBeTruthy()
      expect(byId[id].subtitle?.trim().length, `${id}.subtitle`).toBeGreaterThan(0)
      expect(GLOSSARY_TERM_KEYS, `${id}.glossary is a real glossary key`).toContain(byId[id].glossary)
    }
  })

  it("leaves the non-jargon high-impact card without a glossary tooltip", () => {
    const cards = buildKpiCards(baseMetrics(), true, true)
    expect(cards.find((c) => c.id === "high-impact")?.glossary).toBeUndefined()
  })

  it("keeps Commerce's bureau-tier card copy exactly as it read before ISS-2", () => {
    const cards = buildKpiCards(baseMetrics(), true, false, doc)
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
    expect(byId.signoff.label).toBe("Awaiting bureau sign-off")
    expect(byId.signoff.subtitle).toBe("Approved, pending bureau confirmation")
    expect(byId.duplicates.label).toBe("Cross-bureau duplicate clusters")
  })

  // ISS-2 regression: the bureau-tier gate decides *whether* these two cards
  // render, never *what words* they use.
  it("labels the bureau-tier cards with a non-Commerce tenant's own vocabulary", () => {
    const cards = buildKpiCards(baseMetrics(), true, false, es2)
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]))
    expect(byId.signoff.label).toBe("Awaiting directorate sign-off")
    expect(byId.signoff.subtitle).toBe("Approved, pending directorate confirmation")
    expect(byId.duplicates.label).toBe("Cross-directorate duplicate clusters")
    // The glossary keys are internal identifiers and must not follow the copy.
    expect(byId.signoff.glossary).toBe("awaitingBureauSignOff")
    expect(byId.duplicates.glossary).toBe("crossBureauRationalization")
  })
})

describe("worklistSummaryLabel", () => {
  function item(id: string): ActionItem {
    return { id, title: "Idea", severity: "info" }
  }

  it("reads as an all-clear when nothing needs attention", () => {
    expect(worklistSummaryLabel([])).toBe("Today: nothing needs you right now.")
  })

  it("singularizes a single item", () => {
    expect(worklistSummaryLabel([item("a")])).toBe("Today: 1 item needs you.")
  })

  it("pluralizes multiple items", () => {
    expect(worklistSummaryLabel([item("a"), item("b"), item("c")])).toBe("Today: 3 items need you.")
  })
})

describe("buildActionItems", () => {
  it("is empty when nothing needs attention", () => {
    expect(buildActionItems(baseMetrics(), true)).toEqual([])
  })

  it("surfaces pending duplicate clusters as critical, bureau tier only", () => {
    const metrics = baseMetrics({ crossBureauDuplicates: { clusterCount: 1, pendingCount: 1 } })
    expect(buildActionItems(metrics, true)).toHaveLength(1)
    expect(buildActionItems(metrics, false)).toHaveLength(0)
  })

  it("surfaces awaiting sign-off as warning, bureau tier only", () => {
    const metrics = baseMetrics({ awaitingSignoff: { count: 3, total: 5 } })
    const items = buildActionItems(metrics, true)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ severity: "warning", id: "signoff" })
    expect(buildActionItems(metrics, false)).toHaveLength(0)
  })

  it("surfaces OMB review-needed as info regardless of bureau tier", () => {
    const metrics = baseMetrics({ ombReportability: { reportable: 0, excluded: 0, review: 2, consolidated: 0, individual: 0 } })
    expect(buildActionItems(metrics, false)).toEqual([
      { id: "omb-review", title: "2 submissions need an OMB reportability review", severity: "info", actionLabel: "Review" },
    ])
  })

  it("singularizes counts of exactly one", () => {
    const metrics = baseMetrics({
      awaitingSignoff: { count: 1, total: 5 },
      crossBureauDuplicates: { clusterCount: 1, pendingCount: 1 },
      ombReportability: { reportable: 0, excluded: 0, review: 1, consolidated: 0, individual: 0 },
    })
    const items = buildActionItems(metrics, true, [], doc)
    expect(items.map((i) => i.title)).toEqual([
      "1 cross-bureau duplicate cluster pending rationalization",
      "1 approved use case awaiting bureau sign-off",
      "1 submission needs an OMB reportability review",
    ])
  })

  // ISS-2 regression: these titles used to hardcode "bureau", so the first
  // thing an ES2 admin read on the Action Center was Commerce's vocabulary.
  it("names the tenant's own org tier, not Commerce's, for a non-Commerce bureau-tier tenant", () => {
    const metrics = baseMetrics({
      awaitingSignoff: { count: 2, total: 5 },
      crossBureauDuplicates: { clusterCount: 2, pendingCount: 2 },
    })
    const items = buildActionItems(metrics, true, [], es2)
    expect(items.map((i) => i.title)).toContain("2 cross-directorate duplicate clusters pending rationalization")
    expect(items.map((i) => i.title)).toContain("2 approved use cases awaiting directorate sign-off")
    expect(items.map((i) => i.title).join(" ")).not.toMatch(/bureau/i)
  })

  it("adds a wired sign-off nudge item once dashboardActions has a signoff_nudge entry", () => {
    const metrics = baseMetrics({ awaitingSignoff: { count: 1, total: 5 } })
    const items = buildActionItems(metrics, true, [dashboardAction({ kind: "signoff_nudge" })])
    const signoff = items.find((i) => i.id === "signoff")!
    expect(signoff.actionLabel).toBe("Nudge sign-off")
    expect(signoff.onAction).toBeTypeOf("function")
  })

  it("leaves the sign-off item's button disabled when no dashboardActions were passed", () => {
    const metrics = baseMetrics({ awaitingSignoff: { count: 1, total: 5 } })
    const signoff = buildActionItems(metrics, true).find((i) => i.id === "signoff")!
    expect(signoff.onAction).toBeUndefined()
  })

  it("adds a needs-info item, only when dashboardActions has one", () => {
    expect(buildActionItems(baseMetrics(), true)).not.toContainEqual(expect.objectContaining({ id: "needs-info" }))
    const items = buildActionItems(baseMetrics(), true, [dashboardAction({ kind: "needs_info", canAutoSend: false })])
    const needsInfo = items.find((i) => i.id === "needs-info")!
    expect(needsInfo).toMatchObject({ title: "1 submission waiting on submitter follow-up", actionLabel: "Request info" })
  })

  it("adds an informational unassigned item with no wired button", () => {
    const items = buildActionItems(baseMetrics(), true, [
      dashboardAction({ id: "u1", kind: "unassigned", canAutoSend: false }),
      dashboardAction({ id: "u2", kind: "unassigned", canAutoSend: false }),
    ])
    const unassigned = items.find((i) => i.id === "unassigned")!
    expect(unassigned.title).toBe("2 submissions with no reviewer assigned")
    expect(unassigned.onAction).toBeUndefined()
  })

  it("resolves the sign-off nudge action to a 'sent' outcome when the notifier reports a send", async () => {
    sendDashboardActionNotification.mockResolvedValueOnce({ sent: true, count: 2 })
    const metrics = baseMetrics({ awaitingSignoff: { count: 2, total: 5 } })
    const items = buildActionItems(metrics, true, [dashboardAction({ kind: "signoff_nudge" })])
    const outcome = await items.find((i) => i.id === "signoff")!.onAction!()
    expect(outcome).toEqual({ status: "sent", description: "Notified 2 reviewers via Slack." })
  })

  it("resolves the sign-off nudge action to a 'drafted' outcome when the notifier reports nothing sendable", async () => {
    sendDashboardActionNotification.mockResolvedValueOnce({ sent: false, count: 0 })
    const metrics = baseMetrics({ awaitingSignoff: { count: 1, total: 5 } })
    const items = buildActionItems(metrics, true, [dashboardAction({ kind: "signoff_nudge", canAutoSend: false })])
    const outcome = await items.find((i) => i.id === "signoff")!.onAction!()
    expect(outcome.status).toBe("drafted")
    expect(outcome.description).toMatch(/assign one from Pipeline/)
  })

  // ES2-12 B. `canAutoSend` is always false for needs_info (lib/dashboard/actions.ts),
  // so the wired button could only ever toast "Drafted, not sent" and tell the
  // reviewer to go open the submission. The drill-down takes them there instead.
  it("gives the needs-info item a drilldown of its submissions and no onAction", () => {
    const items = buildActionItems(
      baseMetrics(),
      true,
      [
        dashboardAction({ id: "n1", kind: "needs_info", submissionId: "s1", submissionTitle: "Coastal flood model", canAutoSend: false }),
        dashboardAction({ id: "n2", kind: "needs_info", submissionId: "s2", submissionTitle: "Storm surge model", canAutoSend: false }),
      ],
      doc,
      kpiDrilldown(),
    )
    const needsInfo = items.find((i) => i.id === "needs-info")!
    expect(needsInfo.onAction).toBeUndefined()
    expect(needsInfo.drilldown!.items.map((i) => i.id)).toEqual(["s1", "s2"])
    expect(needsInfo.drilldown!.items.map((i) => i.title)).toEqual(["Coastal flood model", "Storm surge model"])
  })

  it("attaches the duplicates and inventory-reportability KPI lists to their Action Center items", () => {
    const metrics = baseMetrics({
      crossBureauDuplicates: { clusterCount: 2, pendingCount: 2 },
      ombReportability: { reportable: 3, excluded: 0, review: 2, consolidated: 1, individual: 2 },
    })
    const drilldown = kpiDrilldown({
      duplicates: [drilldownCluster("c1"), drilldownCluster("c2")],
      "omb-reportable": [drilldownItem("r1"), drilldownItem("r2"), drilldownItem("r3")],
    })
    const items = buildActionItems(metrics, true, [], doc, drilldown)
    expect(items.find((i) => i.id === "duplicates")!.drilldown!.items).toEqual(drilldown.duplicates)
    expect(items.find((i) => i.id === "omb-review")!.drilldown!.items).toEqual(drilldown["omb-reportable"])
  })

  it("gives the unassigned item an Assign button backed by its own submissions", () => {
    const items = buildActionItems(
      baseMetrics(),
      true,
      [
        dashboardAction({ id: "u1", kind: "unassigned", submissionId: "s7", submissionTitle: "Permit triage", canAutoSend: false }),
      ],
      doc,
      kpiDrilldown(),
    )
    const unassigned = items.find((i) => i.id === "unassigned")!
    expect(unassigned.actionLabel).toBe("Assign")
    expect(unassigned.onAction).toBeUndefined()
    expect(unassigned.drilldown!.items).toEqual([
      expect.objectContaining({ id: "s7", title: "Permit triage", bureauLabel: "NOAA" }),
    ])
  })

  it("keeps the sign-off nudge wired to its notifier rather than a drilldown", () => {
    const metrics = baseMetrics({ awaitingSignoff: { count: 1, total: 5 } })
    const items = buildActionItems(metrics, true, [dashboardAction({ kind: "signoff_nudge" })], doc, kpiDrilldown())
    const signoff = items.find((i) => i.id === "signoff")!
    expect(signoff.onAction).toBeTypeOf("function")
    expect(signoff.drilldown).toBeUndefined()
  })

  // Callers that pass no drilldown (the CC-4 callers and every older test) get
  // items with no drilldown — and therefore, per action-center.tsx, no button.
  it("attaches no drilldown when the caller passes none", () => {
    const metrics = baseMetrics({
      crossBureauDuplicates: { clusterCount: 1, pendingCount: 1 },
      ombReportability: { reportable: 1, excluded: 0, review: 1, consolidated: 0, individual: 1 },
    })
    const items = buildActionItems(metrics, true, [dashboardAction({ kind: "needs_info", canAutoSend: false })], doc)
    for (const item of items) expect(item.drilldown).toBeUndefined()
  })
})

describe("computeHealthScore", () => {
  it("is 0 with no submissions in scope", () => {
    expect(computeHealthScore(baseMetrics({ readiness: { ready: 0, needs_work: 0, early_stage: 0, not_assessed: 0, total: 0 } }))).toBe(0)
  })

  it("is 100 when every submission is ready", () => {
    expect(
      computeHealthScore(baseMetrics({ readiness: { ready: 5, needs_work: 0, early_stage: 0, not_assessed: 0, total: 5 } })),
    ).toBe(100)
  })

  it("weights needs-work at half and ignores early-stage/not-assessed", () => {
    // 4 ready + 3 needs_work(half) + 2 early + 1 not_assessed, total 10
    expect(computeHealthScore(baseMetrics())).toBe(Math.round((4 * 100 + 3 * 50) / 10))
  })
})
