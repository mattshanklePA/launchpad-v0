import { describe, it, expect, vi } from "vitest"
import {
  resolveDrillScope,
  scopeLabel,
  buildKpiCards,
  buildActionItems,
  computeHealthScore,
} from "./department-dashboard-data"
import type { DashboardScope } from "@/lib/dashboard/scope"
import type { DashboardMetrics } from "@/lib/dashboard/metrics"
import type { DashboardAction } from "@/lib/dashboard/actions"
import type { TenantConfig } from "@/lib/tenant"

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
} as unknown as TenantConfig

const uspto = {
  id: "uspto",
  orgName: "USPTO",
  unit: { label: "Business unit", options: [{ value: "patents", label: "Patents" }] },
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
    const items = buildActionItems(metrics, true)
    expect(items.map((i) => i.title)).toEqual([
      "1 cross-bureau duplicate cluster pending rationalization",
      "1 approved use case awaiting bureau sign-off",
      "1 submission needs an OMB reportability review",
    ])
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

  it("adds a needs-info item wired to notify, only when dashboardActions has one", () => {
    expect(buildActionItems(baseMetrics(), true)).not.toContainEqual(expect.objectContaining({ id: "needs-info" }))
    const items = buildActionItems(baseMetrics(), true, [dashboardAction({ kind: "needs_info", canAutoSend: false })])
    const needsInfo = items.find((i) => i.id === "needs-info")!
    expect(needsInfo).toMatchObject({ title: "1 submission waiting on submitter follow-up", actionLabel: "Request info" })
    expect(needsInfo.onAction).toBeTypeOf("function")
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

  it("resolves the request-info action to a 'drafted' outcome — never auto-sent", async () => {
    sendDashboardActionNotification.mockResolvedValueOnce({ sent: false, count: 0 })
    const items = buildActionItems(baseMetrics(), true, [dashboardAction({ kind: "needs_info", canAutoSend: false })])
    const outcome = await items.find((i) => i.id === "needs-info")!.onAction!()
    expect(outcome.status).toBe("drafted")
    expect(outcome.description).toMatch(/aren't sent over Slack/)
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
