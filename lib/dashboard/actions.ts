// Command Center Executive Action Center — derives real, per-submission
// action items for a DashboardScope (CC-5), on top of CC-2's scoping
// (lib/dashboard/metrics.ts's scopedSubmissions) and the same domain modules
// the pipeline/roll-up surfaces already use (lib/reviewWorkflow.ts,
// lib/bureauSignoff.ts). No new data model, no new send path: wiring these
// into the Notifier (lib/notifier.ts) happens in app/dashboard-actions.ts.
//
// Three categories, matching what the Action Center placeholder from CC-3/CC-4
// was standing in for: submissions in `needs_info` (waiting on the submitter),
// unassigned submissions (no reviewer on file), and approved submissions
// awaiting bureau sign-off (lib/bureauSignoff.ts). All three are scoped via
// `scopedSubmissions`, so a bureau/office-scoped reviewer's action list can
// never include another bureau's item — the same hard limit every other
// Command Center card already applies.
//
// THE RECIPIENT GUARD (`canAutoSend`) — the app has never had a channel to
// notify a submitter outside the product itself (no email/Teams adapter is
// wired up; `lib/notifier.ts`'s Slack webhook posts to one internal team
// channel). This story must not invent one. So:
//   - `needs_info` actions are about nudging the SUBMITTER for a reply — that
//     message is never appropriate on the internal Slack channel, so
//     `canAutoSend` is always false. Reaching the submitter still goes through
//     the existing, guarded in-app path (Request info -> addSubmissionComment,
//     components/submissions/submission-detail.tsx).
//   - `unassigned` actions have no reviewer on file at all yet (that's the
//     point) — there is nobody internal to address a nudge to, so
//     `canAutoSend` is always false until an admin assigns one
//     (components/admin/user-management.tsx).
//   - `signoff_nudge` actions target the bureau's own on-file reviewer
//     (`assigneeForBusinessUnit`/the submission's assigned reviewer) — a
//     known internal recipient on the same Slack channel every other internal
//     notification already uses — so `canAutoSend` is true only when one is
//     actually on file.

import type { Submission } from "@/lib/submissions"
import {
  getStatus,
  getBusinessUnit,
  businessUnitLabel,
  getAssigneeName,
  getAssigneeEmail,
  assigneeForBusinessUnit,
} from "@/lib/reviewWorkflow"
import { getBureauSignoff } from "@/lib/bureauSignoff"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { scopedSubmissions } from "@/lib/dashboard/metrics"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { getTenant, type TenantConfig } from "@/lib/tenant"

export type DashboardActionKind = "needs_info" | "unassigned" | "signoff_nudge"
export type DashboardActionSeverity = "info" | "warning" | "critical"

export type DashboardAction = {
  id: string
  kind: DashboardActionKind
  submissionId: string
  submissionTitle: string
  bureau: string
  bureauLabel: string
  severity: DashboardActionSeverity
  /** The message a Notifier send would carry for this item — see `canAutoSend`. */
  message: string
  recipientName?: string
  recipientEmail?: string
  /** Whether this item may auto-send via getNotifier().send() — see the module doc above. */
  canAutoSend: boolean
}

function submissionTitle(s: Submission): string {
  return String((s.formData as Record<string, unknown>)?.useCaseTitle || "Untitled idea")
}

/** The known internal reviewer for a submission, if any — its own assignee first, then the bureau's on-file reviewer. */
function knownRecipient(s: Submission): { name: string; email: string } | null {
  const name = getAssigneeName(s)
  const email = getAssigneeEmail(s)
  if (name && email) return { name, email }
  return assigneeForBusinessUnit(getBusinessUnit(s))
}

function needsInfoAction(s: Submission): DashboardAction {
  const bureau = getBusinessUnit(s)
  const bureauLabel = businessUnitLabel(bureau)
  const title = submissionTitle(s)
  return {
    id: `needs_info:${s.id}`,
    kind: "needs_info",
    submissionId: s.id,
    submissionTitle: title,
    bureau,
    bureauLabel,
    severity: "warning",
    message: `"${title}" (${bureauLabel}) is still waiting on a reply from the submitter.`,
    // No recipientName/Email — this would-be nudge is aimed at the submitter,
    // not an internal reviewer.
    canAutoSend: false,
  }
}

function unassignedAction(s: Submission): DashboardAction {
  const bureau = getBusinessUnit(s)
  const bureauLabel = businessUnitLabel(bureau)
  const title = submissionTitle(s)
  return {
    id: `unassigned:${s.id}`,
    kind: "unassigned",
    submissionId: s.id,
    submissionTitle: title,
    bureau,
    bureauLabel,
    severity: "warning",
    message: `"${title}" (${bureauLabel}) has no reviewer assigned yet.`,
    canAutoSend: false,
  }
}

function signoffNudgeAction(s: Submission): DashboardAction {
  const bureau = getBusinessUnit(s)
  const bureauLabel = businessUnitLabel(bureau)
  const title = submissionTitle(s)
  const recipient = knownRecipient(s)
  return {
    id: `signoff_nudge:${s.id}`,
    kind: "signoff_nudge",
    submissionId: s.id,
    submissionTitle: title,
    bureau,
    bureauLabel,
    severity: "critical",
    message: `"${title}" (${bureauLabel}) was approved and is awaiting bureau sign-off${recipient ? ` from ${recipient.name}` : ""}.`,
    recipientName: recipient?.name,
    recipientEmail: recipient?.email,
    canAutoSend: !!recipient,
  }
}

/**
 * Derives every Command Center action item for a scope, in one pass —
 * scoped and role-gated exactly like every other card in lib/dashboard/metrics.ts
 * (never counts a submission outside the scope's bureau/office).
 */
export function getDashboardActions(
  scope: DashboardScope,
  submissions: Submission[],
  tenant: TenantConfig = getTenant(),
): DashboardAction[] {
  const rows = scopedSubmissions(scope, submissions)
  const actions: DashboardAction[] = []

  for (const s of rows) {
    if (getStatus(s) === "needs_info") actions.push(needsInfoAction(s))
  }

  for (const s of rows) {
    const status = getStatus(s)
    const active = status === "submitted" || status === "in_review" || status === "needs_info"
    if (active && !getAssigneeEmail(s)) actions.push(unassignedAction(s))
  }

  if (tenantHasBureauTier(tenant)) {
    for (const s of rows) {
      if (getStatus(s) === "approved" && !getBureauSignoff(s)) actions.push(signoffNudgeAction(s))
    }
  }

  return actions
}

/**
 * Builds the single Notifier-ready message for a batch of actions, honoring
 * `canAutoSend` — an action that must stay a draft (see the module doc) never
 * contributes to the message and is never counted as sent. Returns `null`
 * when nothing in the batch may auto-send, so a caller can tell "drafted, not
 * sent" apart from "sent to N recipients" without re-deriving the guard.
 */
export function buildNotificationBatch(actions: DashboardAction[]): { message: string; count: number } | null {
  const sendable = actions.filter((a) => a.canAutoSend)
  if (sendable.length === 0) return null
  return { message: sendable.map((a) => a.message).join("\n"), count: sendable.length }
}
