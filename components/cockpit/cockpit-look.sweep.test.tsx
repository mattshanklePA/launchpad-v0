// NL-9 (#290): sweep tests. The new look renders only where
// `features.cockpitLook` is on (ES2); uspto, doc and dow keep the sidebar.
// Also guards the kit's own source against drift from the house rules.
import { describe, it, expect, vi } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => "/home",
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

vi.mock("@/lib/auth", () => ({
  getSession: () => ({ userId: "u1", email: "a@x.demo", name: "Admin user", role: "admin", loggedInAt: "2026-11-14T00:00:00Z" }),
  hasAdminAccess: () => true,
  isAdmin: () => true,
  logout: vi.fn(),
}))

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { uspto } from "@/lib/tenant/uspto"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { es2 } from "@/lib/tenant/es2"
import { render } from "./test-utils"

// One breadcrumb per signed-in page that mounts DashboardShell.
const PAGES = ["My work", "My ideas", "Decision Center", "Submit an idea", "Roll-up", "Duplicate cluster"]

function shell(tenant: typeof es2, breadcrumb: string) {
  return render(
    <DashboardShell
      baseScope={{ level: "department" }}
      hierarchy={{ bureaus: [] }}
      selection={null}
      onSelect={() => {}}
      breadcrumb={breadcrumb}
      tenant={tenant}
    >
      <div>content</div>
    </DashboardShell>,
  )
}

describe("cockpit look sweep: shell by tenant (NL-9)", () => {
  for (const page of PAGES) {
    it(`es2 renders the band and the sample-data strip, and no sidebar, on "${page}"`, () => {
      const el = shell(es2, page)
      expect(el.querySelector('[data-cockpit="header-band"]')).not.toBeNull()
      expect(el.querySelector('[data-cockpit="sample-data-strip"]')).not.toBeNull()
      expect(el.querySelector('[data-sidebar], aside')).toBeNull()
    })

    for (const [name, tenant] of [["uspto", uspto], ["doc", doc], ["dow", dow]] as const) {
      it(`${name} renders the sidebar and no band on "${page}"`, () => {
        const el = shell(tenant, page)
        expect(el.querySelector('[data-cockpit="header-band"]')).toBeNull()
        expect(el.querySelector('[data-cockpit="sample-data-strip"]')).toBeNull()
        expect(el.textContent).toContain("Workspace")
      })
    }
  }
})

describe("cockpit kit source guard (NL-9)", () => {
  const dir = path.resolve(__dirname)
  const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
  const tokenHexes = new Set(
    (readFileSync(path.resolve(__dirname, "../../app/styles/keystone/colors.css"), "utf8").match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map((h) =>
      h.toLowerCase(),
    ),
  )
  // Drop comments so issue numbers like "#283" are not read as colors.
  const code = (f: string) =>
    readFileSync(path.join(dir, f), "utf8")
      .split("\n")
      .map((l) => l.replace(/\/\/.*$/, ""))
      .join("\n")

  it("finds the kit files", () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it("uses no shadow- class", () => {
    for (const f of files) expect(code(f), f).not.toMatch(/\bshadow-/)
  })

  it("uses only Keystone token hex colors", () => {
    for (const f of files) {
      for (const hex of code(f).match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        expect(tokenHexes.has(hex.toLowerCase()), `${f}: ${hex}`).toBe(true)
      }
    }
  })

  it("uses rounded-full only on the K6 track dots", () => {
    for (const f of files) {
      const lines = code(f).split("\n").filter((l) => l.includes("rounded-full"))
      if (f === "square-tag.tsx") expect(lines.length).toBe(2)
      else expect(lines, f).toEqual([])
    }
  })
})
