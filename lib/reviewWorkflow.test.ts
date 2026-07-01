import { describe, it, expect } from "vitest"
import { getStatus, visibleSubmissions } from "@/lib/reviewWorkflow"
import type { Submission } from "@/lib/submissions"

type SubInput = {
  id?: string
  submittedAt?: string
  formData?: Record<string, unknown>
  status?: string
  ownerEmail?: string
  businessUnit?: string
}

// Minimal Submission builder for tests (formData is loosely typed on purpose).
function sub(p: SubInput): Submission {
  return {
    id: p.id ?? "s1",
    submittedAt: p.submittedAt ?? new Date().toISOString(),
    formData: (p.formData ?? {}) as any,
    status: p.status,
    ownerEmail: p.ownerEmail,
    businessUnit: p.businessUnit,
  }
}

describe("getStatus", () => {
  it("prefers the top-level status column", () => {
    expect(getStatus(sub({ status: "approved", formData: { reviewStatus: "in_review" } }))).toBe("approved")
  })
  it("falls back to form_data.reviewStatus", () => {
    expect(getStatus(sub({ formData: { reviewStatus: "needs_info" } }))).toBe("needs_info")
  })
  it("defaults to submitted when nothing is set", () => {
    expect(getStatus(sub({}))).toBe("submitted")
  })
})

describe("visibleSubmissions (role scoping + roll-down)", () => {
  const all = [
    sub({ id: "a", businessUnit: "nist", formData: { submitterEmail: "x@nist.gov" } }),
    sub({ id: "b", businessUnit: "census", formData: { submitterEmail: "y@census.gov" } }),
  ]

  it("returns nothing without a viewer", () => {
    expect(visibleSubmissions(all, null)).toHaveLength(0)
  })
  it("scopes a submitter to their own submissions", () => {
    const r = visibleSubmissions(all, { role: "submitter", email: "x@nist.gov" })
    expect(r.map((s) => s.id)).toEqual(["a"])
  })
  it("scopes a bureau reviewer to their unit (roll-down)", () => {
    const r = visibleSubmissions(all, { role: "reviewer", businessUnit: "census" })
    expect(r.map((s) => s.id)).toEqual(["b"])
  })
  it("lets a department admin see everything (roll-up)", () => {
    expect(visibleSubmissions(all, { role: "admin" })).toHaveLength(2)
  })
  it("lets a reviewer without a unit see everything", () => {
    expect(visibleSubmissions(all, { role: "reviewer" })).toHaveLength(2)
  })
})
