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
  office?: string
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
    office: p.office,
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

describe("visibleSubmissions (office roll-down)", () => {
  const all = [
    sub({ id: "a", businessUnit: "noaa", office: "nws" }),
    sub({ id: "b", businessUnit: "noaa", office: "nmfs" }),
    sub({ id: "c", businessUnit: "noaa" }), // bureau-wide, no office set
    sub({ id: "d", businessUnit: "census", office: "decennial" }),
    sub({ id: "e", businessUnit: "nist" }), // bureau with no offices configured
  ]

  it("scopes an office-scoped reviewer to their office within their bureau", () => {
    const r = visibleSubmissions(all, { role: "reviewer", businessUnit: "noaa", office: "nws" })
    expect(r.map((s) => s.id)).toEqual(["a"])
  })

  it("scopes a bureau-only reviewer to the whole bureau, offices included", () => {
    const r = visibleSubmissions(all, { role: "reviewer", businessUnit: "noaa" })
    expect(r.map((s) => s.id).sort()).toEqual(["a", "b", "c"])
  })

  it("lets a department/admin viewer see everything regardless of office", () => {
    expect(visibleSubmissions(all, { role: "admin" })).toHaveLength(5)
  })

  it("has parity with today for a bureau with no offices (bureau-only scoping still works)", () => {
    const r = visibleSubmissions(all, { role: "reviewer", businessUnit: "nist" })
    expect(r.map((s) => s.id)).toEqual(["e"])
  })
})

describe("visibleSubmissions (admin bureau roll-down — DoC hard limit)", () => {
  const all = [
    sub({ id: "a", businessUnit: "noaa", office: "nws" }),
    sub({ id: "b", businessUnit: "noaa", office: "nmfs" }),
    sub({ id: "c", businessUnit: "census" }),
    sub({ id: "d", businessUnit: "os" }),
  ]

  it("scopes a non-os bureau admin to their own bureau, like a reviewer", () => {
    const r = visibleSubmissions(all, { role: "admin", businessUnit: "noaa" })
    expect(r.map((s) => s.id).sort()).toEqual(["a", "b"])
  })

  it("narrows a bureau admin to their office when set", () => {
    const r = visibleSubmissions(all, { role: "admin", businessUnit: "noaa", office: "nws" })
    expect(r.map((s) => s.id)).toEqual(["a"])
  })

  it("never lets a bureau admin see another bureau's submissions", () => {
    const r = visibleSubmissions(all, { role: "admin", businessUnit: "census" })
    expect(r.map((s) => s.id)).toEqual(["c"])
    expect(r.some((s) => s.id === "a" || s.id === "b" || s.id === "d")).toBe(false)
  })

  it("lets an OS admin (business_unit = os) see every bureau (the roll-up)", () => {
    const r = visibleSubmissions(all, { role: "admin", businessUnit: "os" })
    expect(r).toHaveLength(4)
  })

  it("lets the department admin (business_unit = null) see every bureau (the roll-up)", () => {
    const r = visibleSubmissions(all, { role: "admin" })
    expect(r).toHaveLength(4)
  })
})
