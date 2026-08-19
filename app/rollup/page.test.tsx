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

vi.mock("@/lib/submissions", () => ({ getSubmissions: () => [] }))

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
})
