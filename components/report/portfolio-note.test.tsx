// F5-5 (#322): Plumb's read of the portfolio on /report, and the Decision
// Center briefing kept in the report. The assistant action is mocked.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act } from "react"
import { render, BandHost } from "@/components/cockpit/test-utils"
import { buildReportResponse, type ReportResponse } from "@/lib/portfolioReportApi"
import { es2 } from "@/lib/tenant/es2"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import type { SessionClaims } from "@/lib/session/token"
import { resetPortfolioReportSession } from "@/lib/portfolioReportSession"

let search = ""
const searchListeners = new Set<() => void>()
const navigate = (to: string) => {
  search = to.includes("?") ? to.split("?")[1] : ""
  searchListeners.forEach((fn) => fn())
}
// The same mounted screen follows the address, as in the app.
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore, useMemo } = await import("react")
  return {
    useRouter: () => useMemo(() => ({ push: navigate, replace: navigate }), []),
    usePathname: () => "/report",
    useSearchParams: () => {
      const current = useSyncExternalStore(
        (fn) => (searchListeners.add(fn), () => void searchListeners.delete(fn)),
        () => search,
        () => search,
      )
      return useMemo(() => new URLSearchParams(current), [current])
    },
  }
})
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
// One stable session object: a new one on every call makes the screen re-render forever.
const mockSession = { userId: "u", email: "a@es2.demo", name: "A", role: "admin", loggedInAt: "" }
vi.mock("@/lib/auth", () => ({
  ensureSeeded: () => {},
  getSession: () => mockSession,
  hasAdminAccess: () => true,
}))
vi.mock("@/components/data-provider", () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useDataProvider: () => ({ loaded: true }),
}))
vi.mock("@/components/dashboard/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <BandHost>{children}</BandHost>,
}))
const pdfMock = vi.fn()
vi.mock("@/lib/portfolioReportPdf", () => ({ generatePortfolioReportPDF: (...a: unknown[]) => pdfMock(...a) }))
vi.mock("@/lib/portfolioReportCsv", () => ({ downloadPortfolioReportCsv: vi.fn() }))
const writeNote = vi.fn()
vi.mock("@/app/report-actions", () => ({ writePortfolioNote: (...a: unknown[]) => writeNote(...a) }))
const compareSubmissions = vi.fn()
vi.mock("@/app/admin/compare-actions", () => ({ compareSubmissions: (...a: unknown[]) => compareSubmissions(...a) }))

import { ReportScreen } from "./report-screen"
import { ComparisonView } from "@/components/admin/comparison-view"

const NOW = Date.parse("2026-12-10T17:00:00Z")
const admin = { userId: "u", email: "a@es2.demo", name: "A", role: "admin", businessUnit: null, office: null, iat: 0, exp: 0 } as SessionClaims
const body = (office: string | null = null): ReportResponse => {
  const r = buildReportResponse(es2SeedSubmissions, admin, es2, office, NOW)
  if (r.status !== 200) throw new Error("no report")
  return r.body
}
const text = (el: Element | null) => el?.textContent ?? ""
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })
const ok = (b: unknown) => ({ ok: true, status: 200, json: async () => b })
const button = (c: Element, label: string) => [...c.querySelectorAll("button")].find((b) => text(b) === label) as HTMLButtonElement | undefined
const press = async (el: Element | undefined) => {
  await act(async () => void el!.dispatchEvent(new MouseEvent("click", { bubbles: true })))
  await flush()
}
const NOTE = { status: "ok", note: "Three offices are each building the same thing.", writtenAt: Date.parse("2026-12-10T17:07:00Z") }
const noteSection = (c: Element) => c.querySelector('section[aria-label="Plumb\'s portfolio note"]')!

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  process.env.NEXT_PUBLIC_TENANT = "es2"
  search = ""
  searchListeners.clear()
  fetchMock = vi.fn().mockResolvedValue(ok(body()))
  vi.stubGlobal("fetch", fetchMock)
  writeNote.mockReset()
  compareSubmissions.mockReset()
  pdfMock.mockReset()
  resetPortfolioReportSession()
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.NEXT_PUBLIC_TENANT
})

const ASK = "Ask Plumb for a read"
const EXPLAINER = "Plumb can read this report and point out what stands out. Advice only."
const asked = async (c: Element) => press(button(noteSection(c), ASK))

describe("Plumb's read on /report is written on a button press", () => {
  it("opening /report makes no call, shows the numbers and the one-line explainer with the button", async () => {
    const c = render(<ReportScreen />)
    await flush()
    expect(writeNote).not.toHaveBeenCalled()
    expect(c.querySelectorAll('[data-cockpit="measure-panel"]')).toHaveLength(3)
    expect(text(noteSection(c))).toContain(EXPLAINER)
    expect(button(noteSection(c), ASK)!.disabled).toBe(false)
  })

  it("one press makes exactly one call and shows the note with the real time", async () => {
    writeNote.mockResolvedValue(NOTE)
    const c = render(<ReportScreen />)
    await flush()
    await asked(c)
    expect(writeNote).toHaveBeenCalledTimes(1)
    expect(writeNote).toHaveBeenCalledWith("")
    const section = noteSection(c)
    expect(text(section)).toContain(NOTE.note)
    expect(text(section)).toContain("Plumb's read of the portfolio · advice, not a decision · written 10 Dec 2026, 12:07")
    expect(text(section)).not.toContain(EXPLAINER)
    expect(button(section, "Ask again")).toBeDefined()
    expect(button(section, ASK)).toBeUndefined()
  })

  it("while waiting the button is disabled, reads Reading the report, and a second press makes no call", async () => {
    writeNote.mockReturnValue(new Promise(() => {}))
    const c = render(<ReportScreen />)
    await flush()
    await asked(c)
    const waiting = button(noteSection(c), "Reading the report")!
    expect(waiting.disabled).toBe(true)
    expect(c.querySelectorAll('[data-cockpit="measure-panel"]')).toHaveLength(3)
    expect(button(c, "Download PDF")!.disabled).toBe(false)
    await press(waiting)
    expect(writeNote).toHaveBeenCalledTimes(1)
  })

  it("asks for the office in the address, only on a press", async () => {
    search = "office=hrfm"
    fetchMock.mockResolvedValue(ok(body("hrfm")))
    writeNote.mockResolvedValue(NOTE)
    const c = render(<ReportScreen />)
    await flush()
    expect(writeNote).not.toHaveBeenCalled()
    await asked(c)
    expect(writeNote).toHaveBeenCalledWith("hrfm")
  })

  it("changing the office makes no call and clears a note that was showing", async () => {
    writeNote.mockResolvedValue(NOTE)
    const c = render(<ReportScreen />)
    await flush()
    await asked(c)
    expect(text(noteSection(c))).toContain(NOTE.note)
    const select = c.querySelector("select") as HTMLSelectElement
    fetchMock.mockResolvedValue(ok(body("hrfm")))
    await act(async () => {
      select.value = "hrfm"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flush()
    expect(writeNote).toHaveBeenCalledTimes(1)
    expect(text(noteSection(c))).not.toContain(NOTE.note)
    expect(button(noteSection(c), ASK)).toBeDefined()
  })

  it("when the note is not available, says so, keeps the numbers, and Try again asks again", async () => {
    writeNote.mockResolvedValueOnce({ status: "unavailable" })
    const c = render(<ReportScreen />)
    await flush()
    await asked(c)
    expect(text(noteSection(c))).toContain("Plumb's read is not available right now. The numbers above are complete.")
    expect(c.querySelectorAll('[data-cockpit="measure-panel"]')).toHaveLength(3)
    writeNote.mockResolvedValueOnce(NOTE)
    await press(button(noteSection(c), "Try again"))
    expect(text(noteSection(c))).toContain(NOTE.note)
    expect(writeNote).toHaveBeenCalledTimes(2)
  })

  it("a call that throws is the same not-available state, never an error on screen", async () => {
    writeNote.mockRejectedValue(new Error("boom"))
    const c = render(<ReportScreen />)
    await flush()
    await asked(c)
    expect(text(noteSection(c))).toContain("Plumb's read is not available right now.")
  })

  it("Ask again replaces the note", async () => {
    writeNote.mockResolvedValueOnce(NOTE)
    const c = render(<ReportScreen />)
    await flush()
    await asked(c)
    writeNote.mockResolvedValueOnce({ ...NOTE, note: "A second, different read of the portfolio." })
    await press(button(noteSection(c), "Ask again"))
    expect(text(noteSection(c))).toContain("A second, different read of the portfolio.")
    expect(text(noteSection(c))).not.toContain(NOTE.note)
  })

  it("Download PDF hands over the note and the time it was written, once asked for", async () => {
    writeNote.mockResolvedValue(NOTE)
    const c = render(<ReportScreen />)
    await flush()
    await asked(c)
    await press(button(c, "Download PDF"))
    const opts = pdfMock.mock.calls[0][1]
    expect(opts.plumbNote).toBe(NOTE.note)
    expect(opts.plumbNoteAt).toBe(NOTE.writtenAt)
    expect(opts.briefing).toBeUndefined()
  })

  it("Download PDF with no note asked for sends no note", async () => {
    const c = render(<ReportScreen />)
    await flush()
    await press(button(c, "Download PDF"))
    expect(pdfMock.mock.calls[0][1].plumbNote).toBeUndefined()
    expect(writeNote).not.toHaveBeenCalled()
  })
})

function sub(id: string, title: string): Submission {
  return {
    id,
    submittedAt: "2026-08-18T00:00:00.000Z",
    status: "approved",
    formData: { ...initialFormData, useCaseTitle: title, submitterName: "Avery Lang", submitterOffice: "atr", readinessScore: "ready" } as FormData,
  }
}
const BRIEFING = {
  recommendation: { fundId: "a", headline: "Fund the scoring tool first." },
  differ: "They serve different offices.",
  portfolioGap: "None has a measured baseline.",
  perSubmission: [
    { id: "a", title: "Vendor Scoring", verdict: "fund_now", oneLine: "Scores past performance.", gap: "No baseline." },
    { id: "b", title: "Contract Triage", verdict: "hold", oneLine: "Sorts files.", gap: "No owner." },
  ],
}
const subs = [sub("a", "Vendor Scoring"), sub("b", "Contract Triage")]

describe("the Decision Center briefing in the report", () => {
  it("offers Add to portfolio report only once a briefing exists", async () => {
    compareSubmissions.mockResolvedValue(BRIEFING)
    const c = render(<ComparisonView submissions={subs} onClose={() => {}} />)
    expect(button(c, "Add to portfolio report")).toBeUndefined()
    await press(button(c, "Generate Executive Briefing"))
    expect(button(c, "Add to portfolio report")).toBeDefined()
  })

  it("Add puts the briefing section on /report in the same session; Remove takes it away", async () => {
    compareSubmissions.mockResolvedValue(BRIEFING)
    writeNote.mockResolvedValue(NOTE)
    const view = render(<ComparisonView submissions={subs} onClose={() => {}} />)
    await press(button(view, "Generate Executive Briefing"))
    await press(button(view, "Add to portfolio report"))
    expect(text(view)).toContain("Added to the portfolio report")

    const c = render(<ReportScreen />)
    await flush()
    const section = c.querySelector('section[aria-label="Executive briefing from the Decision Center"]')!
    expect(section).not.toBeNull()
    expect(text(section)).toContain("Executive briefing from the Decision Center")
    expect(text(section)).toContain("Ideas compared: Vendor Scoring, Contract Triage")
    expect(text(section)).toMatch(/written \d{1,2} \w{3} \d{4}, \d{2}:\d{2}/)
    expect(text(section)).toContain("Fund the scoring tool first.")
    // Under Plumb's note.
    const order = [...c.querySelectorAll("section")].map((s) => s.getAttribute("aria-label"))
    expect(order.indexOf("Executive briefing from the Decision Center")).toBe(order.indexOf("Plumb's portfolio note") + 1)

    await press(button(c, "Download PDF"))
    expect(pdfMock.mock.calls[0][1].briefing.titles).toEqual(["Vendor Scoring", "Contract Triage"])

    await press(button(section, "Remove"))
    expect(c.querySelector('section[aria-label="Executive briefing from the Decision Center"]')).toBeNull()
  })

  it("with no briefing added, the report has no briefing section", async () => {
    writeNote.mockResolvedValue(NOTE)
    const c = render(<ReportScreen />)
    await flush()
    expect(c.querySelector('section[aria-label="Executive briefing from the Decision Center"]')).toBeNull()
  })
})

describe("with the switch off the comparison view is as today", () => {
  it("doc: no Add to portfolio report, and the same markup as before", async () => {
    process.env.NEXT_PUBLIC_TENANT = "doc"
    compareSubmissions.mockResolvedValue(BRIEFING)
    const c = render(<ComparisonView submissions={subs} onClose={() => {}} />)
    await press(button(c, "Generate Executive Briefing"))
    expect(text(c)).toContain("Executive Comparative Briefing")
    expect(text(c)).not.toContain("portfolio report")
    expect(button(c, "Add to portfolio report")).toBeUndefined()
  })
})
