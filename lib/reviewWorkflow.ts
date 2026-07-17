// Review workflow — submission lifecycle status + reviewer/submitter comments.
//
// DEMO STORAGE NOTE: for the Friday demo these live INSIDE form_data
// (form_data.reviewStatus, form_data.comments) so there is no schema change to
// apply. Owner and business unit are derived from the submitter info already in
// form_data. Post-demo, promote these to real columns + a submission_comments
// table and enforce ownership server-side (today the API returns all rows and
// scoping is done client-side — fine for a demo, not for production).

import type { Submission } from "@/lib/submissions"
import { getCachedUsers } from "@/lib/dataCache"
import { getTenant } from "@/lib/tenant"
import { STATUS_BADGE_CLASS } from "@/lib/statusTokens"

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "needs_info"
  | "approved"
  | "rejected"

export type SubmissionComment = {
  id: string
  authorName: string
  authorRole: "submitter" | "reviewer" | "admin"
  body: string
  createdAt: string
}

// Order used for pipeline columns / counts on the reviewer home.
export const STATUS_ORDER: SubmissionStatus[] = [
  "submitted",
  "in_review",
  "needs_info",
  "approved",
  "rejected",
]

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  needs_info: "Needs info",
  approved: "Approved",
  rejected: "Rejected",
}

// Keystone status-badge classes (lib/statusTokens.ts) — mapped onto the DS's
// four-state governance vocabulary: in_review is "someone needs to look"
// (attention), needs_info/rejected are blocked (alert), approved is cleared
// (healthy), submitted/draft are awaiting action with no signal yet
// (neutral).
export function statusBadgeClasses(status: SubmissionStatus): string {
  switch (status) {
    case "in_review":
      return STATUS_BADGE_CLASS.attention
    case "needs_info":
    case "rejected":
      return STATUS_BADGE_CLASS.alert
    case "approved":
      return STATUS_BADGE_CLASS.healthy
    case "submitted":
    case "draft":
    default:
      return STATUS_BADGE_CLASS.neutral
  }
}

export function getStatus(s: Submission): SubmissionStatus {
  const v = (s.status || (s.formData as Record<string, unknown>)?.reviewStatus) as
    | SubmissionStatus
    | undefined
  return v && (STATUS_LABEL as Record<string, string>)[v] ? v : "submitted"
}

export function getComments(s: Submission): SubmissionComment[] {
  const c = (s.formData as Record<string, unknown>)?.comments
  return Array.isArray(c) ? (c as SubmissionComment[]) : []
}

export function getOwnerEmail(s: Submission): string {
  return String(s.ownerEmail || (s.formData as Record<string, unknown>)?.submitterEmail || "").toLowerCase()
}

export function getBusinessUnit(s: Submission): string {
  return String(s.businessUnit || (s.formData as Record<string, unknown>)?.submitterOffice || "")
}

export function businessUnitLabel(unit: string): string {
  const opt = getTenant().unit.options.find((o) => o.value === unit)
  return opt ? opt.label : unit || "Unspecified"
}

export function getOffice(s: Submission): string {
  return String(s.office || (s.formData as Record<string, unknown>)?.submitterSubOffice || "")
}

// Label for an office, scoped to its parent bureau (offices are only unique
// within a bureau, e.g. "nws" could theoretically collide across bureaus).
export function officeLabel(unit: string, office: string): string {
  const bureau = getTenant().unit.options.find((o) => o.value === unit)
  const opt = bureau?.offices?.find((o) => o.value === office)
  return opt ? opt.label : office || "Unspecified"
}

// Role-scoped visibility. Submitters see only their own; reviewers/admins all
// unless bureau-scoped (see roll-down below).
// NOTE: client-side filter only — not a security boundary (see storage note,
// and the RLS-per-claim follow-up in docs/ARCHITECTURE.md).
export function visibleSubmissions(
  all: Submission[],
  viewer: { role: string; email?: string; businessUnit?: string; office?: string } | null,
): Submission[] {
  if (!viewer) return []
  if (viewer.role === "submitter") {
    const me = (viewer.email || "").toLowerCase()
    return all.filter((s) => getOwnerEmail(s) === me)
  }
  // Roll-down: a bureau-scoped reviewer (e.g., a bureau deputy CIO) or a
  // bureau-scoped admin (e.g., a bureau's own admin) sees only their own
  // business unit; an office-scoped viewer within that bureau (e.g.,
  // NOAA/NWS) is narrowed further to their office. The Office of the
  // Secretary (business_unit === "os"), department-level admins (no unit),
  // and reviewers without a unit are the only cross-bureau views (the
  // roll-up) — an admin's bureau assignment hard-limits them just like a
  // reviewer's.
  const bureauScoped = viewer.role === "reviewer" || (viewer.role === "admin" && viewer.businessUnit !== "os")
  if (bureauScoped && viewer.businessUnit) {
    const inBureau = all.filter((s) => getBusinessUnit(s) === viewer.businessUnit)
    if (viewer.office) {
      return inBureau.filter((s) => getOffice(s) === viewer.office)
    }
    return inBureau
  }
  return all
}

export function getAssigneeName(s: Submission): string {
  return String((s.formData as Record<string, unknown>)?.assignedReviewerName || "")
}

export function getAssigneeEmail(s: Submission): string {
  return String((s.formData as Record<string, unknown>)?.assignedReviewerEmail || "")
}

// The reviewer responsible for a business unit (role=reviewer, matching unit).
export function assigneeForBusinessUnit(unit: string): { name: string; email: string } | null {
  if (!unit) return null
  const r = getCachedUsers().find((u) => u.role === "reviewer" && u.businessUnit === unit)
  return r ? { name: r.name, email: r.email } : null
}
