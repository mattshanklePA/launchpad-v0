// Issue #213 item 1: decisionCenterCandidates() used to be visibleSubmissions
// alone — identity scope only, never review status — so drafts, submitted,
// in_review, needs_info, and rejected submissions all showed up as funding
// candidates under a header claiming "Each cleared vetting." A submission
// only belongs here once a reviewer has approved it.

import { describe, it, expect } from "vitest"
import { decisionCenterCandidates } from "@/lib/decisionCenter"
import type { SubmissionStatus } from "@/lib/reviewWorkflow"
import type { Submission } from "@/lib/submissions"

type SubInput = {
  id?: string
  status?: SubmissionStatus
  businessUnit?: string
  office?: string
  ownerEmail?: string
}

function sub(p: SubInput): Submission {
  return {
    id: p.id ?? "s1",
    submittedAt: new Date().toISOString(),
    formData: {} as any,
    status: p.status,
    ownerEmail: p.ownerEmail,
    businessUnit: p.businessUnit,
    office: p.office,
  }
}

const ADMIN_VIEWER = { role: "admin" }

const ALL_STATUSES: SubmissionStatus[] = ["draft", "submitted", "in_review", "needs_info", "approved", "rejected"]

describe("decisionCenterCandidates (issue #213 item 1)", () => {
  it("returns only the approved submission out of one of every status", () => {
    const all = ALL_STATUSES.map((status) => sub({ id: status, status }))
    const result = decisionCenterCandidates(all, ADMIN_VIEWER)
    expect(result.map((s) => s.id)).toEqual(["approved"])
  })

  it("excludes drafts, submitted, in_review, needs_info, and rejected individually", () => {
    for (const status of ALL_STATUSES.filter((s) => s !== "approved")) {
      const result = decisionCenterCandidates([sub({ id: "x", status })], ADMIN_VIEWER)
      expect(result).toEqual([])
    }
  })

  it("returns an empty array for empty input", () => {
    expect(decisionCenterCandidates([], ADMIN_VIEWER)).toEqual([])
  })

  it("returns an empty array when every submission is unapproved", () => {
    const all = [
      sub({ id: "a", status: "submitted" }),
      sub({ id: "b", status: "in_review" }),
      sub({ id: "c", status: "rejected" }),
    ]
    expect(decisionCenterCandidates(all, ADMIN_VIEWER)).toEqual([])
  })

  it("still applies identity/bureau scope on top of the status gate", () => {
    const all = [
      sub({ id: "in-scope", status: "approved", businessUnit: "noaa" }),
      sub({ id: "out-of-scope", status: "approved", businessUnit: "census" }),
      sub({ id: "in-scope-unapproved", status: "submitted", businessUnit: "noaa" }),
    ]
    const result = decisionCenterCandidates(all, { role: "reviewer", businessUnit: "noaa" })
    expect(result.map((s) => s.id)).toEqual(["in-scope"])
  })

  it("returns nothing without a viewer, even for approved submissions", () => {
    expect(decisionCenterCandidates([sub({ status: "approved" })], null)).toEqual([])
  })
})
