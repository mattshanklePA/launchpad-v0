// F6-3 (#343): the sent page reads the saved record (cache + data provider), so
// a reload shows the same page; the office number comes from the server action.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { BandHost } from "@/components/cockpit/test-utils"
import { setCachedSubmissions } from "@/lib/dataCache"
import { es2 } from "@/lib/tenant/es2"
import { uspto } from "@/lib/tenant/uspto"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { tenantCopy } from "@/lib/tenant/copy"

let paramsId = "sub-1"
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: paramsId }),
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))
vi.mock("@/components/data-provider", () => ({ useDataProvider: () => ({ loaded: true }) }))
vi.mock("@/components/dashboard/dashboard-shell", () => ({}))
let answer: unknown = { status: "days", days: 9 }
const ask = vi.fn(async (_id: string) => answer)
vi.mock("@/app/sent-actions", () => ({ getOfficeDecisionTime: (id: string) => ask(id) }))

import SentPage from "./page"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

const idea = {
  id: "sub-1",
  submittedAt: "2026-11-18T10:00:00Z",
  status: "submitted",
  businessUnit: "atr",
  formData: { useCaseTitle: "Flag incomplete closeout files", submitterOffice: "atr", submitterSubOffice: "acws" },
}

async function mount() {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(
      <BandHost>
        <SentPage />
      </BandHost>,
    )
  })
  return container
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_TENANT = "es2"
  paramsId = "sub-1"
  answer = { status: "days", days: 9 }
  ask.mockClear()
  setCachedSubmissions([idea])
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  container?.remove()
  container = null
  root = null
  delete process.env.NEXT_PUBLIC_TENANT
})

describe("the sent page", () => {
  it("shows the tag, title, office and program, reviewer, time and what happens now", async () => {
    const el = await mount()
    const t = el.textContent || ""
    expect(t).toContain("Sent for review")
    expect(t).toContain("Flag incomplete closeout files")
    expect(t).toContain("AT&R · Army Contract Writing System (ACWS)")
    expect(t).toContain("The AT&R reviewer")
    expect(t).toContain("9 days, last 90 days")
    expect(t).toContain("Plumb reads it first and flags what a reviewer would ask. Check My work for anything a reviewer needs from you.")
    expect(ask).toHaveBeenCalledWith("sub-1")
  })

  it("says 'Not enough decisions yet' when the server has too few, and when it refuses", async () => {
    answer = { status: "not-enough" }
    expect((await mount()).textContent).toContain("Not enough decisions yet")
  })

  it("has no record code and no mention of email", async () => {
    const t = (await mount()).textContent || ""
    expect(t).not.toMatch(/email/i)
    expect(t).not.toMatch(/reference/i)
    expect(t).not.toContain("sub-1")
    expect(t).not.toMatch(/\bKS-\d+/)
  })

  it("'See your idea' opens that idea and 'Submit another idea' opens a new one", async () => {
    const el = await mount()
    const link = (name: string) => Array.from(el.querySelectorAll("a")).find((a) => a.textContent === name)
    expect(link("See your idea")?.getAttribute("href")).toBe("/submissions/sub-1")
    expect(link("Submit another idea")?.getAttribute("href")).toBe("/submit")
  })

  it("shows the same page again on a reload (a fresh mount over the same saved record)", async () => {
    const first = (await mount()).textContent
    act(() => root!.unmount())
    container?.remove()
    const second = (await mount()).textContent
    expect(second).toBe(first)
    expect(second).not.toMatch(/not found/i)
  })

  it("says so when the saved record is missing, instead of crashing", async () => {
    paramsId = "nope"
    expect((await mount()).textContent).toContain("Your idea could not be found.")
    expect(ask).not.toHaveBeenCalled()
  })

  it("is not found on a site without the sent page", () => {
    process.env.NEXT_PUBLIC_TENANT = "doc"
    expect(() => SentPage()).toThrow("NEXT_NOT_FOUND")
  })
})

describe("F6-3 tenant parity", () => {
  it("only ES2 has the sent page and its words", () => {
    expect(es2.features.sentPage).toBe(true)
    for (const t of [uspto, doc, dow]) {
      expect(t.features.sentPage).toBeFalsy()
      const c = tenantCopy(t)
      for (const k of ["sentThanks", "sentTag", "sentOfficeLabel", "sentNextLabel", "sentTimeLabel", "sentNowLabel", "sentNowBody", "sentSee", "sentAnother", "sentNotEnough", "sentMissing"] as const) {
        expect(c[k], `${t.id} ${k}`).toBe("")
      }
    }
    expect(tenantCopy(es2).sentThanks).toBe("Thank you. Your idea is in.")
  })
})
