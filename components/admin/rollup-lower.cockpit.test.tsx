// NL-11 (#312): the lower half of the roll-up in the new look. ES2 only; doc
// keeps today's markup (rounded cards, Badge pills, the yellow cluster box).
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { getTenant } from "@/lib/tenant"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock("@/lib/auth", () => ({
  getSession: () => ({ userId: "u1", email: "a@x.demo", name: "Admin user", role: "admin", loggedInAt: "2026-11-14T00:00:00Z" }),
}))
vi.mock("@/components/data-provider", () => ({ useDataProvider: () => ({ refetchSubmissions: async () => {} }) }))
vi.mock("@/lib/rationalizationActions", () => ({ applyRationalizationDecision: async () => {} }))
vi.mock("@/lib/rationalization", async (orig) => {
  const real = await orig<typeof import("@/lib/rationalization")>()
  return {
    ...real,
    clusterDuplicates: (subs: Submission[]) =>
      subs.length >= 2 ? [{ id: "s1", memberIds: ["s1", "s2"], bureaus: ["atr", "hrfm"], maxSimilarity: 0.82 }] : [],
  }
})

import { ApprovalTransparency } from "./approval-transparency"
import { RationalizationPanel } from "./rationalization-panel"

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  process.env.NEXT_PUBLIC_TENANT = "es2"
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  container?.remove()
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

const sub = (id: string, unit: string, title: string): Submission => ({
  id,
  submittedAt: "2026-01-01T00:00:00.000Z",
  status: "submitted",
  businessUnit: unit,
  formData: { ...initialFormData, useCaseTitle: title } as FormData,
})
const subs = [sub("s1", "atr", "Contract clause finder"), sub("s2", "hrfm", "Clause search")]

const RULES = (html: string) => ({
  roundedFull: /rounded-full/.test(html),
  shadow: /(^|[\s"'])shadow-/.test(html),
})

describe("ApprovalTransparency on ES2 (NL-11)", () => {
  it("is a K3 title and a table, with every office listed and '–' for zero", () => {
    const el = render(<ApprovalTransparency submissions={subs} />)
    expect(el.querySelector('[data-cockpit="section-title"]')?.textContent).toContain("approval transparency")
    const rows = Array.from(el.querySelectorAll("tbody tr")).map((r) => r.querySelector("td")?.textContent)
    for (const o of getTenant().unit.options) expect(rows, o.value).toContain(o.label)
    // Consolidated ERP has no ideas: its row is all dashes.
    const cerp = Array.from(el.querySelectorAll("tbody tr")).find((r) => r.querySelector("td")?.textContent === "Consolidated ERP (C-ERP)")
    expect(cerp?.querySelectorAll("[data-zero]").length).toBe(4)
  })

  it("has no pills, no shadow, and uses K6 tags rather than Badge", () => {
    const html = render(<ApprovalTransparency submissions={subs} />).innerHTML
    expect(RULES(html)).toEqual({ roundedFull: false, shadow: false })
    expect(html).not.toMatch(/bg-(green|amber|gray)-/)
  })
})

describe("RationalizationPanel on ES2 (NL-11)", () => {
  it("is a K3 title and a table with an 'Open the cluster' link, and no yellow box, picker or buttons", () => {
    const el = render(<RationalizationPanel submissions={subs} />)
    expect(el.querySelector('[data-cockpit="section-title"]')?.textContent).toContain("Cross-program office rationalization")
    const link = Array.from(el.querySelectorAll("a")).find((a) => a.textContent === "Open the cluster")
    expect(link?.getAttribute("href")).toContain("s1")
    expect(el.querySelector('button, [role="combobox"]')).toBeNull()
    expect(el.innerHTML).not.toMatch(/amber-50|bg-amber-|rounded-(sm|md|lg|full)/)
    expect(RULES(el.innerHTML)).toEqual({ roundedFull: false, shadow: false })
  })
})

describe("the same panels on doc are unchanged (NL-11)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TENANT = "doc"
  })

  it("rationalization keeps the picker, the buttons and the amber box", () => {
    const docSubs = [sub("s1", getTenant().unit.options[0].value, "A"), sub("s2", getTenant().unit.options[1].value, "B")]
    const el = render(<RationalizationPanel submissions={docSubs} />)
    expect(el.querySelector('[data-cockpit]')).toBeNull()
    expect(el.textContent).toContain("Consolidate into lead")
    expect(el.textContent).toContain("Keep separate")
    expect(el.innerHTML).toContain("bg-amber-50")
  })

  it("approval transparency keeps its rounded card and no kit pieces", () => {
    const docSubs = [sub("s1", getTenant().unit.options[0].value, "A")]
    const el = render(<ApprovalTransparency submissions={docSubs} />)
    expect(el.querySelector('[data-cockpit]')).toBeNull()
    expect(el.innerHTML).toContain("rounded-lg")
  })
})
