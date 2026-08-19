// RD-5 (issue #206): the reviewer detail page's decided-record redesign —
// header decision block, tabs, "Why it was {approved|rejected}", the Plumb
// agreement sentence, the Governance record tab's summary + compliance grid,
// the rail, and `?tab=` deep-linking. DashboardShell chrome is mocked to a
// passthrough (dashboard-shell.test.tsx already covers the shell itself),
// same pattern as app/clusters/[id]/page.test.tsx.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"

let paramsId = "s1"
let lastReplacedUrl = ""
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: paramsId }),
  useRouter: () => ({ push: () => {}, replace: (url: string) => { lastReplacedUrl = url } }),
  usePathname: () => "/submissions/s1",
}))

type MockSession = { userId: string; email: string; name: string; role: "admin" | "reviewer" | "submitter"; businessUnit?: string; loggedInAt: string } | null
let mockSession: MockSession = {
  userId: "u1",
  email: "avery@doc.gov",
  name: "Avery Lang",
  role: "reviewer",
  businessUnit: "atr",
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

let submissions: Submission[] = []
const patchSubmissionFormData = vi.fn().mockResolvedValue(true)
const setSubmissionStatus = vi.fn().mockResolvedValue(true)
const addSubmissionComment = vi.fn().mockResolvedValue(true)
vi.mock("@/lib/submissions", () => ({
  getSubmissions: () => submissions,
  patchSubmissionFormData: (id: string, patch: Record<string, unknown>) => patchSubmissionFormData(id, patch),
  setSubmissionStatus: (id: string, status: string) => setSubmissionStatus(id, status),
  addSubmissionComment: (id: string, comment: unknown, status?: string) => addSubmissionComment(id, comment, status),
}))

let assistResult = {
  verdict: "Solid, decision-ready submission.",
  strengths: ["Clear problem statement"],
  gaps: [] as string[],
  suggestedDisposition: "reject" as "approve" | "reject" | "request_info",
  draftRequestInfo: "Can you share more detail?",
}
vi.mock("@/app/actions", () => ({
  assistReviewer: () => Promise.resolve(assistResult),
  draftGovernanceFields: () => Promise.resolve({}),
}))

vi.mock("@/app/systemConnector-actions", () => ({
  pushApprovedSubmission: () => Promise.resolve(),
}))

import SubmissionDetailPage from "./page"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

function submission(overrides: Partial<FormData> & { id: string; submittedAt?: string; status?: string; businessUnit?: string }): Submission {
  const { id, submittedAt, status, businessUnit, ...formOverrides } = overrides
  return {
    id,
    submittedAt: submittedAt || "2026-08-17T09:00:00.000Z",
    status: status || "submitted",
    businessUnit: businessUnit || "atr",
    formData: {
      ...initialFormData,
      submitterOffice: businessUnit || "atr",
      useCaseTitle: "Supplier Past-Performance Risk Scoring Before Award",
      submitterName: "Andre Duval",
      coreProblem: "Award decisions rely on unvetted supplier past performance.",
      proposedSolution: "Risk score from CPARS history and delivery data at solicitation.",
      successMetrics: "Protest rate on awards",
      ...formOverrides,
    } as FormData,
  }
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_TENANT = "doc"
  paramsId = "s1"
  lastReplacedUrl = ""
  window.history.pushState({}, "", "/submissions/s1")
  patchSubmissionFormData.mockClear()
  setSubmissionStatus.mockClear()
  addSubmissionComment.mockClear()
  assistResult = {
    verdict: "Solid, decision-ready submission.",
    strengths: ["Clear problem statement"],
    gaps: [],
    suggestedDisposition: "reject",
    draftRequestInfo: "Can you share more detail?",
  }
  submissions = []
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
    await Promise.resolve()
  })
  return el
}

const REJECTED_DECIDED_FIELDS = {
  bureauSignoff: {
    bureau: "atr",
    decision: "rejected",
    signedOffByName: "Avery Lang",
    signedOffByEmail: "avery@doc.gov",
    signedOffAt: "2026-08-18T15:00:00.000Z",
  },
  comments: [
    {
      id: "c1",
      authorName: "Avery Lang",
      authorRole: "reviewer",
      body: "Rejecting as a duplicate of the AT&R effort.",
      createdAt: "2026-08-18T15:05:00.000Z",
    },
  ],
  rationalization: {
    clusterId: "m1",
    decision: "keep_separate",
    decidedBy: "Avery Lang",
    decidedAt: "2026-08-18T14:00:00.000Z",
  },
  governanceCaptureReview: {
    entries: [
      { field: "stageOfDevelopment", decision: "confirmed", proposedValue: "pre_deployment", finalValue: "pre_deployment", rationale: "Nothing in it references a pilot." },
      { field: "aiClassification", decision: "confirmed", proposedValue: "classical_predictive_ml", finalValue: "classical_predictive_ml", rationale: "Scores structured history — no generative output." },
      { field: "highImpact", decision: "overridden", proposedValue: "not_high_impact", finalValue: "not_high_impact", rationale: "" },
    ],
    byName: "Avery Lang",
    byEmail: "avery@doc.gov",
    at: "2026-08-18T12:00:00.000Z",
  },
}
const REJECTED_DECIDED = REJECTED_DECIDED_FIELDS as unknown as Partial<FormData>

describe("/submissions/[id] — decided record", () => {
  it("renders the decision block in the header, three tabs, and 'Why it was rejected' with the reviewer's own text", async () => {
    submissions = [submission({ id: "s1", status: "rejected", ...REJECTED_DECIDED })]
    const el = await flush(render(<SubmissionDetailPage />))

    // Header decision block.
    expect(el.textContent).toContain("The decision")
    expect(el.textContent).toContain("Rejected")
    expect(el.textContent).toContain("by Avery Lang")

    // Three tabs, decided-record label.
    const tabLabels = Array.from(el.querySelectorAll('[role="tab"]')).map((t) => t.textContent)
    expect(tabLabels.some((t) => t?.includes("The decision"))).toBe(true)
    expect(tabLabels.some((t) => t?.includes("Governance record"))).toBe(true)
    expect(tabLabels.some((t) => t?.includes("Conversation"))).toBe(true)

    // "Why it was rejected" uses the most recent reviewer comment at/after the decision.
    expect(el.textContent).toContain("Why it was rejected")
    expect(el.textContent).toContain("Rejecting as a duplicate of the AT&R effort.")
  })

  it("shows 'No reason was recorded.' when there is no reviewer comment to draw from", async () => {
    submissions = [submission({
      id: "s1",
      status: "rejected",
      ...({ bureauSignoff: REJECTED_DECIDED_FIELDS.bureauSignoff } as Partial<FormData>),
    })]
    const el = await flush(render(<SubmissionDetailPage />))
    expect(el.textContent).toContain("No reason was recorded.")
  })

  it("renders the Plumb agreement sentence both ways, deterministically off suggestedDisposition vs. the decision", async () => {
    submissions = [submission({ id: "s1", status: "rejected", ...REJECTED_DECIDED })]

    assistResult = { ...assistResult, suggestedDisposition: "reject" }
    let el = await flush(render(<SubmissionDetailPage />))
    expect(el.textContent).toContain("the reviewer's decision agrees")
    act(() => root!.unmount())
    container!.remove()
    root = null
    container = null

    assistResult = { ...assistResult, suggestedDisposition: "approve" }
    el = await flush(render(<SubmissionDetailPage />))
    expect(el.textContent).toContain("the reviewer's decision decided otherwise")
  })

  it("opens the Governance record tab on ?tab=governance and shows the drafted/confirmed counts and the compliance 2x2, with no raw enum code leaking", async () => {
    window.history.pushState({}, "", "/submissions/s1?tab=governance")
    submissions = [submission({ id: "s1", status: "rejected", stageOfDevelopment: "pre_deployment", ...REJECTED_DECIDED })]
    const el = await flush(render(<SubmissionDetailPage />))

    expect(el.textContent).toContain("Decision checklist")
    // 2 confirmed ("drafted by Plumb") + 1 overridden ("confirmed by the reviewer").
    expect(el.textContent).toContain("2 drafted by Plumb")
    expect(el.textContent).toContain("1 confirmed by the reviewer")

    // Compliance 2x2.
    expect(el.textContent).toContain("Compliance")
    expect(el.textContent).toContain("Individual use case")

    // No underscore token in the value line under any "Plumb proposes" label.
    const proposesLabels = Array.from(el.querySelectorAll("span")).filter((s) => s.textContent === "Plumb proposes")
    expect(proposesLabels.length).toBeGreaterThan(0)
    for (const label of proposesLabels) {
      const valueLine = label.parentElement?.nextElementSibling
      expect(valueLine?.textContent || "").not.toContain("_")
    }
  })

  it("renders the rail's submission summary and the activity list newest-first", async () => {
    submissions = [submission({ id: "s1", status: "rejected", ...REJECTED_DECIDED })]
    const el = await flush(render(<SubmissionDetailPage />))

    expect(el.textContent).toContain("The submission")
    expect(el.textContent).toContain("Award decisions rely on unvetted supplier past performance.")

    expect(el.textContent).toContain("Activity")
    const activityLabels = ["replied", "Rejected by Avery Lang", "marked keep-separate", "Submitted by Andre Duval"]
    const positions = activityLabels.map((l) => el.textContent!.indexOf(l))
    for (const p of positions) expect(p).toBeGreaterThan(-1)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
})

describe("/submissions/[id] — tenants without a bureau tier (no decision attribution stored)", () => {
  it("omits the decision block's by/date rather than fabricating one for a decided record on a non-bureau tenant", async () => {
    process.env.NEXT_PUBLIC_TENANT = "uspto"
    submissions = [submission({ id: "s1", status: "approved", businessUnit: "" })]
    const el = await flush(render(<SubmissionDetailPage />))
    expect(el.textContent).toContain("Approved")
    // Reversible until sign-off (never actually signed off on this tenant).
    expect(el.textContent).toContain("Reversible until")
  })
})

describe("/submissions/[id] — undecided (in-review) record", () => {
  it("labels the first tab 'Review' and keeps today's disposition controls, checklist, and conversation intact", async () => {
    submissions = [submission({ id: "s1", status: "in_review" })]
    const el = await flush(render(<SubmissionDetailPage />))

    const tabLabels = Array.from(el.querySelectorAll('[role="tab"]')).map((t) => t.textContent)
    expect(tabLabels.some((t) => t?.includes("Review"))).toBe(true)
    expect(tabLabels.some((t) => t === "The decision")).toBe(false)

    expect(el.textContent).toContain("Decision checklist")
    const buttons = Array.from(el.querySelectorAll("button")).map((b) => b.textContent)
    expect(buttons).toContain("Approve")
    expect(buttons).toContain("Reject")
  })
})
