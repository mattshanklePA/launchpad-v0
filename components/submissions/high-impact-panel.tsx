"use client"

// The high-impact determination block — Scout/Plumb's recommendation plus
// the reviewer's own three-way determination — extracted so RD-6 (issue
// #207) step 2 and RD-5's "Governance record" tab render the exact same
// markup and behavior instead of two copies drifting apart. No logic
// changed from the inline version submission-detail.tsx used before: same
// `determineHighImpact` read, same `patchSubmissionFormData` write via the
// caller's `onSetHighImpact`.

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { HighImpactResult } from "@/lib/highImpactDetermination"
import type { FormData } from "@/lib/steps"
import { STATUS_BADGE_CLASS } from "@/lib/statusTokens"
import { cn } from "@/lib/utils"

export function HighImpactPanel({
  fd,
  highImpactRec,
  busy,
  onSetHighImpact,
}: {
  fd: FormData
  highImpactRec: HighImpactResult
  busy: boolean
  onSetHighImpact: (next: "high_impact" | "presumed_not_high_impact" | "not_high_impact") => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Recommended:</span>
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.06em]",
            highImpactRec.recommendation === "yes" ? STATUS_BADGE_CLASS.alert : STATUS_BADGE_CLASS.neutral,
          )}
        >
          {highImpactRec.recommendation === "yes" ? "High-impact" : "Not high-impact"}
        </Badge>
      </div>
      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        {highImpactRec.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t pt-2">
        <span className="text-sm text-muted-foreground">Reviewer determination:</span>
        <Button size="sm" variant={fd.highImpact === "high_impact" ? "default" : "outline"} disabled={busy} onClick={() => onSetHighImpact("high_impact")}>
          High-impact
        </Button>
        <Button size="sm" variant={fd.highImpact === "presumed_not_high_impact" ? "default" : "outline"} disabled={busy} onClick={() => onSetHighImpact("presumed_not_high_impact")}>
          Presumed, but not high-impact
        </Button>
        <Button size="sm" variant={fd.highImpact === "not_high_impact" ? "default" : "outline"} disabled={busy} onClick={() => onSetHighImpact("not_high_impact")}>
          Not high-impact
        </Button>
      </div>
    </div>
  )
}
