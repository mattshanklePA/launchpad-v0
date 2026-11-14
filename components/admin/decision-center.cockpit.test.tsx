// NL-5 (#286): Decision Center and compare on ES2 (cockpitLook) in the cockpit
// kit, and the doc tenant still rendering the old markup.

import { describe, it, expect, afterEach, vi } from "vitest"
import { act } from "react"
import { DecisionCenter, decisionHeadline } from "./decision-center"
import { ComparisonView } from "./comparison-view"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { render } from "@/components/cockpit/test-utils"

vi.mock("@/app/admin/compare-actions", () => ({ compareSubmissions: vi.fn() }))

const prev = process.env.NEXT_PUBLIC_TENANT
afterEach(() => {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = prev
})

function sub(id: string, overrides: Partial<FormData> = {}, submittedAt = "2026-08-18T00:00:00.000Z"): Submission {
  return {
    id,
    submittedAt,
    status: "approved",
    formData: {
      ...initialFormData,
      useCaseTitle: `Use case ${id}`,
      submitterName: "Avery Lang",
      submitterOffice: "patents",
      readinessScore: "ready",
      impactedUsersCount: "50_500",
      costSavings: "50k_250k",
      alignmentSummary: "Serves the audit-readiness objective.",
      feasibilitySummary: "Classical ML on structured records.",
      ...overrides,
    } as FormData,
  }
}
const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })))

describe("Decision Center on ES2", () => {
  it("renders the K5 table in today's order, with today's values and selection rules", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const subs = [
      sub("a", { readinessScore: "early_stage", useCaseTitle: "Early" }),
      sub("b", { readinessScore: "ready", useCaseTitle: "Ready" }),
      sub("c", { readinessScore: "needs_work", useCaseTitle: "Needs" }),
    ]
    const el = render(<DecisionCenter submissions={subs} />)
    expect(el.querySelector('[data-cockpit="ranked-table"]')).not.toBeNull()
    expect(el.querySelector('[data-cockpit="section-title"]')).not.toBeNull()
    const rows = Array.from(el.querySelectorAll("tbody tr"))
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Ready"),
      expect.stringContaining("Needs"),
      expect.stringContaining("Early"),
    ])
    expect(el.querySelectorAll('[data-cockpit="square-tag"]').length).toBeGreaterThan(0)
    expect(el.textContent).toContain("50–500 users")

    const compare = () => Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Compare selected")!
    const boxes = Array.from(el.querySelectorAll('button[role="checkbox"]'))
    expect(compare().disabled).toBe(true)
    click(boxes[0])
    expect(el.textContent).toContain("1 selected · pick 1 more to compare")
    // Checking a box does not open the row.
    expect(el.querySelectorAll("tbody tr[aria-expanded=true]").length).toBe(0)
    click(boxes[1])
    expect(compare().disabled).toBe(false)
    click(compare())
    expect(el.textContent).toContain("Decision Center · compare")
    expect(el.querySelector('[data-cockpit="section-title"]')).not.toBeNull()
  })

  it("opens a row in place with the reason fields and the record link", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const el = render(<DecisionCenter submissions={[sub("a")]} />)
    const row = el.querySelector("tbody tr[tabindex]")!
    click(row)
    expect(el.textContent).toContain("Serves the audit-readiness objective.")
    expect(el.textContent).toContain("Classical ML on structured records.")
    expect(el.querySelector('a[href="/submissions/a"]')?.textContent).toBe("Open submission")
  })

  it("caps selection at four", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const el = render(<DecisionCenter submissions={["a", "b", "c", "d", "e"].map((id) => sub(id))} />)
    for (const cb of Array.from(el.querySelectorAll('button[role="checkbox"]'))) click(cb)
    expect(el.textContent).toContain("4 selected · max 4")
  })

  it("keeps the plain empty state", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const el = render(<DecisionCenter submissions={[]} />)
    expect(el.textContent).toContain("Nothing is waiting on a funding decision.")
  })

  it("headline keeps today's count copy", () => {
    expect(decisionHeadline(1)).toBe("1 candidate awaits a funding decision")
    expect(decisionHeadline(3)).toBe("3 candidates await a funding decision")
    expect(decisionHeadline(0)).toBe("Decision Center")
  })

  it("compare view uses square tags and no dashed or shadowed panels", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const el = render(<ComparisonView submissions={[sub("a"), sub("b")]} onClose={() => {}} />)
    expect(el.querySelectorAll('[data-cockpit="square-tag"]').length).toBeGreaterThanOrEqual(4)
    expect(el.innerHTML).not.toContain("shadow")
    expect(el.innerHTML).not.toContain("rounded-full")
    expect(el.textContent).toContain("Generate Executive Briefing")
    expect(el.textContent).toContain("Back to candidates")
  })
})

describe("Decision Center on doc (unchanged)", () => {
  it("renders the old card list and basalt band, with no cockpit kit pieces", () => {
    process.env.NEXT_PUBLIC_TENANT = "doc"
    const el = render(<DecisionCenter submissions={[sub("a"), sub("b")]} />)
    expect(el.querySelector("[data-cockpit]")).toBeNull()
    expect(el.querySelector("table")).toBeNull()
    expect(el.textContent).toContain("2 candidates await a funding decision")
    expect(el.textContent).toContain("Open submission")
    expect(el.querySelector(".bg-keystone-basalt600")).not.toBeNull()
  })

  it("compare view keeps the old basalt band and pills", () => {
    process.env.NEXT_PUBLIC_TENANT = "doc"
    const el = render(<ComparisonView submissions={[sub("a"), sub("b")]} onClose={() => {}} />)
    expect(el.querySelector("[data-cockpit]")).toBeNull()
    expect(el.querySelector(".bg-keystone-basalt600")).not.toBeNull()
  })
})
