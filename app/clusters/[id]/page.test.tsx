// RD-4: the dedicated duplicate-cluster page. DashboardShell chrome is
// mocked to a passthrough (dashboard-shell.test.tsx already covers the shell
// itself); everything else — clustering, the header/signals/members/decision
// pieces, and the write path — is real, run against a `doc`-tenant fixture
// (bureau tier required for clusterDuplicates to ever return a cluster).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"

let paramsId = "m1"
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: paramsId }),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => "/clusters/m1",
}))

type MockSession = { userId: string; email: string; name: string; role: "admin" | "reviewer" | "submitter"; loggedInAt: string } | null
let mockSession: MockSession = {
  userId: "u1",
  email: "jane@doc.gov",
  name: "Jane Reviewer",
  role: "reviewer",
  loggedInAt: new Date(0).toISOString(),
}

vi.mock("@/lib/auth", () => ({
  ensureSeeded: () => {},
  getSession: () => mockSession,
  hasAdminAccess: (s: MockSession) => !!s && (s.role === "admin" || s.role === "reviewer"),
}))

vi.mock("@/components/data-provider", () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useDataProvider: () => ({ loaded: true, refetchSubmissions: () => Promise.resolve() }),
}))

vi.mock("@/components/dashboard/dashboard-shell", () => ({
  DashboardShell: ({ children, breadcrumb }: { children: React.ReactNode; breadcrumb: string }) => (
    <div data-testid="shell" data-breadcrumb={breadcrumb}>
      {children}
    </div>
  ),
}))

const patchSubmissionFormData = vi.fn().mockResolvedValue(true)
let submissions: Submission[] = []
vi.mock("@/lib/submissions", () => ({
  getSubmissions: () => submissions,
  patchSubmissionFormData: (id: string, patch: Record<string, unknown>) => patchSubmissionFormData(id, patch),
}))

const assessCluster = vi.fn()
vi.mock("@/app/cluster-actions", () => ({
  assessCluster: (...args: unknown[]) => assessCluster(...args),
}))

import ClusterPage from "./page"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

function member(
  id: string,
  overrides: Partial<FormData> & { businessUnit: string; submittedAt?: string; status?: string },
): Submission {
  const { businessUnit, submittedAt, status, ...formOverrides } = overrides
  return {
    id,
    submittedAt: submittedAt || "2026-01-01T00:00:00.000Z",
    status: status || "submitted",
    businessUnit,
    formData: {
      ...initialFormData,
      submitterOffice: businessUnit,
      // High mutual token overlap (shared coreProblem) so every pair clears
      // ROLLUP_DUPLICATE_THRESHOLD (0.25) and all three land in one cluster.
      coreProblem: "alpha bravo charlie delta echo foxtrot golf hotel india juliet",
      proposedSolution: "risk score built from shared vendor history",
      ...formOverrides,
    } as FormData,
  }
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_TENANT = "doc"
  paramsId = "m1"
  patchSubmissionFormData.mockClear()
  assessCluster.mockReset()
  assessCluster.mockResolvedValue({
    recommendation: "keep_separate",
    headline: "Keep them separate, and link them.",
    reasons: ["One.", "Two.", "Three."],
    tradeoff: "Consolidating would lose each program office's own approval record.",
  })
  submissions = [
    // m1: earliest submittedAt, status "submitted" (lowest STATUS_ORDER index) -> "Oldest", and the tentative lead (smallest id).
    member("m1", {
      businessUnit: "census",
      useCaseTitle: "Supplier Past-Performance Risk Scoring Before Award",
      submittedAt: "2026-01-01T00:00:00.000Z",
      status: "submitted",
      submitterName: "Andre Duval",
    }),
    // m2: latest submittedAt, status "approved" (highest STATUS_ORDER index) -> "Furthest along".
    member("m2", {
      businessUnit: "ita",
      useCaseTitle: "Vendor Past-Performance Risk Scoring",
      submittedAt: "2026-03-01T00:00:00.000Z",
      status: "approved",
      submitterName: "Ruth Ellery",
    }),
    // m3: middle submittedAt, status "in_review" -> no derived tag.
    member("m3", {
      businessUnit: "nist",
      useCaseTitle: "Vendor Past-Performance Risk Scoring For Supply Awards",
      submittedAt: "2026-02-01T00:00:00.000Z",
      status: "in_review",
      submitterName: "Priya Raman",
    }),
  ]
})

afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
  delete process.env.NEXT_PUBLIC_TENANT
})

function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

async function flush(el: HTMLElement) {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
  return el
}

describe("/clusters/[id]", () => {
  it("shows a quiet not-found card with a link back to /home for an unknown cluster id", async () => {
    paramsId = "does-not-exist"
    const el = await flush(render(<ClusterPage />))
    expect(el.textContent).toContain("Cluster not found")
    const link = el.querySelector("a[href='/home']")
    expect(link).not.toBeNull()
  })

  it("shows the not-found card for tenants without a bureau tier (uspto/dow never form clusters)", async () => {
    process.env.NEXT_PUBLIC_TENANT = "uspto"
    const el = await flush(render(<ClusterPage />))
    expect(el.textContent).toContain("Cluster not found")
  })

  it("renders the header, three members with the lead first and the derived tags, and the decision buttons", async () => {
    const el = await flush(render(<ClusterPage />))

    // Header (item 2): count word title + pending eyebrow with the match %.
    expect(el.textContent).toContain("Three use cases, one problem")
    expect(el.textContent).toContain("Rationalization pending")

    // Header (issue #213 item 10): the explanation spells the count out too,
    // the same word the title derives — not the digit ("All 3 ... or 3
    // efforts" read as a second, disagreeing count on the same card).
    expect(el.textContent).toContain("All three were flagged")
    expect(el.textContent).toContain("or three efforts that stay separate")
    expect(el.textContent).not.toMatch(/All 3 |or 3 efforts/)

    // Members (item 5): all three titles present, lead (m1, the smallest id) first.
    const titles = Array.from(el.querySelectorAll(".font-heading")).map((n) => n.textContent)
    const m1Index = titles.findIndex((t) => t === "Supplier Past-Performance Risk Scoring Before Award")
    const m2Index = titles.findIndex((t) => t === "Vendor Past-Performance Risk Scoring")
    expect(m1Index).toBeGreaterThanOrEqual(0)
    expect(m1Index).toBeLessThan(m2Index)
    expect(el.textContent).toContain("Lead if consolidated")
    expect(el.textContent).toContain("Oldest")
    expect(el.textContent).toContain("Furthest along")

    // Decision (item 6): both buttons, pre-decision.
    const buttons = Array.from(el.querySelectorAll("button")).map((b) => b.textContent)
    expect(buttons).toContain("Keep separate and link")
    expect(buttons).toContain("Consolidate into lead")
  })

  it("clicking 'Keep separate and link' writes the same patch RationalizationPanel writes, to every member", async () => {
    const el = await flush(render(<ClusterPage />))
    const button = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Keep separate and link")!

    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(patchSubmissionFormData).toHaveBeenCalledTimes(3)
    const calledIds = patchSubmissionFormData.mock.calls.map((c) => c[0]).sort()
    expect(calledIds).toEqual(["m1", "m2", "m3"])
    for (const call of patchSubmissionFormData.mock.calls) {
      const patch = call[1] as { rationalization: Record<string, unknown> }
      expect(patch.rationalization).toMatchObject({
        clusterId: "m1",
        decision: "keep_separate",
        decidedBy: "Jane Reviewer",
      })
      expect(patch.rationalization.leadSubmissionId).toBeUndefined()
    }
  })

  it("renders Plumb's recommendation from assessCluster", async () => {
    const el = await flush(render(<ClusterPage />))
    expect(assessCluster).toHaveBeenCalled()
    expect(el.textContent).toContain("Plumb recommends")
    expect(el.textContent).toContain("Keep them separate, and link them.")
  })
})
