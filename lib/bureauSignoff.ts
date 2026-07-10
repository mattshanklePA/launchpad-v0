// Dispersed bureau sign-off + department approval transparency ([issue #54]
// (https://github.com/mattshanklePA/launchpad-v0/issues/54)) — "each bureau
// signs its own, the Department sees everything." Today an "approved" is
// just a status flip (`form_data.reviewStatus`, see lib/reviewWorkflow.ts)
// with no record of who signed off for the bureau or when. This module adds
// that record and the department-level transparency built on top of it.
//
// Persisted in `form_data` (lib/reviewWorkflow.ts's demo-storage pattern — no
// schema change), same shape as lib/rationalization.ts: a pure, I/O-free
// module with `getX`/`buildXPatch` helpers; callers apply the patch via
// lib/submissions.ts's `patchSubmissionFormData`.
//
// Additive and tenant-safe: everything here is a no-op for tenants without a
// bureau tier (USPTO/DoW) — gate rendering with `tenantHasBureauTier()`
// (lib/rationalization.ts), the same signal that gate already uses.

import type { Submission } from "@/lib/submissions"
import type { SubmissionStatus } from "@/lib/reviewWorkflow"
import { getStatus, getBusinessUnit, visibleSubmissions } from "@/lib/reviewWorkflow"
import { getTenant, type TenantConfig } from "@/lib/tenant"

export type SignoffDecision = "approved" | "rejected"

/** Recorded on the submission when a bureau reviewer approves or rejects it. */
export type BureauSignoff = {
  bureau: string
  decision: SignoffDecision
  signedOffByName: string
  signedOffByEmail: string
  signedOffAt: string
}

/**
 * Optional second tier on top of bureau sign-off: a department (OS/admin)
 * final confirmation. Recorded separately so bureau sign-off stays fully
 * functional on its own when this tier is disabled (`departmentFinalApprovalEnabled`).
 */
export type DepartmentApproval = {
  decision: SignoffDecision
  byName: string
  byEmail: string
  at: string
}

export function getBureauSignoff(s: Submission): BureauSignoff | undefined {
  const v = (s.formData as Record<string, unknown>)?.bureauSignoff
  return v && typeof v === "object" ? (v as BureauSignoff) : undefined
}

export function getDepartmentApproval(s: Submission): DepartmentApproval | undefined {
  const v = (s.formData as Record<string, unknown>)?.departmentApproval
  return v && typeof v === "object" ? (v as DepartmentApproval) : undefined
}

/** Builds the `form_data` patch recording a bureau reviewer's sign-off. Pure — apply via `patchSubmissionFormData`. */
export function buildBureauSignoffPatch(
  s: Submission,
  decision: SignoffDecision,
  opts: { signedOffByName: string; signedOffByEmail: string; signedOffAt: string },
): { bureauSignoff: BureauSignoff } {
  return {
    bureauSignoff: {
      bureau: getBusinessUnit(s),
      decision,
      signedOffByName: opts.signedOffByName,
      signedOffByEmail: opts.signedOffByEmail,
      signedOffAt: opts.signedOffAt,
    },
  }
}

/** Builds the `form_data` patch recording the department's final approval. Pure — apply via `patchSubmissionFormData`. */
export function buildDepartmentApprovalPatch(
  decision: SignoffDecision,
  opts: { byName: string; byEmail: string; at: string },
): { departmentApproval: DepartmentApproval } {
  return {
    departmentApproval: {
      decision,
      byName: opts.byName,
      byEmail: opts.byEmail,
      at: opts.at,
    },
  }
}

/** True when the tenant has turned on the optional department-final-approval tier (off unless a tenant sets it). */
export function departmentFinalApprovalEnabled(tenant: TenantConfig = getTenant()): boolean {
  return !!tenant.features.departmentFinalApproval
}

type Viewer = { role: string; email?: string; businessUnit?: string; office?: string } | null

/**
 * The cross-bureau transparency hard limit: only an OS admin
 * (`businessUnit === "os"`) or a department-level admin with no bureau
 * assignment gets the roll-up view — mirrors the exact gate
 * `visibleSubmissions` (lib/reviewWorkflow.ts) uses for its own roll-up,
 * scoped further here to admins only (a bureau reviewer never gets
 * cross-bureau transparency even without a business unit set).
 */
export function hasDepartmentTransparency(viewer: Viewer): boolean {
  if (!viewer || viewer.role !== "admin") return false
  return !viewer.businessUnit || viewer.businessUnit === "os"
}

/** Where a submission's sign-off stands, for the transparency roll-up. */
export type SignoffProgress = "signed_off" | "pending" | "rejected"

export function signoffProgress(s: Submission): SignoffProgress {
  const status = getStatus(s)
  if (status === "rejected") return "rejected"
  if (status === "approved" && getBureauSignoff(s)) return "signed_off"
  return "pending"
}

export type BureauApprovalSummary = {
  bureau: string
  total: number
  signedOff: number
  pending: number
  rejected: number
  departmentApproved: number
}

export type ApprovalTransparencyItem = {
  submissionId: string
  title: string
  bureau: string
  status: SubmissionStatus
  progress: SignoffProgress
  signoff?: BureauSignoff
  departmentApproval?: DepartmentApproval
}

function summarizeBureau(bureau: string, items: Submission[]): BureauApprovalSummary {
  return {
    bureau,
    total: items.length,
    signedOff: items.filter((s) => signoffProgress(s) === "signed_off").length,
    pending: items.filter((s) => signoffProgress(s) === "pending").length,
    rejected: items.filter((s) => signoffProgress(s) === "rejected").length,
    departmentApproved: items.filter((s) => !!getDepartmentApproval(s)).length,
  }
}

/**
 * The department approval transparency selector: every bureau's sign-off
 * progress plus a flat per-item list (who/when). Returns data for **every**
 * bureau only when `viewer` has department transparency
 * (`hasDepartmentTransparency`); otherwise scopes to the viewer's own bureau
 * via the same `visibleSubmissions` roll-down every other admin surface
 * uses, so a bureau-scoped reviewer/admin only ever sees their own bureau —
 * the hard limit is enforced in the selector itself, not just the UI.
 */
export function approvalTransparency(
  submissions: Submission[],
  viewer: Viewer,
): { summaries: BureauApprovalSummary[]; items: ApprovalTransparencyItem[] } {
  const scoped = hasDepartmentTransparency(viewer) ? submissions : visibleSubmissions(submissions, viewer)
  const bureaus = Array.from(new Set(scoped.map(getBusinessUnit).filter(Boolean))).sort()
  const summaries = bureaus.map((b) => summarizeBureau(b, scoped.filter((s) => getBusinessUnit(s) === b)))
  const items = scoped.map((s) => ({
    submissionId: s.id,
    title: String((s.formData as Record<string, unknown>)?.useCaseTitle || "Untitled idea"),
    bureau: getBusinessUnit(s),
    status: getStatus(s),
    progress: signoffProgress(s),
    signoff: getBureauSignoff(s),
    departmentApproval: getDepartmentApproval(s),
  }))
  return { summaries, items }
}
