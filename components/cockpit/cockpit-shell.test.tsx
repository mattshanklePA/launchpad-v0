import { describe, it, expect, beforeEach, vi } from "vitest"
import { act } from "react"

let mockPath = "/decisions"
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => mockPath,
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
import { uspto } from "@/lib/tenant/uspto"
import { dow } from "@/lib/tenant/dow"
import { tabIsLit, showOfficePicker } from "./cockpit-shell"
import { useCockpitBand } from "./band-context"
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
  mockPath = "/decisions"
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
    expect(links.map((a) => a.textContent)).toEqual(["Portfolio", "My work", "Decision Center", "Submit an idea"])
    expect(links.map((a) => a.getAttribute("aria-current"))).toEqual([null, null, "page", null])
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/report", "/home", "/decisions", "/submit"])
  })

  it("hides the Decision Center tab from a submitter, as the sidebar does", () => {
    const el = renderShell(es2, session("submitter"))
    expect(Array.from(el.querySelectorAll("nav a")).map((a) => a.textContent)).toEqual(["My work", "Submit an idea"])
  })

  it("shows the Portfolio tab first to a reviewer too (F5-3, #320)", () => {
    const el = renderShell(es2, session("reviewer"))
    expect(Array.from(el.querySelectorAll("nav a")).map((a) => a.textContent)).toEqual(["Portfolio", "My work", "Decision Center", "Submit an idea"])
  })

  it("with the switch off, the tabs are exactly as before (F5-3, #320)", () => {
    const off = { ...es2, features: { ...es2.features, portfolioReport: false } }
    const admin = Array.from(renderShell(off, session("admin")).querySelectorAll("nav a")).map((a) => a.textContent)
    expect(admin).toEqual(["My work", "Decision Center", "Submit an idea"])
    const el = renderShell(off, session("admin"))
    expect(Array.from(el.querySelectorAll("header a")).find((a) => a.textContent === "Status by office")?.getAttribute("href")).toBe("/rollup")
  })

  it("lights Portfolio on /report and nothing else (F5-3, #320)", () => {
    mockPath = "/report"
    expect(Array.from(renderShell(es2, session("admin")).querySelectorAll("nav a[aria-current]")).map((a) => a.textContent)).toEqual(["Portfolio"])
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

// NL-10 (#311): one band, one width, always a lit tab.
describe("CockpitShell, one band and one width (NL-10, #311)", () => {
  const lit = (el: HTMLElement) =>
    Array.from(el.querySelectorAll("nav a[aria-current]")).map((a) => a.textContent)

  it("lights My work on a record, a cluster and the roll-up", () => {
    for (const path of ["/submissions/s1", "/clusters/c1", "/rollup", "/home"]) {
      mockPath = path
      expect(lit(renderShell(es2, session("admin"))), path).toEqual(["My work"])
    }
  })

  it("lights nothing on admin and My ideas, which name themselves in the band eyebrow", () => {
    for (const path of ["/admin", "/my-ideas"]) {
      mockPath = path
      expect(lit(renderShell(es2, session("admin"))), path).toEqual([])
    }
  })

  it("keeps Decision Center and Submit lit on their own pages", () => {
    mockPath = "/submit"
    expect(lit(renderShell(es2, session("admin")))).toEqual(["Submit an idea"])
    mockPath = "/decisions"
    expect(lit(renderShell(es2, session("admin")))).toEqual(["Decision Center"])
  })

  it("tabIsLit matches whole path segments only", () => {
    expect(tabIsLit("/submissions-x", "/home")).toBe(false)
    expect(tabIsLit(null, "/home")).toBe(false)
  })

  it("links nothing to /rollup on es2, for every role (F5-3, #320)", () => {
    for (const role of ["admin", "reviewer", "submitter"] as const) {
      const el = renderShell(es2, session(role))
      expect(Array.from(el.querySelectorAll("a")).some((a) => a.getAttribute("href") === "/rollup"), role).toBe(false)
      expect(Array.from(el.querySelectorAll("a")).some((a) => a.textContent === "Status by office"), role).toBe(false)
    }
  })

  it("has one band and one centered column", () => {
    const el = renderShell(es2, session("admin"))
    expect(el.querySelectorAll('[data-cockpit="header-band"]').length).toBe(1)
    const column = el.querySelector('[data-cockpit="page-column"]')!
    expect(column.className).toContain("mx-auto")
    expect(column.className).toContain("max-w-")
  })

  it("lets a page put its eyebrow and title in that one band", () => {
    function Page() {
      useCockpitBand({ eyebrow: "CENSUS · AB12 · IN REVIEW", title: "A long idea title with no cut-off at all" })
      return <p>body</p>
    }
    mockSession = session("admin")
    const el = render(
      <DashboardShell baseScope={{ level: "department" }} hierarchy={{ bureaus: [] }} selection={null} onSelect={() => {}} breadcrumb="Whatever" tenant={es2}>
        <Page />
      </DashboardShell>,
    )
    expect(el.querySelectorAll('[data-cockpit="header-band"]').length).toBe(1)
    expect(el.querySelector("h1")?.textContent).toBe("A long idea title with no cut-off at all")
    expect(el.querySelector("header")?.textContent).toContain("CENSUS · AB12 · IN REVIEW")
  })

  it("doc, uspto and dow: no band, no Status by office link, no cockpit column, band hook does nothing", () => {
    function Page() {
      useCockpitBand({ eyebrow: "X", title: "Y" })
      return <p>body</p>
    }
    for (const tenant of [doc, uspto, dow]) {
      mockSession = session("admin")
      const el = render(
        <DashboardShell baseScope={{ level: "department" }} hierarchy={{ bureaus: [] }} selection={null} onSelect={() => {}} breadcrumb="Roll-up" tenant={tenant}>
          <Page />
        </DashboardShell>,
      )
      expect(el.querySelector("[data-cockpit]"), tenant.id).toBeNull()
      expect(Array.from(el.querySelectorAll("a")).some((a) => a.textContent === "Status by office"), tenant.id).toBe(false)
    }
  })
})

// NL-14 (#332): no dead Program Office button for submitters (ES2).
describe("CockpitShell office picker (NL-14, #332)", () => {
  const hierarchy = {
    bureaus: [
      { value: "a", label: "Office A", offices: [] },
      { value: "b", label: "Office B", offices: [] },
    ],
  }
  const picker = (el: HTMLElement) =>
    Array.from(el.querySelectorAll("header button")).find((b) => b.textContent?.includes("Program Office"))
  const shell = (tenant: TenantConfig, s: MockSession, h = hierarchy) => {
    mockSession = s
    return render(
      <DashboardShell baseScope={{ level: "department" }} hierarchy={h} selection={null} onSelect={() => {}} breadcrumb="My work" tenant={tenant}>
        <div>content</div>
      </DashboardShell>,
    )
  }

  it("shows a submitter no picker on es2", () => {
    expect(picker(shell(es2, session("submitter")))).toBeUndefined()
  })

  it("shows an enterprise admin the picker with all offices on es2", async () => {
    const el = shell(es2, session("admin"))
    const trigger = picker(el)!
    expect(trigger).toBeDefined()
    await act(async () => {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
    })
    const menu = document.querySelector('[role="menu"]')!
    expect(menu.textContent).toContain("Office A")
    expect(menu.textContent).toContain("Office B")
  })

  it("shows nothing when the picker would hold a single option", () => {
    expect(picker(shell(es2, session("admin"), { bureaus: [] }))).toBeUndefined()
  })

  it("showOfficePicker needs a reviewer or admin and more than one place to look", () => {
    expect(showOfficePicker(session("admin"), hierarchy)).toBe(true)
    expect(showOfficePicker(session("reviewer"), hierarchy)).toBe(true)
    expect(showOfficePicker(session("submitter"), hierarchy)).toBe(false)
    expect(showOfficePicker(null, hierarchy)).toBe(false)
    expect(showOfficePicker(session("admin"), { bureaus: [] })).toBe(false)
  })

  it("doc is unchanged: sidebar layout, no band, no cockpit picker", () => {
    const el = shell(doc, session("submitter"))
    expect(el.querySelector("[data-cockpit]")).toBeNull()
    expect(el.textContent).toContain("Workspace")
  })

  // NL-15 (#335): on /report the report's own office filter is the one control.
  it("hides the band's picker on /report and keeps it on every other page (es2)", () => {
    mockPath = "/report"
    expect(picker(shell(es2, session("admin")))).toBeUndefined()
    mockPath = "/home"
    expect(picker(shell(es2, session("admin")))).toBeDefined()
    mockPath = "/decisions"
    expect(picker(shell(es2, session("admin")))).toBeDefined()
  })

  it("showOfficePicker takes the path: off on /report only", () => {
    expect(showOfficePicker(session("admin"), hierarchy, "/report")).toBe(false)
    expect(showOfficePicker(session("admin"), hierarchy, "/report/")).toBe(false)
    expect(showOfficePicker(session("admin"), hierarchy, "/reports-archive")).toBe(true)
    expect(showOfficePicker(session("admin"), hierarchy, "/home")).toBe(true)
    expect(showOfficePicker(session("admin"), hierarchy, null)).toBe(true)
  })

  it("doc on /report: no band, no cockpit picker, sidebar unchanged", () => {
    mockPath = "/report"
    const el = shell(doc, session("admin"))
    expect(el.querySelector("[data-cockpit]")).toBeNull()
    expect(el.textContent).toContain("Workspace")
  })
})

