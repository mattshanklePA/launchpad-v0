import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"

// This test is about page composition (ordering + the auth gate), not the
// shell chrome (dashboard-shell.test.tsx already covers that) or the real
// admin tables (bureau-rollup.test.tsx etc.) — every heavy dependency below
// is stubbed to a marker so ordering can be read straight off the DOM.

let replaced: string | null = null
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: (url: string) => { replaced = url } }),
  usePathname: () => "/rollup",
}))

type MockSession = { userId: string; email: string; name: string; role: "admin" | "reviewer" | "submitter"; loggedInAt: string } | null
let mockSession: MockSession = null

vi.mock("@/lib/auth", () => ({
  ensureSeeded: () => {},
  getSession: () => mockSession,
  hasAdminAccess: (s: MockSession) => !!s && (s.role === "admin" || s.role === "reviewer"),
}))

vi.mock("@/components/data-provider", () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useDataProvider: () => ({ loaded: true }),
}))

let submissions: unknown[] = []
vi.mock("@/lib/submissions", () => ({ getSubmissions: () => submissions }))

vi.mock("@/components/dashboard/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/admin/bureau-rollup", () => ({
  BureauRollup: () => <div data-testid="bureau-rollup">BureauRollup</div>,
}))
vi.mock("@/components/admin/approval-transparency", () => ({
  ApprovalTransparency: () => <div data-testid="approval-transparency">ApprovalTransparency</div>,
}))
vi.mock("@/components/admin/rationalization-panel", () => ({
  RationalizationPanel: () => <div data-testid="rationalization-panel">RationalizationPanel</div>,
}))

import RollupPage from "./page"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  mockSession = null
  replaced = null
  submissions = []
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

describe("/rollup", () => {
  it("redirects a non-admin (submitter) session the same way /decisions redirects", () => {
    mockSession = { userId: "u1", email: "sub@x.gov", name: "Sub", role: "submitter", loggedInAt: new Date().toISOString() }
    render(<RollupPage />)
    expect(replaced).toBe("/login?next=%2Frollup")
  })

  it("redirects a signed-out visitor to login", () => {
    mockSession = null
    render(<RollupPage />)
    expect(replaced).toBe("/login?next=%2Frollup")
  })

  it("renders BureauRollup before ApprovalTransparency before RationalizationPanel for an admin session", () => {
    mockSession = { userId: "u1", email: "admin@x.gov", name: "Admin", role: "admin", loggedInAt: new Date().toISOString() }
    const el = render(<RollupPage />)
    expect(replaced).toBeNull()

    const order = Array.from(el.querySelectorAll("[data-testid]")).map((n) => n.getAttribute("data-testid"))
    expect(order).toEqual(["bureau-rollup", "approval-transparency", "rationalization-panel"])
  })

  it("also renders for a reviewer session (same gate as /decisions)", () => {
    mockSession = { userId: "u2", email: "rev@x.gov", name: "Reviewer", role: "reviewer", loggedInAt: new Date().toISOString() }
    const el = render(<RollupPage />)
    expect(replaced).toBeNull()
    expect(el.querySelector('[data-testid="bureau-rollup"]')).not.toBeNull()
  })

  it("meta line reports the real consolidated count, not the words 'inventory count' (RD-8, issue #218)", () => {
    mockSession = { userId: "u1", email: "admin@x.gov", name: "Admin", role: "admin", loggedInAt: new Date().toISOString() }
    const codeGenFormData = {
      useCaseTitle: "Dev Copilot",
      coreProblem: "Engineers spend too long writing boilerplate code.",
      solutionSummary: "An AI coding assistant that helps generate code from natural-language prompts.",
      highImpact: "not_high_impact",
    }
    submissions = [
      { id: "s1", formData: codeGenFormData },
      { id: "s2", formData: { ...codeGenFormData, useCaseTitle: "Dev Copilot 2" } },
      { id: "s3", formData: { useCaseTitle: "Patent Triage Assistant", coreProblem: "Examiners spend too long triaging incoming patent applications.", highImpact: "not_high_impact" } },
    ]
    const el = render(<RollupPage />)
    expect(el.textContent).toContain("3 use cases")
    // Two "code generation" matches consolidate to one entry, plus the one
    // individually-reported submission — 2 reportable entries, same number
    // BureauRollup's own summary line computes.
    expect(el.textContent).toContain("consolidates to 2 OMB reportable entries")
    expect(el.textContent).not.toContain("the OMB inventory count")
    expect(el.textContent).not.toContain("inventory count")
  })

  it("omits the consolidation clause entirely when nothing on the page consolidates", () => {
    mockSession = { userId: "u1", email: "admin@x.gov", name: "Admin", role: "admin", loggedInAt: new Date().toISOString() }
    submissions = [
      { id: "s1", formData: { useCaseTitle: "Patent Triage Assistant", coreProblem: "Examiners spend too long triaging incoming patent applications.", highImpact: "not_high_impact" } },
    ]
    const el = render(<RollupPage />)
    expect(el.textContent).toContain("1 use case")
    expect(el.textContent).not.toContain("consolidates to")
  })
})
