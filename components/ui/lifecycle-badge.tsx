// Idea vs. Use Case badge (issue #160) — the single place that renders the
// two-stage lifecycle so submission lists, dashboards, and Decision Center
// can't drift onto different labels/colors for the same status.

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getLifecycleStage, LIFECYCLE_STAGE_LABEL, lifecycleStageBadgeClasses } from "@/lib/reviewWorkflow"
import type { Submission } from "@/lib/submissions"

export function LifecycleBadge({ submission, className }: { submission: Submission; className?: string }) {
  const stage = getLifecycleStage(submission)
  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", lifecycleStageBadgeClasses(stage), className)}
    >
      {LIFECYCLE_STAGE_LABEL[stage]}
    </Badge>
  )
}
