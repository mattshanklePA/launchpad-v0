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

// Tailwind badge classes, matching the app's existing readiness-badge style.
export function statusBadgeClasses(status: SubmissionStatus): string {
  switch (status) {
    case "submitted":
      return "bg-blue-100 text-blue-800 border-blue-300"
    case "in_review":
      return "bg-amber-100 text-amber-800 border-amber-300"
    case "needs_info":
      return "bg-red-100 text-red-800 border-red-300"
    case "approved":
      return "bg-green-100 text-green-800 border-green-300"
    case "rejected":
    case "draft":
    default:
      return "bg-gray-100 text-gray-600 border-gray-300"
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
  const map: Record<string, string> = {
    patents: "Patents",
    trademarks: "Trademarks",
    ocio: "OCIO",
    ocfo: "OCFO",
    ogc: "OGC",
    opia: "OPIA",
    hr: "Human Resources",
    cross_functional: "Cross-functional",
    other: "Other",
  }
  return map[unit] || (unit ? unit : "Unspecified")
}

// Role-scoped visibility. Submitters see only their own; reviewers/admins all.
// NOTE: client-side filter only — not a security boundary (see storage note).
export function visibleSubmissions(
  all: Submission[],
  viewer: { role: string; email?: string } | null,
): Submission[] {
  if (!viewer) return []
  if (viewer.role === "submitter") {
    const me = (viewer.email || "").toLowerCase()
    return all.filter((s) => getOwnerEmail(s) === me)
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
