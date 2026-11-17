// FIX-4 item 5: the /admin access test PR #317 left out. Someone signed in
// without access is sent to their home page, once, never to /login (which sent
// them straight back and looped). Run on all four sites.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"

const replace = vi.fn()
const router = { push: vi.fn(), replace } // stable, like the real router
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(),
}))

type Role = "admin" | "reviewer" | "submitter"
let mockSession: { userId: string; email: string; name: string; role: Role; loggedInAt: string } | null = null
vi.mock("@/lib/auth", () => ({
  ensureSeeded: () => {},
  getSession: () => mockSession,
  hasAdminAccess: (s: { role: string } | null) => !!s && (s.role === "admin" || s.role === "reviewer"),
  isAdmin: (s: { role: string } | null) => !!s && s.role === "admin",
  logout: () => {},
}))

vi.mock("@/components/data-provider", () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useDataProvider: () => ({ loaded: true, refetchSubmissions: () => Promise.resolve() }),
}))
vi.mock("@/lib/submissions", () => ({ getSubmissions: () => [], clearSubmissions: () => Promise.resolve() }))
vi.mock("@/components/layout/header", () => ({ Header: () => <div data-testid="header" /> }))
vi.mock("@/components/cockpit/cockpit-shell", () => ({
  CockpitShell: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-shell">{children}</div>,
}))
vi.mock("@/components/admin/user-management", () => ({ UserManagement: () => null }))
vi.mock("@/components/admin/form-config-panel", () => ({ FormConfigPanel: () => null }))
vi.mock("@/components/admin/comparison-view", () => ({ ComparisonView: () => null }))
vi.mock("@/components/admin/decision-center", () => ({ DecisionCenter: () => null }))
vi.mock("@/app/admin/compare-actions", () => ({}))

import AdminPage from "./page"
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const person = (role: Role) => ({ userId: "u1", email: "p@example.test", name: "P", role, loggedInAt: new Date(0).toISOString() })
const prevTenant = process.env.NEXT_PUBLIC_TENANT
let container: HTMLDivElement
let root: Root

async function open() {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<AdminPage />)
  })
}

beforeEach(() => {
  replace.mockClear()
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  if (prevTenant === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = prevTenant
})

describe.each(["uspto", "doc", "dow", "es2"])("/admin on %s", (tenant) => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TENANT = tenant
  })

  it("sends a signed-in submitter to /home, once, never to /login, and shows nothing", async () => {
    mockSession = person("submitter")
    await open()
    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith("/home")
    expect(container.textContent).toBe("")
    expect(container.querySelector('[data-testid="admin-shell"]')).toBeNull()
  })

  it("does not redirect an admin, and shows the page", async () => {
    mockSession = person("admin")
    await open()
    expect(replace).not.toHaveBeenCalled()
    expect(container.textContent).not.toBe("")
  })

  it("does not redirect a reviewer (the page is open to admins and reviewers today)", async () => {
    mockSession = person("reviewer")
    await open()
    expect(replace).not.toHaveBeenCalled()
  })
})
