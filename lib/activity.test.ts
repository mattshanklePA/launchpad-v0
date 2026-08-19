import { describe, it, expect } from "vitest"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { buildActivity } from "@/lib/activity"

function sub(overrides: Partial<FormData> & { submittedAt?: string; status?: string } = {}): Submission {
  const { submittedAt, status, ...formOverrides } = overrides
  return {
    id: "s1",
    submittedAt: submittedAt || "2026-08-17T09:00:00.000Z",
    status: status || "submitted",
    formData: { ...initialFormData, submitterName: "Andre Duval", ...formOverrides } as FormData,
  }
}

describe("buildActivity", () => {
  it("orders a decision, a cluster decision, two reviewer comments, and the submitted event newest-first", () => {
    const s = sub({
      submittedAt: "2026-08-17T09:00:00.000Z",
      status: "rejected",
      bureauSignoff: {
        bureau: "atr",
        decision: "rejected",
        signedOffByName: "Avery Lang",
        signedOffByEmail: "avery@doc.gov",
        signedOffAt: "2026-08-18T15:00:00.000Z",
      },
      rationalization: {
        clusterId: "m1",
        decision: "keep_separate",
        decidedBy: "Avery Lang",
        decidedAt: "2026-08-18T14:00:00.000Z",
      },
      comments: [
        { id: "c1", authorName: "Avery Lang", authorRole: "reviewer", body: "Rejecting as a duplicate.", createdAt: "2026-08-18T15:05:00.000Z" },
        { id: "c2", authorName: "Andre Duval", authorRole: "submitter", body: "Understood.", createdAt: "2026-08-18T16:00:00.000Z" },
      ],
    } as unknown as Partial<FormData>)

    const activity = buildActivity(s)

    expect(activity.map((e) => e.label)).toEqual([
      "Avery Lang replied",
      "Rejected by Avery Lang",
      "Cluster m1 marked keep-separate",
      "Submitted by Andre Duval",
    ])
    expect(activity.map((e) => e.at)).toEqual([
      "2026-08-18T15:05:00.000Z",
      "2026-08-18T15:00:00.000Z",
      "2026-08-18T14:00:00.000Z",
      "2026-08-17T09:00:00.000Z",
    ])
  })

  it("only lists reviewer/admin comments as activity, not the submitter's own replies", () => {
    const s = sub({
      comments: [
        { id: "c1", authorName: "Andre Duval", authorRole: "submitter", body: "Any update?", createdAt: "2026-08-19T09:00:00.000Z" },
      ],
    } as unknown as Partial<FormData>)
    const labels = buildActivity(s).map((e) => e.label)
    expect(labels).not.toContain("Andre Duval replied")
  })

  it("omits the decision event entirely when no sign-off is on record (no tenant fabricates a date)", () => {
    const s = sub({ status: "approved" })
    const labels = buildActivity(s).map((e) => e.label)
    expect(labels.some((l) => l.startsWith("Approved by") || l.startsWith("Rejected by"))).toBe(false)
  })

  it("never invents a Plumb-analysis-completed event since no timestamp is ever cached", () => {
    const s = sub()
    const labels = buildActivity(s).map((e) => e.label)
    expect(labels).not.toContain("Plumb analysis completed")
  })

  it("always includes the submitted event, falling back to Anonymous with no submitter name", () => {
    const s: Submission = {
      id: "s2",
      submittedAt: "2026-08-17T09:00:00.000Z",
      formData: { ...initialFormData } as FormData,
    }
    expect(buildActivity(s).map((e) => e.label)).toContain("Submitted by Anonymous")
  })

  it("adds a department-approval event distinct from the bureau decision when both are on record", () => {
    const s = sub({
      status: "approved",
      bureauSignoff: {
        bureau: "atr",
        decision: "approved",
        signedOffByName: "Avery Lang",
        signedOffByEmail: "avery@doc.gov",
        signedOffAt: "2026-08-18T10:00:00.000Z",
      },
      departmentApproval: {
        decision: "approved",
        byName: "Jordan Osei",
        byEmail: "jordan@doc.gov",
        at: "2026-08-19T10:00:00.000Z",
      },
    } as unknown as Partial<FormData>)
    const labels = buildActivity(s).map((e) => e.label)
    expect(labels).toContain("Approved by Avery Lang")
    expect(labels).toContain("Department approval confirmed by Jordan Osei")
  })
})
