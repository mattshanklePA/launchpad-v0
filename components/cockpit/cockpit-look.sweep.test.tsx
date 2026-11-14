// NL-9 (#290): sweep tests. The new look renders only where
// `features.cockpitLook` is on (ES2); uspto, doc and dow keep the sidebar.
// Also guards the kit's own source against drift from the house rules.
import { describe, it, expect, vi, afterEach } from "vitest"
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

// One session object, so a page that keeps it in an effect dependency settles.
const SESSION = { userId: "u1", email: "a@x.demo", name: "Admin user", role: "admin", loggedInAt: "2026-11-14T00:00:00Z" }
vi.mock("@/lib/auth", () => ({
  getSession: () => SESSION,
  hasAdminAccess: () => true,
  isAdmin: () => true,
  logout: vi.fn(),
  ensureSeeded: () => {},
  listUsers: () => [],
  getAllUsers: () => [],
}))

// NL-11 (#312): the page-level sweep renders the real roll-up and admin pages.
vi.mock("@/components/data-provider", () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useDataProvider: () => ({ loaded: true, refetchSubmissions: async () => {} }),
}))

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { uspto } from "@/lib/tenant/uspto"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { es2 } from "@/lib/tenant/es2"
import { render } from "./test-utils"
import RollupPage from "@/app/rollup/page"
import AdminPage from "@/app/admin/page"
import { ClusterMembers } from "@/components/clusters/cluster-members"
import { ClusterHeader } from "@/components/clusters/cluster-header"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { AdvisoryTag } from "@/components/cockpit/advisory-tag"
import { LockedGovernanceChecklist } from "@/components/submissions/locked-governance"
import { DecisionBlock } from "@/components/submissions/record-cockpit"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { tenantCopy } from "@/lib/tenant/copy"
import { act } from "react"

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

// NL-11 (#312): ES2's roll-up, admin, cluster and record pages carry none of
// the old look: no pill, no shadow, no sparkle icon. The only `rounded-full`
// allowed is a K6 track dot. `data-[state=active]:shadow-none` on the admin
// tabs is a variant that switches a shadow off, so only a bare `shadow-` counts.
const sweepHtml = (html: string) => html.replace(/<span data-track-dot[^>]*>/g, "")
function expectNewLook(html: string) {
  const h = sweepHtml(html)
  expect(h).not.toMatch(/rounded-full/)
  expect(h.match(/(^|[\s"'])shadow-[^\s"']*/g)).toBeNull()
  expect(h).not.toMatch(/lucide-(sparkles|wand-sparkles|wand-2)/)
}

const withTenant = (id: string) => {
  process.env.NEXT_PUBLIC_TENANT = id
}
const prevTenant = process.env.NEXT_PUBLIC_TENANT
afterEach(() => {
  if (prevTenant === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = prevTenant
})

function member(id: string, title: string, unit: string): Submission {
  return {
    id,
    submittedAt: "2026-01-01T00:00:00.000Z",
    status: "submitted",
    businessUnit: unit,
    formData: { ...initialFormData, useCaseTitle: title, submitterName: "Andre Duval", useCaseDescription: "Scores vendors. More." } as FormData,
  }
}

describe("cockpit look sweep: roll-up, admin, cluster, record (NL-11)", () => {
  it("es2 roll-up page: no pill, shadow or sparkle, and the lower half is in the kit", () => {
    withTenant("es2")
    const el = render(<RollupPage />)
    expectNewLook(el.innerHTML)
    expect(el.querySelector('[data-cockpit="header-band"]')).not.toBeNull()
  })

  it("es2 admin page: one band, no second title or Sign out, no pill, shadow or sparkle", () => {
    withTenant("es2")
    const el = render(<AdminPage />)
    expectNewLook(el.innerHTML)
    expect(el.textContent).not.toContain("Administration Dashboard")
    expect(Array.from(el.querySelectorAll("button")).some((b) => b.textContent === "Sign out")).toBe(false)
    expect(el.querySelectorAll("h1").length).toBe(1)
    expect(el.querySelector('[role="tablist"]')).not.toBeNull()
  })

  it("es2 settings tab: role badges are K6 square tags and cards are square", async () => {
    withTenant("es2")
    const el = render(<AdminPage />)
    const settings = el.querySelector('[role="tab"][data-state], [role="tab"]') && Array.from(el.querySelectorAll('[role="tab"]')).find((t) => t.textContent === "Settings")
    await act(async () => {
      settings?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
      ;(settings as HTMLElement | undefined)?.click()
    })
    expectNewLook(el.innerHTML)
  })

  it("doc admin page keeps its own title, Sign out and header", () => {
    withTenant("doc")
    const el = render(<AdminPage />)
    expect(el.textContent).toContain("Administration Dashboard")
    expect(Array.from(el.querySelectorAll("button")).some((b) => b.textContent?.includes("Sign out"))).toBe(true)
    expect(el.querySelector('[data-cockpit="header-band"]')).toBeNull()
  })

  it("doc roll-up page keeps the old banner and no kit band", () => {
    withTenant("doc")
    const el = render(<RollupPage />)
    expect(el.querySelector('[data-cockpit="header-band"]')).toBeNull()
    expect(el.textContent).toContain("Export approval report")
    expect(el.innerHTML).toContain("bg-keystone-basalt600")
  })

  it("es2 cluster pieces: no pill, shadow or sparkle", () => {
    withTenant("es2")
    const members = [member("m1", "First idea", "atr"), member("m2", "Second idea", "hrfm")]
    const cluster = { id: "m1", memberIds: ["m1", "m2"], bureaus: ["atr", "hrfm"], maxSimilarity: 0.5 } as never
    const el = render(
      <>
        <ClusterHeader cluster={cluster} members={members} decision={undefined} cockpit />
        <ClusterMembers members={members} currentLeadId="m1" decided={false} onSelectLead={() => {}} cockpit />
        <AdvisoryTag glossary />
      </>,
    )
    expectNewLook(el.innerHTML)
    expect(Array.from(el.querySelectorAll('[data-cockpit="square-tag"]')).map((t) => t.textContent)).toContain("Advisory")
  })

  it("es2 record pieces: no pill, shadow or sparkle", () => {
    withTenant("es2")
    const profile = { functions: {}, overall: "attention", rationale: "r", flags: [] } as never
    const el = render(
      <>
        <LockedGovernanceChecklist
          decision="approved"
          highImpact="not_high_impact"
          fieldsSentence="12 of 12 fields answered."
          cockpit
          resolvedRmf={{ profile, review: undefined, effectiveOverall: "attention", isProposal: true } as never}
          notConfirmedLabel={tenantCopy(es2).rmfNotConfirmedApproved}
        />
        <DecisionBlock
          title="Decision"
          facts={[{ label: "Decision", value: "Approved", tag: true, tone: "healthy" }]}
        />
      </>,
    )
    expectNewLook(el.innerHTML)
  })

  it("Plumb's mark is the Keystone mark on es2 and today's plumb line elsewhere", () => {
    withTenant("es2")
    const on = render(<PlumbMark className="h-4 w-4" />)
    expect(on.innerHTML).toContain("var(--ks-amber)")
    expect(on.innerHTML).not.toContain("#0086CA")
    for (const id of ["uspto", "doc", "dow"]) {
      withTenant(id)
      const off = render(<PlumbMark className="h-4 w-4" />)
      expect(off.innerHTML, id).toContain("#0086CA")
      expect(off.innerHTML, id).not.toContain("var(--ks-amber)")
    }
  })
})
