import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"

// DashboardShell only needs a router and a session; the real getSession()
// reads localStorage, and the real getTenant() depends on NEXT_PUBLIC_TENANT
// — neither is what this render test is about (RD-0, issue #201). `doc` is
// used directly via the `tenant` prop so the test never touches getTenant().
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {} }) }))

// jsdom doesn't implement matchMedia; the sidebar primitive's useIsMobile()
// (hooks/use-mobile.tsx) calls it on mount to decide desktop vs. off-canvas.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

type MockSession = {
  userId: string
  email: string
  name: string
  role: "admin" | "reviewer" | "submitter"
  loggedInAt: string
  jobRole?: string
  businessUnit?: string
  office?: string
} | null

let mockSession: MockSession = null

vi.mock("@/lib/auth", () => ({
  getSession: () => mockSession,
  hasAdminAccess: (s: MockSession) => !!s && (s.role === "admin" || s.role === "reviewer"),
  isAdmin: (s: MockSession) => !!s && s.role === "admin",
  logout: vi.fn(),
}))

import { DashboardShell } from "./dashboard-shell"
import { doc } from "@/lib/tenant/doc"
import type { DashboardScope } from "@/lib/dashboard/scope"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  mockSession = null
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

// `doc` (Department of Commerce) is the one real tenant whose `unit.options`
// declare `offices` (tenantHasBureauTier) — needed so the "Export approval
// report" item, gated additionally on hasDepartmentTransparency, renders for
// the admin-session assertions below (lib/bureauSignoff.ts).
const departmentScope: DashboardScope = { level: "department" }

function renderShell(session: MockSession) {
  mockSession = session
  const el = render(
    <DashboardShell
      baseScope={departmentScope}
      hierarchy={{ bureaus: [] }}
      selection={null}
      onSelect={() => {}}
      breadcrumb="Test scope"
      tenant={doc}
    >
      <div>content</div>
    </DashboardShell>,
  )
  // Effects (the getSession() useEffect) run inside the render's act() call.
  return el
}

/** Opens the user dropdown via keyboard, the interaction Radix's trigger
 * handles unconditionally (its pointerdown-open path also checks
 * event.button, which a plain jsdom-dispatched event doesn't set). Content
 * portals to document.body, not the render container. */
async function openUserMenu(el: HTMLElement) {
  const trigger = Array.from(el.querySelectorAll("button")).find((b) => b.getAttribute("aria-haspopup") === "menu")
  if (!trigger) throw new Error("user menu trigger not found")
  await act(async () => {
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
  })
}

function groupLabelTexts(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll("div"))
    .map((d) => d.textContent?.trim() ?? "")
    .filter((t) => ["Workspace", "Organization", "My view", "Admin"].includes(t))
}

describe("DashboardShell sidebar", () => {
  it("has exactly Workspace, Organization, My view — no Admin group — for an admin session", () => {
    const el = renderShell({
      userId: "u1",
      email: "admin@doc.gov",
      name: "Admin User",
      role: "admin",
      loggedInAt: new Date().toISOString(),
    })
    const labels = groupLabelTexts(el)
    expect(new Set(labels)).toEqual(new Set(["Workspace", "Organization", "My view"]))
    expect(labels).not.toContain("Admin")
  })

  it("omits My view when the base scope doesn't allow it", () => {
    const el = render(
      <DashboardShell
        baseScope={{ level: "personal", email: "sub@doc.gov" }}
        hierarchy={{ bureaus: [] }}
        selection={null}
        onSelect={() => {}}
        breadcrumb="Test scope"
        tenant={doc}
      >
        <div>content</div>
      </DashboardShell>,
    )
    const labels = groupLabelTexts(el)
    expect(labels).toEqual(["Workspace", "Organization"])
  })
})

describe("DashboardShell user dropdown", () => {
  it("shows the five admin items plus Sign out for an admin session, each with the sidebar's own href", async () => {
    const el = renderShell({
      userId: "u1",
      email: "admin@doc.gov",
      name: "Admin User",
      role: "admin",
      loggedInAt: new Date().toISOString(),
    })
    await openUserMenu(el)

    const menu = document.querySelector('[role="menu"]')
    expect(menu).not.toBeNull()

    const hrefOf = (label: string) => {
      const link = Array.from(menu!.querySelectorAll("a")).find((a) => a.textContent?.includes(label))
      if (!link) throw new Error(`no admin item labelled "${label}"`)
      return link.getAttribute("href")
    }
    expect(hrefOf("Form configuration")).toBe("/admin?tab=formconfig")
    expect(hrefOf("User management")).toBe("/admin?tab=settings")
    expect(hrefOf("Demo data")).toBe("/admin?tab=settings")
    expect(Array.from(menu!.querySelectorAll("a")).find((a) => a.getAttribute("href") === "/api/export/omb")).toBeTruthy()
    expect(Array.from(menu!.querySelectorAll("a")).find((a) => a.getAttribute("href") === "/api/export/approval")).toBeTruthy()
    expect(menu!.textContent).toContain("Sign out")
  })

  it("shows only Sign out (no Admin section) for a reviewer session", async () => {
    const el = renderShell({
      userId: "u2",
      email: "reviewer@doc.gov",
      name: "Reviewer User",
      role: "reviewer",
      loggedInAt: new Date().toISOString(),
    })
    await openUserMenu(el)

    const menu = document.querySelector('[role="menu"]')
    expect(menu).not.toBeNull()
    expect(menu!.textContent).not.toContain("Admin")
    expect(menu!.querySelectorAll("a")).toHaveLength(0)
    expect(menu!.textContent).toContain("Sign out")
  })
})
