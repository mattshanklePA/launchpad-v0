// Decision Center candidate selector (RD-1) — lifted out of app/decisions/page.tsx
// so the Command Center's Decision Center row (components/dashboard/command-center.tsx)
// counts exactly the same candidates the /decisions page itself lists, rather
// than a second, possibly-diverging count. `DecisionCenter` (components/admin/decision-center.tsx)
// does not filter its `submissions` prop further — every submission passed in
// is "awaiting review" — so the count is this selector's output length.

import type { Submission } from "@/lib/submissions"
import { visibleSubmissions } from "@/lib/reviewWorkflow"

export type DecisionCenterViewer = { role: string; email?: string; businessUnit?: string; office?: string } | null

/** The submissions `/decisions` shows for a given viewer — role/bureau/office roll-down via `visibleSubmissions`. */
export function decisionCenterCandidates(submissions: Submission[], viewer: DecisionCenterViewer): Submission[] {
  return visibleSubmissions(submissions, viewer)
}
