// NL-7 (#288): the overlap group on ES2 (cockpitLook) as the band and a K5
// table, and the doc tenant still rendering the old cards.

import { describe, it, expect, afterEach, vi } from "vitest"
import { act } from "react"
import { ClusterMembers } from "./cluster-members"
import { ClusterHeader } from "./cluster-header"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { render } from "@/components/cockpit/test-utils"

const prev = process.env.NEXT_PUBLIC_TENANT
afterEach(() => {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = prev
})

function member(id: string, title: string): Submission {
  return {
    id,
    submittedAt: "2026-01-01T00:00:00.000Z",
    status: "submitted",
    formData: { ...initialFormData, useCaseTitle: title, submitterName: "Andre Duval", useCaseDescription: "Scores vendors. More." } as FormData,
  }
}
const members = [member("m1", "First idea"), member("m2", "Second idea")]
const cluster = { id: "m1", memberIds: ["m1", "m2"], maxSimilarity: 0.5 } as never

describe("overlap group", () => {
  it("ES2: members are a K5 table with today's fields and controls", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const onSelectLead = vi.fn()
    const el = render(<ClusterMembers members={members} currentLeadId="m1" decided={false} onSelectLead={onSelectLead} cockpit />)
    expect(el.querySelector('[data-cockpit="ranked-table"]')).not.toBeNull()
    expect(el.textContent).toContain("First idea")
    expect(el.textContent).toContain("Lead if consolidated")
    expect(el.querySelectorAll("a[href^='/submissions/']")).toHaveLength(2)
    const makeLead = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Make lead")!
    act(() => makeLead.click())
    expect(onSelectLead).toHaveBeenCalledWith("m2")
    // Make lead does not also open the row.
    expect(el.querySelectorAll("tbody tr[aria-expanded=true]")).toHaveLength(0)
  })

  it("ES2: no Make lead once decided", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const el = render(<ClusterMembers members={members} currentLeadId="m1" decided onSelectLead={() => {}} cockpit />)
    expect(Array.from(el.querySelectorAll("button")).some((b) => b.textContent === "Make lead")).toBe(false)
  })

  it("ES2: band carries today's heading", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const el = render(<ClusterHeader cluster={cluster} members={members} decision={undefined} cockpit />)
    expect(el.querySelector('[data-cockpit="header-band"]')).not.toBeNull()
    expect(el.querySelector("h1")?.textContent).toBe("Two use cases, one problem")
  })

  it("doc: the old cards and header, no table or band", () => {
    process.env.NEXT_PUBLIC_TENANT = "doc"
    const el = render(
      <>
        <ClusterHeader cluster={cluster} members={members} decision={undefined} />
        <ClusterMembers members={members} currentLeadId="m1" decided={false} onSelectLead={() => {}} />
      </>,
    )
    expect(el.querySelector('[data-cockpit="ranked-table"]')).toBeNull()
    expect(el.querySelector('[data-cockpit="header-band"]')).toBeNull()
    expect(el.textContent).toContain("Program office")
    expect(el.textContent).toContain("Scope")
  })
})
