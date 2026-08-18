// Idea vs. Use Case badge (issue #160) — the single place that renders the
// two-stage lifecycle so submission lists, dashboards, and Decision Center
// can't drift onto different labels/colors for the same status. "Idea" and
// "Use case" are kind words, not a review status — KindTag (RD-0, issue #201).

import { KindTag } from "@/components/ui/kind-tag"
import { getLifecycleStage, LIFECYCLE_STAGE_LABEL } from "@/lib/reviewWorkflow"
import type { Submission } from "@/lib/submissions"

export function LifecycleBadge({ submission, className }: { submission: Submission; className?: string }) {
  const stage = getLifecycleStage(submission)
  return <KindTag className={className}>{LIFECYCLE_STAGE_LABEL[stage]}</KindTag>
}
