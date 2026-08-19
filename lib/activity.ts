// Reviewer-detail right rail "Activity" timeline (issue #206) — a
// reverse-chronological read of the events already captured on a
// submission. Purely derived: nothing here is a new persisted field except
// where noted, so an event with no stored timestamp is left out rather than
// invented (e.g. Plumb's advisory read is never cached with a completion
// time today, so it never appears — see the comment below).

import type { Submission } from "@/lib/submissions"
import { getStatus, getComments } from "@/lib/reviewWorkflow"
import { getBureauSignoff, getDepartmentApproval } from "@/lib/bureauSignoff"
import { getRationalization } from "@/lib/rationalization"

export type ActivityEvent = {
  at: string
  label: string
}

/**
 * Builds a submission's activity feed, newest first. Every entry's `at` is a
 * timestamp already stored on the submission — there is no generic
 * append-only activity log in the data model, so this reads the same
 * scattered fields the rest of the reviewer detail page reads
 * (`lib/bureauSignoff.ts`, `lib/rationalization.ts`, `lib/reviewWorkflow.ts`)
 * rather than adding a new one.
 */
export function buildActivity(s: Submission): ActivityEvent[] {
  const events: ActivityEvent[] = []
  const fd = s.formData as Record<string, unknown>

  // Decision + bureau sign-off are the same recorded action (setStatus
  // patches both in one call for bureau-tier tenants — see
  // submission-detail.tsx's setStatus) so they share one event. Tenants
  // without a bureau tier (uspto/dow/es2) never record who decided or when
  // — a decided status with no sign-off patch has no timestamp to show, so
  // no decision event is added for them; the header/rail fall back the same
  // way (do not fake a date or a name).
  const status = getStatus(s)
  const signoff = getBureauSignoff(s)
  if ((status === "approved" || status === "rejected") && signoff) {
    const verb = status === "approved" ? "Approved" : "Rejected"
    events.push({ at: signoff.signedOffAt, label: `${verb} by ${signoff.signedOffByName}` })
  }

  const departmentApproval = getDepartmentApproval(s)
  if (departmentApproval) {
    events.push({
      at: departmentApproval.at,
      label: departmentApproval.decision === "approved"
        ? `Department approval confirmed by ${departmentApproval.byName}`
        : `Department rejection confirmed by ${departmentApproval.byName}`,
    })
  }

  const rationalization = getRationalization(s)
  if (rationalization) {
    const verb = rationalization.decision === "consolidated" ? "consolidated" : "keep-separate"
    events.push({ at: rationalization.decidedAt, label: `Cluster ${rationalization.clusterId} marked ${verb}` })
  }

  for (const c of getComments(s)) {
    if (c.authorRole !== "reviewer" && c.authorRole !== "admin") continue
    events.push({ at: c.createdAt, label: `${c.authorName} replied` })
  }

  // No field anywhere caches when Plumb's advisory read completed (it's
  // re-run client-side on every page load, never saved to form_data) — so
  // this branch never fires today. Left in place, gated on a timestamp
  // actually being stored, so a future cache add lights it up rather than
  // needing a second pass through this file.
  const plumbReadAt = fd.assistCompletedAt
  if (typeof plumbReadAt === "string" && plumbReadAt) {
    events.push({ at: plumbReadAt, label: "Plumb analysis completed" })
  }

  const submitterName = (fd.submitterName as string) || "Anonymous"
  events.push({ at: s.submittedAt, label: `Submitted by ${submitterName}` })

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}
