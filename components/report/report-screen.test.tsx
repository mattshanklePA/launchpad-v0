import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act } from "react"
import { render, BandHost } from "@/components/cockpit/test-utils"
import { buildReportResponse, type ReportResponse } from "@/lib/portfolioReportApi"
import { es2 } from "@/lib/tenant/es2"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { getBusinessUnit } from "@/lib/reviewWorkflow"
import type { SessionClaims } from "@/lib/session/token"

const push = vi.fn()
const replace = vi.fn()
let search = ""
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/report",
  useSearchParams: () => new URLSearchParams(search),
}))
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
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
// The shell is the real one's job (cockpit-shell.test.tsx); here a stand-in band hosts the page's words.
vi.mock("@/components/dashboard/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <BandHost>{children}</BandHost>,
}))

import { ReportScreen } from "./report-screen"

const NOW = Date.parse("2026-12-10T17:00:00Z")
const admin = { userId: "u", email: "a@es2.demo", name: "A", role: "admin", businessUnit: null, office: null, iat: 0, exp: 0 } as SessionClaims
const body = (office: string | null = null, seed = es2SeedSubmissions): ReportResponse => {
  const r = buildReportResponse(seed, admin, es2, office, NOW)
  if (r.status !== 200) throw new Error("no report")
  return r.body
}
const text = (el: Element | null) => el?.textContent ?? ""
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })
const ok = (b: unknown) => ({ ok: true, status: 200, json: async () => b })

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  process.env.NEXT_PUBLIC_TENANT = "es2"
  mockSession = { userId: "u", email: "a@es2.demo", name: "A", role: "admin", loggedInAt: "" }
  search = ""
  push.mockReset()
  replace.mockReset()
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.NEXT_PUBLIC_TENANT
})

describe("ReportScreen (ES2)", () => {
  it("shows the loading state, then the report under one h1 in the band", async () => {
    let resolve!: (v: unknown) => void
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)))
    const c = render(<ReportScreen />)
    await flush()
    expect(text([...c.querySelectorAll('[role="status"]')].find((e) => text(e).startsWith("Loading")) ?? null)).toContain("Loading the portfolio. Counting 5 program offices.")
    resolve(ok(body()))
    await flush()
    expect(c.querySelectorAll("h1")).toHaveLength(1)
    expect(text(c.querySelector("h1"))).toBe("AI portfolio")
    expect(text(c.querySelector('[data-band="eyebrow"]'))).toBe("CPE ES2 · ENTERPRISE SOFTWARE AND SERVICES")
    expect(fetchMock.mock.calls[0][0]).toBe("/api/report")
  })

  it("puts the labelled picker, a disabled Download PDF with Coming next, and Copy link on the band", async () => {
    fetchMock.mockResolvedValue(ok(body()))
    const c = render(<ReportScreen />)
    await flush()
    const band = c.querySelector('[data-band="right"]')!
    const label = [...band.querySelectorAll("label")].find((l) => text(l).includes("Program office"))!
    const options = [...label.querySelectorAll("option")].map(text)
    expect(options[0]).toBe("All five offices")
    expect(options).toHaveLength(6)
    const pdf = [...band.querySelectorAll("button")].find((b) => text(b) === "Download PDF") as HTMLButtonElement
    expect(pdf.disabled).toBe(true)
    expect(text(band)).toContain("Coming next")
    expect([...band.querySelectorAll("button")].some((b) => text(b) === "Copy link")).toBe(true)
    expect(text(band)).not.toContain("Last 90 days")
  })

  it("picking an office changes the address; the office in the address is what is fetched", async () => {
    fetchMock.mockResolvedValue(ok(body()))
    const c = render(<ReportScreen />)
    await flush()
    const select = c.querySelector('[data-band="right"] select') as HTMLSelectElement
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, "hrfm")
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    expect(push).toHaveBeenCalledWith("/report?office=hrfm")
  })

  it("fetches the office named in the address", async () => {
    search = "office=hrfm"
    fetchMock.mockResolvedValue(ok(body("hrfm")))
    render(<ReportScreen />)
    await flush()
    expect(fetchMock.mock.calls[0][0]).toBe("/api/report?office=hrfm")
  })

  it("copies the address when Copy link is pressed", async () => {
    fetchMock.mockResolvedValue(ok(body()))
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    const c = render(<ReportScreen />)
    await flush()
    const btn = [...c.querySelectorAll("button")].find((b) => text(b) === "Copy link")!
    await act(async () => void btn.click())
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(text(c)).toContain("Link copied")
  })

  it("an office with no ideas says so plainly and offers Back to all offices", async () => {
    search = "office=cerp"
    const gone = es2SeedSubmissions.filter((s) => getBusinessUnit(s) !== "cerp")
    fetchMock.mockResolvedValue(ok(body("cerp", gone)))
    const c = render(<ReportScreen />)
    await flush()
    expect(text(c.querySelector("h2"))).toBe(`${es2.unit.options.find((o) => o.value === "cerp")!.label} has sent in 0 of ${gone.length} ideas`)
    expect(text(c)).toContain("No AI ideas from this office yet.")
    const back = [...c.querySelectorAll("button")].find((b) => text(b) === "Back to all 5 offices")!
    act(() => void back.click())
    expect(push).toHaveBeenCalledWith("/report")
  })

  it("could not load: says so and offers Try again only, which asks again", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    const c = render(<ReportScreen />)
    await flush()
    const alert = c.querySelector('[role="alert"]')!
    expect(text(alert)).toContain("The portfolio did not load. Nothing was changed.")
    expect([...alert.querySelectorAll("button")].map(text)).toEqual(["Try again"])
    expect(text(c)).not.toContain("Download last PDF")
    fetchMock.mockResolvedValueOnce(ok(body()))
    act(() => void alert.querySelector("button")!.click())
    await flush()
    expect(c.querySelector('[role="alert"]')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("sends a signed-in submitter home, not to the login page, and never fetches", async () => {
    mockSession = { userId: "s", email: "s@es2.demo", name: "S", role: "submitter", loggedInAt: "" }
    const c = render(<ReportScreen />)
    await flush()
    expect(replace).toHaveBeenCalledWith("/home")
    expect(fetchMock).not.toHaveBeenCalled()
    expect(c.querySelector("h1")).toBeNull()
  })

  it("a reviewer limited to one office gets no All offices choice", async () => {
    fetchMock.mockResolvedValue(
      ok({ ...body("atr"), scoped: true, offices: [{ id: "atr", label: "AT&R" }] }),
    )
    const c = render(<ReportScreen />)
    await flush()
    const options = [...c.querySelectorAll('[data-band="right"] option')].map(text)
    expect(options).toEqual(["AT&R"])
  })
})
