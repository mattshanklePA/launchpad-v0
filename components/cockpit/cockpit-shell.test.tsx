import { describe, it, expect, beforeEach, vi } from "vitest"
import { act } from "react"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => "/decisions",
}))

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
} | null
let mockSession: MockSession = null

vi.mock("@/lib/auth", () => ({
  getSession: () => mockSession,
  hasAdminAccess: (s: MockSession) => !!s && (s.role === "admin" || s.role === "reviewer"),
  isAdmin: (s: MockSession) => !!s && s.role === "admin",
  logout: vi.fn(),
}))

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { doc } from "@/lib/tenant/doc"
import { es2 } from "@/lib/tenant/es2"
import type { TenantConfig } from "@/lib/tenant"
import { render } from "./test-utils"

const session = (role: "admin" | "reviewer" | "submitter"): MockSession => ({
  userId: "u1",
  email: `${role}@es2.demo`,
  name: `${role} user`,
  role,
  loggedInAt: new Date().toISOString(),
})

function renderShell(tenant: TenantConfig, s: MockSession, extra: { title?: string } = {}) {
  mockSession = s
  return render(
    <DashboardShell
      baseScope={{ level: "department" }}
      hierarchy={{ bureaus: [] }}
      selection={null}
      onSelect={() => {}}
      breadcrumb="Decision Center"
      tenant={tenant}
      {...extra}
    >
      <div>content</div>
    </DashboardShell>,
  )
}

beforeEach(() => {
  mockSession = null
})

describe("DashboardShell switch (NL-2, #283)", () => {
  it("renders the band and no sidebar on es2", () => {
    const el = renderShell(es2, session("admin"))
    expect(el.querySelector('[data-cockpit="header-band"]')).not.toBeNull()
    expect(el.querySelector('[data-cockpit="sample-data-strip"]')?.textContent).toContain("SAMPLE DATA")
    expect(el.textContent).toContain("Every idea, office and number on this page is sample data for the demo.")
    expect(el.textContent).toContain("CPE ES2 · DECISION CENTER")
    expect(el.querySelector('[data-sidebar], aside')).toBeNull()
  })

  it("renders the old sidebar layout, with no band or strip, on doc", () => {
    const el = renderShell(doc, session("admin"))
    expect(el.querySelector('[data-cockpit="header-band"]')).toBeNull()
    expect(el.querySelector('[data-cockpit="sample-data-strip"]')).toBeNull()
    expect(el.textContent).toContain("Workspace")
  })

  it("marks the active tab with aria-current and shows all three tabs to an admin", () => {
    const el = renderShell(es2, session("admin"))
    const links = Array.from(el.querySelectorAll("nav a"))
    expect(links.map((a) => a.textContent)).toEqual(["My work", "Decision Center", "Submit an idea"])
    expect(links.map((a) => a.getAttribute("aria-current"))).toEqual([null, "page", null])
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/home", "/decisions", "/submit"])
  })

  it("hides the Decision Center tab from a submitter, as the sidebar does", () => {
    const el = renderShell(es2, session("submitter"))
    expect(Array.from(el.querySelectorAll("nav a")).map((a) => a.textContent)).toEqual(["My work", "Submit an idea"])
  })

  it("uses the optional title for the page title, defaulting to the breadcrumb", () => {
    expect(renderShell(es2, session("admin")).querySelector("h1")?.textContent).toBe("Decision Center")
  })

  it("shows admin items in the user menu for an admin only", async () => {
    for (const [role, expected] of [["admin", true], ["reviewer", false]] as const) {
      const el = renderShell(es2, session(role))
      const trigger = Array.from(el.querySelectorAll("button")).find(
        (b) => b.getAttribute("aria-haspopup") === "menu" && b.textContent?.includes(`${role} user`),
      )!
      await act(async () => {
        trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
      })
      const menu = document.querySelector('[role="menu"]')!
      expect(menu.textContent?.includes("Form configuration")).toBe(expected)
      expect(menu.textContent).toContain("Sign out")
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
      })
    }
  })
})
