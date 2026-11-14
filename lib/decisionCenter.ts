// Decision Center candidate selector (RD-1) — lifted out of app/decisions/page.tsx
// so the Command Center's Decision Center row (components/dashboard/command-center.tsx)
// counts exactly the same candidates the /decisions page itself lists, rather
// than a second, possibly-diverging count. `DecisionCenter` (components/admin/decision-center.tsx)
// does not filter its `submissions` prop further — every submission passed in
// is a funding candidate — so the count is this selector's output length.
//
// Issue #213 item 1: a submission only belongs here once a reviewer has
// approved it — the same boundary `getLifecycleStage` already draws between
// an "idea" and a "use case". Everything still in draft/submitted/in_review/
// needs_info/rejected is awaiting its first review, not a funding decision,
// no matter how it scores on readiness. This is the single choke point for
// that gate — every caller (app/decisions/page.tsx, app/admin/page.tsx,
// command-center.tsx) must route through here rather than re-deriving it.

import type { Submission } from "@/lib/submissions"
import { visibleSubmissions, getStatus } from "@/lib/reviewWorkflow"
import { scopedSubmissions } from "@/lib/dashboard/metrics"
import type { DashboardScope } from "@/lib/dashboard/scope"

export type DecisionCenterViewer = { role: string; email?: string; businessUnit?: string; office?: string } | null

/** The submissions `/decisions` shows for a given viewer — role/bureau/office roll-down via `visibleSubmissions`, then narrowed to submissions a reviewer has approved. */
//
// F3-6 item 6: pass the dashboard `scope` being viewed and the candidates are
/// narrowed to it (an office view counts that office's ideas only). Omitted, or
/// department-wide, it is the viewer's full list, as /decisions shows it.
export function decisionCenterCandidates(
  submissions: Submission[],
  viewer: DecisionCenterViewer,
  scope?: DashboardScope,
): Submission[] {
  const visible = visibleSubmissions(submissions, viewer)
  const inScope = scope ? scopedSubmissions(scope, visible) : visible
  return inScope.filter((s) => getStatus(s) === "approved")
}
