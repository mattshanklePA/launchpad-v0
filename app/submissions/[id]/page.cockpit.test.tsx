// NL-6 (#287) — setup copied from page.test.tsx.
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
import { docSeedSubmissions } from "@/lib/seedSubmissionsDoc"

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
let governanceDraftResult: Record<string, { value: string; rationale: string }> = {}
vi.mock("@/app/actions", () => ({
  assistReviewer: () => Promise.resolve(assistResult),
  getPlumbRead: () => Promise.resolve({ read: assistResult, savedAt: null, source: "new" }),
  draftGovernanceFields: () => Promise.resolve(governanceDraftResult),
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
  governanceDraftResult = {}
  mockSession = { userId: "u1", email: "avery@doc.gov", name: "Avery Lang", role: "reviewer", businessUnit: "atr", loggedInAt: new Date(0).toISOString() }
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


describe("review record before a decision (NL-6, #287)", () => {
  async function open(tenant: string, query = "") {
    process.env.NEXT_PUBLIC_TENANT = tenant
    window.history.pushState({}, "", `/submissions/s1${query}`)
    submissions = [submission({ id: "s1", status: "in_review" })]
    const el = render(<SubmissionDetailPage />)
    await flush(el)
    await flush(el)
    return el
  }

  it("ES2 reviewer: band with office · id · status, K5 key facts with tags, K3 step title, same steps", async () => {
    const el = await open("es2")
    const band = el.querySelector('[data-cockpit="header-band"]')
    expect(band).not.toBeNull()
    expect(band!.textContent).toContain("Supplier Past-Performance Risk Scoring Before Award")
    expect(band!.textContent).toContain("IN REVIEW")
    const facts = el.querySelector('[data-cockpit="key-facts"]')!
    expect(facts.textContent).toContain("Risk level")
    expect(facts.textContent).toContain("Status")
    expect(facts.textContent).toContain("Office")
    expect(facts.querySelectorAll('[data-cockpit="square-tag"]').length).toBeGreaterThan(0)
    expect(el.querySelector('[data-cockpit="section-title"]')).not.toBeNull()
    expect(el.textContent).toContain("Your progress")
  })

  it("ES2 submitter keeps the three tabs and the ?tab= deep link", async () => {
    mockSession = { ...mockSession!, role: "submitter", email: "andre@es2.gov", businessUnit: undefined }
    process.env.NEXT_PUBLIC_TENANT = "es2"
    window.history.pushState({}, "", "/submissions/s1?tab=conversation")
    const sub = submission({ id: "s1", status: "in_review", submitterEmail: "andre@es2.gov" } as never)
    submissions = [sub]
    const el = render(<SubmissionDetailPage />)
    await flush(el)
    await flush(el)
    const tabs = Array.from(el.querySelectorAll('[role="tab"]'))
    expect(tabs.map((t) => t.textContent?.split("(")[0].trim())).toEqual(["Review", "Governance record", "Conversation"])
    expect(tabs[2].getAttribute("data-state")).toBe("active")
    expect(el.querySelector('[data-cockpit="header-band"]')).not.toBeNull()
  })

  it("doc tenant renders the old record: no cockpit pieces", async () => {
    const el = await open("doc")
    expect(el.querySelector('[data-cockpit]')).toBeNull()
    expect(el.textContent).toContain("Your progress")
  })
})
