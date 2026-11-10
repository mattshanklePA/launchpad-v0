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
  | { ok: false; status: 403; error: string }

type Json = Record<string, unknown>

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {})
const deny = (error: string): WriteDecision => ({ ok: false, status: 403, error })

// Keys a submitter may never change: review outcome and everything a reviewer records.
const REVIEWER_ONLY_KEYS = [
  "bureauSignoff",
  "departmentApproval",
  "rationalization",
  "assignedReviewerName",
  "assignedReviewerEmail",
] as const

function stampComments(incoming: unknown, existing: unknown, session: SessionClaims, now: string, asRole: string) {
  const prev = Array.isArray(existing) ? (existing as Json[]) : []
  const next = Array.isArray(incoming) ? (incoming as Json[]) : []
  return next.map((c, i) =>
    i < prev.length ? c : { ...c, authorName: session.name, authorRole: asRole, createdAt: now },
  )
}

export function authorizeWrite(args: {
  session: SessionClaims
  existing: Submission | null
  formData: Json
  now: string
}): WriteDecision {
  const { session, existing, now } = args
  const incoming: Json = { ...args.formData }
  const prev: Json = existing ? obj(existing.formData) : {}
  const me = session.email.toLowerCase()

  if (session.role === "submitter") {
    if (existing && getOwnerEmail(existing) !== me) return deny("You can only change your own submissions")
    for (const k of REVIEWER_ONLY_KEYS) {
      if (!same(incoming[k], prev[k])) return deny("Only a reviewer can change that")
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
  if (incoming.comments !== undefined) {
    incoming.comments = stampComments(incoming.comments, prev.comments, session, now, session.role)
  }
  return { ok: true, formData: incoming }
}
