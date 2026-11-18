// Server-side who-sees-what and who-may-write-what (SEC-2). Pure, no I/O.
//
// Reads reuse `visibleSubmissions` (lib/reviewWorkflow.ts) verbatim — the viewer
// is built from the VERIFIED session claims, never from anything the browser sent.
// Writes are authorized here before the route touches the database, and decision
// times (sign-off, department approval, rationalization decision, comment
// timestamps) are stamped by the server from `now`, ignoring browser values.

import type { Submission } from "@/lib/submissions"
import type { SessionClaims } from "@/lib/session/token"
import { getOwnerEmail, visibleSubmissions } from "@/lib/reviewWorkflow"
import { isDecisionLocked, lockedWritableKeys } from "@/lib/decisionLock"
import { departmentFinalApprovalEnabled, hasDepartmentTransparency } from "@/lib/bureauSignoff"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { hasEnoughWords, readReviewerStep, reviewerDecidesEnabled, REASON_REQUIRED_MESSAGE } from "@/lib/reviewerDecision"

export function viewerFromSession(session: SessionClaims) {
  return {
    role: session.role as string,
    email: session.email,
    businessUnit: session.businessUnit || undefined,
    office: session.office || undefined,
  }
}

export function visibleToSession(all: Submission[], session: SessionClaims): Submission[] {
  return visibleSubmissions(all, viewerFromSession(session))
}

export type WriteDecision =
  | { ok: true; formData: Record<string, unknown> }
  | { ok: false; status: 403 | 409 | 422; error: string }

type Json = Record<string, unknown>

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {})
const deny = (error: string): WriteDecision => ({ ok: false, status: 403, error })
const needReason = (): WriteDecision => ({ ok: false, status: 422, error: REASON_REQUIRED_MESSAGE })
// The new-record form starts `highImpact` as "", so "" and absent are the same answer.
const sameAnswer = (a: unknown, b: unknown) => same(a === "" ? undefined : a, b === "" ? undefined : b)

// Keys a submitter may never change: review outcome and everything a reviewer records.
const REVIEWER_ONLY_KEYS = [
  "bureauSignoff",
  "departmentApproval",
  "rationalization",
  "assignedReviewerName",
  "assignedReviewerEmail",
  // F7-1 (#344): the reviewer's answers. No intake screen writes these (the
  // intake form only carries the empty `highImpact` default), so an idea's
  // owner may never set them.
  "highImpact",
  "highImpactReview",
  "rmfProfileReview",
  // F7-2 (#345): the fields-save record (who chose which field, and when).
  "governanceCaptureReview",
] as const

function stampComments(incoming: unknown, existing: unknown, session: SessionClaims, now: string, asRole: string) {
  const prev = Array.isArray(existing) ? (existing as Json[]) : []
  const next = Array.isArray(incoming) ? (incoming as Json[]) : []
  return next.map((c, i) =>
    i < prev.length ? c : { ...c, authorName: session.name, authorRole: asRole, createdAt: now },
  )
}

const LOCKED_ERROR =
  "This record has been decided and signed off, so it is locked. Contact the office to reopen it."

// Reviewer decides (F7-1): where the tenant has it on, a changed high-impact or
// risk-framework answer is stamped (name, email, time) by the server, and one
// that differs from Plumb's suggestion must carry a reason. The suggestion is
// worked out here from the stored record (`source`), never from the browser.
// Mutates `incoming`; returns a refusal or undefined.
function stampReviewerAnswers(incoming: Json, prev: Json, source: Json, session: SessionClaims, now: string): WriteDecision | undefined {
  if (!sameAnswer(incoming.highImpact, prev.highImpact) && incoming.highImpact !== "" && incoming.highImpact !== undefined) {
    const sent = obj(incoming.highImpactReview)
    const reason = typeof sent.reason === "string" ? sent.reason.trim() : undefined
    const read = readReviewerStep("highImpact", { ...source, highImpact: incoming.highImpact, highImpactReview: { reason } })
    if (read.reasonNeeded && !read.reasonPresent) return needReason()
    incoming.highImpactReview = {
      suggested: read.suggestion,
      ...(read.reasonNeeded ? { reason } : {}),
      byName: session.name,
      byEmail: session.email,
      at: now,
    }
  } else if (prev.highImpactReview !== undefined) {
    incoming.highImpactReview = prev.highImpactReview
  } else {
    delete incoming.highImpactReview
  }

  // F7-2 (#345): the fields save. `highImpact` is answered on its own step, so
  // it can't ride along with a fields save; the review (name, email, time) is
  // stamped here, and a field chosen earlier keeps its own name and time.
  const gr = incoming.governanceCaptureReview
  if (gr !== undefined && !same(gr, prev.governanceCaptureReview)) {
    const sent = obj(gr)
    const sentEntries = Array.isArray(sent.entries) ? (sent.entries as Json[]) : []
    if (sentEntries.some((e) => obj(e).field === "highImpact") || !sameAnswer(incoming.highImpact, prev.highImpact)) {
      return deny("The high-impact answer is given on its own step, not with the fields")
    }
    const prevEntries = Array.isArray(obj(prev.governanceCaptureReview).entries) ? (obj(prev.governanceCaptureReview).entries as Json[]) : []
    incoming.governanceCaptureReview = {
      entries: sentEntries.map((e) => {
        if (e.decision !== "chosen") return e
        const old = prevEntries.find((p) => p.field === e.field && p.decision === "chosen" && same(p.finalValue, e.finalValue))
        return { ...e, byName: old?.byName ?? session.name, at: old?.at ?? now }
      }),
      byName: session.name,
      byEmail: session.email,
      at: now,
    }
  }

  const rr = incoming.rmfProfileReview
  if (rr !== undefined && !same(rr, prev.rmfProfileReview)) {
    const sent = obj(rr)
    const proposed = readReviewerStep("rmf", source).suggestion
    const overridden = sent.decision === "overridden" && typeof sent.overriddenOverall === "string" && sent.overriddenOverall !== proposed
    const notes = typeof sent.notes === "string" ? sent.notes.trim() : undefined
    if (overridden && !hasEnoughWords(notes)) return needReason()
    incoming.rmfProfileReview = {
      decision: overridden ? "overridden" : "confirmed",
      proposedOverall: proposed,
      ...(overridden ? { overriddenOverall: sent.overriddenOverall } : {}),
      ...(notes ? { notes } : {}),
      byName: session.name,
      byEmail: session.email,
      at: now,
    }
  }
  return undefined
}

export function authorizeWrite(args: {
  session: SessionClaims
  existing: Submission | null
  formData: Json
  now: string
  /** Defaults to the active tenant; injectable for tests. */
  bureauTier?: boolean
  /** Defaults to the active tenant's `departmentFinalApproval`; injectable for tests. */
  departmentFinalApproval?: boolean
  /** Defaults to the active tenant's `reviewerDecides`; injectable for tests. */
  reviewerDecides?: boolean
}): WriteDecision {
  const { session, existing, now } = args
  const incoming: Json = { ...args.formData }
  const prev: Json = existing ? obj(existing.formData) : {}
  const me = session.email.toLowerCase()

  // Decided records are locked (#271): only comments, plus the two decisions
  // that come after sign-off (rationalization, department approval), may
  // change (FIX-1; see lockedWritableKeys). The one way
  // out is an admin reopening on purpose, i.e. moving the status away from the
  // decision; that write may carry other changes with it.
  if (existing && isDecisionLocked(prev, args.bureauTier ?? tenantHasBureauTier())) {
    const reopening = session.role === "admin" && String(incoming.reviewStatus ?? prev.reviewStatus) !== String(prev.reviewStatus)
    if (!reopening) {
      const writable = lockedWritableKeys({
        role: session.role,
        departmentFinalApproval: args.departmentFinalApproval ?? departmentFinalApprovalEnabled(),
        hasDepartmentTransparency: hasDepartmentTransparency(viewerFromSession(session)),
      })
      for (const k of new Set([...Object.keys(prev), ...Object.keys(incoming)])) {
        if (!writable.has(k) && !same(incoming[k], prev[k])) return { ok: false, status: 409, error: LOCKED_ERROR }
      }
    }
  }

  if (session.role === "submitter") {
    if (existing && getOwnerEmail(existing) !== me) return deny("You can only change your own submissions")
    for (const k of REVIEWER_ONLY_KEYS) {
      const unchanged = k === "highImpact" ? sameAnswer(incoming[k], prev[k]) : same(incoming[k], prev[k])
      if (!unchanged) return deny("Only a reviewer can change that")
    }
    const from = String(prev.reviewStatus || (existing ? "submitted" : "draft"))
    const to = String(incoming.reviewStatus || from)
    const allowed = existing
      ? to === from || (to === "submitted" && ["draft", "needs_info"].includes(from))
      : to === "draft" || to === "submitted"
    if (!allowed) return deny("Only a reviewer can change the status")

    const prevComments = Array.isArray(prev.comments) ? (prev.comments as Json[]) : []
    const nextComments = Array.isArray(incoming.comments) ? (incoming.comments as Json[]) : []
    if (nextComments.length < prevComments.length || !same(nextComments.slice(0, prevComments.length), prevComments)) {
      return deny("Existing comments cannot be changed")
    }
    if (incoming.comments !== undefined) {
      incoming.comments = stampComments(incoming.comments, prev.comments, session, now, "submitter")
    }
    incoming.submitterEmail = session.email
    return { ok: true, formData: incoming }
  }

  // reviewer / admin: the target must be inside their scope (same rule as reads).
  const candidate: Submission = existing ?? {
    id: "new",
    submittedAt: now,
    formData: incoming as Submission["formData"],
  }
  if (visibleToSession([candidate], session).length === 0) return deny("That submission is outside your scope")

  const bs = incoming.bureauSignoff
  if (bs !== undefined && !same(bs, prev.bureauSignoff)) {
    incoming.bureauSignoff = { ...obj(bs), signedOffByName: session.name, signedOffByEmail: session.email, signedOffAt: now }
  }
  const da = incoming.departmentApproval
  if (da !== undefined && !same(da, prev.departmentApproval)) {
    incoming.departmentApproval = { ...obj(da), byName: session.name, byEmail: session.email, at: now }
  }
  const ra = incoming.rationalization
  if (ra !== undefined && !same(ra, prev.rationalization)) {
    incoming.rationalization = { ...obj(ra), decidedBy: session.name, decidedAt: now }
  }
  if (args.reviewerDecides ?? reviewerDecidesEnabled()) {
    const refused = stampReviewerAnswers(incoming, prev, existing ? prev : incoming, session, now)
    if (refused) return refused
  }
  if (incoming.comments !== undefined) {
    incoming.comments = stampComments(incoming.comments, prev.comments, session, now, session.role)
  }
  return { ok: true, formData: incoming }
}
