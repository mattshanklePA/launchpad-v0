import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import type { DashboardScope } from "@/lib/dashboard/scope"
import type { ActionItem } from "./action-center-data"
import type { KpiDrilldown } from "@/lib/dashboard/drilldown"
import type { DashboardMetrics } from "@/lib/dashboard/metrics"
import type { Submission } from "@/lib/submissions"

// CommandCenter's own job is layout: which section renders when, and how it
// wires buildActionItems/buildKpiCards/getKpiDrilldown's real output into
// that layout. Those functions' own counting/wording logic is already
// covered (department-dashboard-data.test.ts, kpi-card-data.test.ts,
// action-center.test.tsx) — this test fabricates their output directly
// rather than re-deriving realistic cross-bureau duplicate matches, so a
// change to the matching heuristics can't make this test flaky.

const emptyMetrics = (scope: DashboardScope, total = 0): DashboardMetrics =>
  ({
    scope,
    pipelineStatus: { counts: {} as any, total },
    readiness: { ready: 0, needs_work: 0, early_stage: 0, not_assessed: 0, total: 0 },
    highImpact: { count: 0, total: 0 },
    awaitingSignoff: { count: 0, total: 0 },
    ombReportability: { reportable: 0, excluded: 0, review: 0, consolidated: 0, individual: 0 },
    crossBureauDuplicates: { clusterCount: 0, pendingCount: 0 },
    bureauRollup: [],
    officeRollup: [],
    rmfRollup: { on_track: 0, attention: 0, at_risk: 0, unknown: 0, total: 0 },
  }) as DashboardMetrics

const emptyDrilldown: KpiDrilldown = {
  pipeline: [],
  readiness: [],
  "high-impact": [],
  "omb-reportable": [],
  signoff: [],
  duplicates: [],
  rmf: [],
}

let scopedActionItems: ActionItem[] = []
let enterpriseActionItems: ActionItem[] = []
let scopedTotal = 0
let enterpriseTotal = 15
let scopedDrilldown: KpiDrilldown = emptyDrilldown
let scopedSubmissionsFixture: Submission[] = []

vi.mock("@/lib/dashboard/metrics", () => ({
  getDashboardMetrics: (scope: DashboardScope) => emptyMetrics(scope, scope.level === "department" ? enterpriseTotal : scopedTotal),
  scopedSubmissions: (scope: DashboardScope) => (scope.level === "department" ? [] : scopedSubmissionsFixture),
}))

vi.mock("@/lib/dashboard/drilldown", () => ({ getKpiDrilldown: () => scopedDrilldown }))
vi.mock("@/lib/dashboard/actions", () => ({ getDashboardActions: () => [] }))
vi.mock("@/lib/rationalization", () => ({
  tenantHasBureauTier: () => true,
  clusterDuplicates: () => [],
  isRationalizationPending: () => false,
}))
vi.mock("@/lib/decisionCenter", () => ({ decisionCenterCandidates: () => [] }))

vi.mock("./department-dashboard-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./department-dashboard-data")>()
  return {
    ...actual,
    buildKpiCards: () => [],
    buildActionItems: (metrics: DashboardMetrics) => (metrics.scope.level === "department" ? enterpriseActionItems : scopedActionItems),
  }
})

import { CommandCenter } from "./command-center"
import { doc } from "@/lib/tenant/doc"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  scopedActionItems = []
  enterpriseActionItems = []
  scopedTotal = 0
  enterpriseTotal = 15
  scopedDrilldown = emptyDrilldown
  scopedSubmissionsFixture = []
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
})

function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

const departmentScope: DashboardScope = { level: "department" }
const bureauScope: DashboardScope = { level: "bureau", businessUnit: "census" }

function renderCommandCenter(scope: DashboardScope) {
  return render(
    <CommandCenter
      tenant={doc}
      session={{ userId: "u1", email: "a@doc.gov", name: "Admin", role: "admin", loggedInAt: new Date().toISOString() }}
      scope={scope}
      selection={null}
      onSelect={() => {}}
      submissions={[]}
    />,
  )
}

describe("CommandCenter hero", () => {
  it("renders the hero only when a critical item exists, using the count word and lead title", () => {
    enterpriseActionItems = [
      { id: "duplicates", title: "1 cross-bureau duplicate cluster pending rationalization", severity: "critical", actionLabel: "Rationalize" },
    ]
    scopedDrilldown = {
      ...emptyDrilldown,
      duplicates: [
        {
          id: "lead-1",
          title: "Supplier Past-Performance Risk Scoring",
          bureau: "x",
          bureauLabel: "Business Technology Solutions / Acquisition, Training and Readiness / Logistics & Finance",
          stage: "In review",
          cardField: "Pending rationalization",
          memberIds: ["lead-1", "m2", "m3"],
        },
      ],
    }
    const el = renderCommandCenter(departmentScope)
    expect(el.textContent).toContain("Do this first")
    expect(el.textContent).toContain("Three bureaus are building Supplier Past-Performance Risk Scoring.")
  })

  it("renders no hero when nothing is critical", () => {
    enterpriseActionItems = [{ id: "signoff", title: "2 approved use cases awaiting bureau sign-off", severity: "warning" }]
    const el = renderCommandCenter(departmentScope)
    expect(el.textContent).not.toContain("Do this first")
  })

  it("does not repeat the hero item in the row list", () => {
    enterpriseActionItems = [
      { id: "duplicates", title: "1 cross-bureau duplicate cluster pending rationalization", severity: "critical", actionLabel: "Rationalize" },
      { id: "signoff", title: "2 approved use cases awaiting bureau sign-off", severity: "warning" },
    ]
    scopedDrilldown = {
      ...emptyDrilldown,
      duplicates: [
        { id: "lead-1", title: "Idea", bureau: "x", bureauLabel: "A / B", stage: "In review", cardField: "Pending rationalization", memberIds: ["lead-1", "m2"] },
      ],
    }
    const el = renderCommandCenter(departmentScope)
    const rows = Array.from(el.querySelectorAll("[data-action-row]"))
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain("2 approved use cases awaiting bureau sign-off")
    // The hero's own copy (not the raw action-item title) is what appears up top.
    expect(el.textContent).toContain("Do this first")
  })
})

describe("CommandCenter rows", () => {
  it("bolds the leading count and renders the right control for drilldown / onAction / neither", async () => {
    const onAction = vi.fn().mockResolvedValue({ status: "sent" as const })
    enterpriseActionItems = [
      {
        id: "omb-review",
        title: "3 submissions need an OMB reportability review",
        severity: "info",
        actionLabel: "Review",
        drilldown: { label: "OMB reportable", items: [] },
      },
      { id: "signoff", title: "2 approved use cases awaiting bureau sign-off", severity: "warning", actionLabel: "Nudge sign-off", onAction },
      { id: "inert", title: "1 submission is waiting", severity: "info" },
    ]
    const el = renderCommandCenter(departmentScope)

    const rows = Array.from(el.querySelectorAll("[data-action-row]"))
    expect(rows).toHaveLength(3)

    const drilldownRow = rows.find((r) => r.textContent?.includes("OMB reportability review"))!
    expect(drilldownRow.querySelector("strong")?.textContent).toBe("3")
    const trigger = drilldownRow.querySelector("button")!
    expect(trigger.textContent).toContain("Review")
    await act(async () => {
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    const onActionRow = rows.find((r) => r.textContent?.includes("awaiting bureau sign-off"))!
    expect(onActionRow.querySelector("strong")?.textContent).toBe("2")
    expect(onActionRow.querySelector("button")?.textContent).toContain("Nudge sign-off")

    const inertRow = rows.find((r) => r.textContent?.includes("1 submission is waiting"))!
    expect(inertRow.querySelector("strong")?.textContent).toBe("1")
    expect(inertRow.querySelector("button")).toBeNull()
  })
})

describe("CommandCenter scoped view", () => {
  it("renders the scoped banner, 'of N enterprise-wide', and the use-case list; no Tabs, gauge, or chart", () => {
    scopedActionItems = [{ id: "unassigned", title: "1 submission with no reviewer assigned", severity: "warning" }]
    enterpriseActionItems = [
      { id: "unassigned", title: "1 submission with no reviewer assigned", severity: "warning" },
      { id: "signoff", title: "2 approved use cases awaiting bureau sign-off", severity: "warning" },
    ]
    scopedSubmissionsFixture = [
      {
        id: "s1",
        submittedAt: "2026-08-18T00:00:00.000Z",
        formData: { useCaseTitle: "Closeout completeness flagging", submitterName: "Avery Lang" } as any,
        status: "in_review",
        businessUnit: "census",
      },
    ]

    const el = renderCommandCenter(bureauScope)

    expect(el.textContent).toContain("You are looking at one bureau")
    expect(el.textContent).toContain("of 2 enterprise-wide")
    expect(el.textContent).toContain("Closeout completeness flagging")
    expect(el.textContent).toContain("Avery Lang · submitted 18 Aug 2026")

    expect(el.querySelector('[role="tablist"]')).toBeNull()
    expect(el.textContent).not.toContain("Pipeline by status")
    expect(el.textContent).not.toContain("Decision readiness")
  })

  it("renders no hero for a scoped view even when a critical item exists", () => {
    scopedActionItems = [{ id: "duplicates", title: "1 cross-bureau duplicate cluster pending rationalization", severity: "critical" }]
    const el = renderCommandCenter(bureauScope)
    expect(el.textContent).not.toContain("Do this first")
  })
})
