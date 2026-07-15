import { describe, it, expect, beforeEach } from "vitest"
import { getDashboardActions, buildNotificationBatch, type DashboardAction } from "@/lib/dashboard/actions"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { setCachedUsers, type CachedUser } from "@/lib/dataCache"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import type { Submission } from "@/lib/submissions"

type SubInput = {
  id: string
  businessUnit: string
  office?: string
  status?: string
  ownerEmail?: string
  useCaseTitle?: string
  assignedReviewerName?: string
  assignedReviewerEmail?: string
  bureauSignoff?: { bureau: string; decision: "approved" | "rejected"; signedOffByName: string; signedOffByEmail: string; signedOffAt: string }
}

function sub(p: SubInput): Submission {
  return {
    id: p.id,
    submittedAt: new Date(0).toISOString(),
    status: p.status,
    businessUnit: p.businessUnit,
    office: p.office,
    ownerEmail: p.ownerEmail,
    formData: {
      useCaseTitle: p.useCaseTitle ?? `Idea ${p.id}`,
      submitterEmail: p.ownerEmail ?? "",
      ...(p.assignedReviewerName ? { assignedReviewerName: p.assignedReviewerName } : {}),
      ...(p.assignedReviewerEmail ? { assignedReviewerEmail: p.assignedReviewerEmail } : {}),
      ...(p.bureauSignoff ? { bureauSignoff: p.bureauSignoff } : {}),
    } as any,
  }
}

function user(p: Partial<CachedUser>): CachedUser {
  return {
    id: p.id || `u-${p.email}`,
    email: p.email || "",
    name: p.name || "",
    role: p.role || "reviewer",
    businessUnit: p.businessUnit ?? null,
    office: p.office ?? null,
    createdAt: new Date(0).toISOString(),
  }
}

const DEPT: DashboardScope = { level: "department" }
const NOAA: DashboardScope = { level: "bureau", businessUnit: "noaa" }

beforeEach(() => {
  // assigneeForBusinessUnit (lib/reviewWorkflow.ts) reads this cache — one
  // on-file reviewer per bureau used across the suite below.
  setCachedUsers([
    user({ email: "noaa.reviewer@doc.gov", name: "Noaa Reviewer", role: "reviewer", businessUnit: "noaa" }),
  ])
})

describe("getDashboardActions", () => {
  it("derives a needs_info action for a submission waiting on the submitter, never auto-sendable", () => {
    // Also assignee-less, so this also qualifies as "unassigned" (see the
    // "surfaces every kind together" test below) — assign a reviewer to
    // isolate the needs_info action on its own.
    const s = sub({
      id: "s1",
      businessUnit: "noaa",
      status: "needs_info",
      useCaseTitle: "Chatbot triage",
      assignedReviewerName: "A",
      assignedReviewerEmail: "a@doc.gov",
    })
    const actions = getDashboardActions(DEPT, [s], doc)
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({ kind: "needs_info", submissionId: "s1", canAutoSend: false })
    expect(actions[0].message).toContain("Chatbot triage")
    expect(actions[0].recipientEmail).toBeUndefined()
  })

  it("derives an unassigned action for an active submission with no reviewer on file", () => {
    const s = sub({ id: "s2", businessUnit: "noaa", status: "submitted" })
    const actions = getDashboardActions(DEPT, [s], doc)
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({ kind: "unassigned", submissionId: "s2", canAutoSend: false })
  })

  it("does not flag a submission as unassigned once it has an assignee", () => {
    const s = sub({ id: "s3", businessUnit: "noaa", status: "submitted", assignedReviewerName: "A", assignedReviewerEmail: "a@doc.gov" })
    expect(getDashboardActions(DEPT, [s], doc)).toEqual([])
  })

  it("does not flag a terminal (approved/rejected/draft) submission as unassigned", () => {
    const approved = sub({ id: "s4", businessUnit: "noaa", status: "approved", bureauSignoff: { bureau: "noaa", decision: "approved", signedOffByName: "A", signedOffByEmail: "a@doc.gov", signedOffAt: "2026-01-01" } })
    const rejected = sub({ id: "s5", businessUnit: "noaa", status: "rejected" })
    expect(getDashboardActions(DEPT, [approved, rejected], doc)).toEqual([])
  })

  it("derives a sign-off nudge action for an approved submission with no bureau sign-off, auto-sendable when a bureau reviewer is on file", () => {
    const s = sub({ id: "s6", businessUnit: "noaa", status: "approved" })
    const actions = getDashboardActions(DEPT, [s], doc)
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({
      kind: "signoff_nudge",
      submissionId: "s6",
      canAutoSend: true,
      recipientName: "Noaa Reviewer",
      recipientEmail: "noaa.reviewer@doc.gov",
    })
  })

  it("keeps a sign-off nudge as a draft when no reviewer is on file for the bureau", () => {
    const s = sub({ id: "s7", businessUnit: "nist", status: "approved" })
    const actions = getDashboardActions(DEPT, [s], doc)
    expect(actions).toHaveLength(1)
    expect(actions[0]).toMatchObject({ kind: "signoff_nudge", canAutoSend: false })
    expect(actions[0].recipientEmail).toBeUndefined()
  })

  it("prefers the submission's own assigned reviewer over the bureau's default one", () => {
    const s = sub({
      id: "s8",
      businessUnit: "noaa",
      status: "approved",
      assignedReviewerName: "Direct Assignee",
      assignedReviewerEmail: "direct@doc.gov",
    })
    const actions = getDashboardActions(DEPT, [s], doc)
    expect(actions[0]).toMatchObject({ recipientName: "Direct Assignee", recipientEmail: "direct@doc.gov", canAutoSend: true })
  })

  it("never derives sign-off actions for a tenant with no bureau tier (USPTO)", () => {
    const s = sub({ id: "s9", businessUnit: "patents", status: "approved" })
    expect(getDashboardActions(DEPT, [s], uspto)).toEqual([])
  })

  it("is scope-correct: a bureau-scoped viewer never gets another bureau's action item", () => {
    const noaaItem = sub({ id: "n1", businessUnit: "noaa", status: "needs_info", assignedReviewerName: "A", assignedReviewerEmail: "a@doc.gov" })
    const censusItem = sub({ id: "c1", businessUnit: "census", status: "needs_info", assignedReviewerName: "B", assignedReviewerEmail: "b@doc.gov" })
    const actions = getDashboardActions(NOAA, [noaaItem, censusItem], doc)
    expect(actions.map((a) => a.submissionId)).toEqual(["n1"])
  })

  it("surfaces every kind together for a submission that qualifies for more than one", () => {
    // Not realistic (needs_info + unassigned can't both hold for one row given
    // status, but unassigned + no assignee is exactly what needs_info also
    // triggers when status is needs_info) — a needs_info, unassigned submission
    // gets both action kinds since they answer different questions.
    const s = sub({ id: "s10", businessUnit: "noaa", status: "needs_info" })
    const actions = getDashboardActions(DEPT, [s], doc)
    expect(actions.map((a) => a.kind).sort()).toEqual(["needs_info", "unassigned"])
  })
})

describe("buildNotificationBatch", () => {
  function action(overrides: Partial<DashboardAction>): DashboardAction {
    return {
      id: "a",
      kind: "signoff_nudge",
      submissionId: "s",
      submissionTitle: "Idea",
      bureau: "noaa",
      bureauLabel: "NOAA",
      severity: "critical",
      message: "message",
      canAutoSend: true,
      ...overrides,
    }
  }

  it("returns null when nothing in the batch may auto-send", () => {
    expect(buildNotificationBatch([action({ canAutoSend: false })])).toBeNull()
  })

  it("joins only the sendable messages and counts them", () => {
    const batch = buildNotificationBatch([
      action({ id: "a1", message: "one", canAutoSend: true }),
      action({ id: "a2", message: "two", canAutoSend: false }),
      action({ id: "a3", message: "three", canAutoSend: true }),
    ])
    expect(batch).toEqual({ message: "one\nthree", count: 2 })
  })

  it("is null for an empty batch", () => {
    expect(buildNotificationBatch([])).toBeNull()
  })
})
