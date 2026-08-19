"use client"

// The NIST AI RMF confirm/override block — extracted so RD-6 (issue #207)
// step 3 and RD-5's "Governance record" tab render the exact same markup and
// behavior instead of two copies drifting apart. No change to the RMF review
// logic itself: `confirmRmfProfile`/`overrideRmfProfile` stay owned by the
// caller (submission-detail.tsx), this only renders their result and calls
// them back.

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Check, ShieldCheck } from "lucide-react"
import {
  rmfBadgeClass,
  RMF_OVERALL_LABELS,
  type RmfRiskLevel,
} from "@/lib/nistRmf"
import type { ResolvedRmfProfile } from "@/lib/rmfProfileReview"
import { cn } from "@/lib/utils"

export function RmfPanel({
  resolvedRmf,
  busy,
  overriding,
  setOverriding,
  overrideNote,
  setOverrideNote,
  onConfirm,
  onOverride,
}: {
  resolvedRmf: ResolvedRmfProfile
  busy: boolean
  overriding: boolean
  setOverriding: (v: boolean) => void
  overrideNote: string
  setOverrideNote: (v: string) => void
  onConfirm: () => void
  onOverride: (level: RmfRiskLevel) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", rmfBadgeClass(resolvedRmf.effectiveOverall))} title={resolvedRmf.profile.rationale}>
          {RMF_OVERALL_LABELS[resolvedRmf.effectiveOverall]}
        </Badge>
        {resolvedRmf.isProposal && (
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.06em] bg-muted text-muted-foreground">proposed · awaiting reviewer</Badge>
        )}
      </div>
      {resolvedRmf.review && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          {resolvedRmf.review.decision === "overridden"
            ? `Overridden to "${RMF_OVERALL_LABELS[resolvedRmf.review.overriddenOverall || resolvedRmf.review.proposedOverall]}" (proposed "${RMF_OVERALL_LABELS[resolvedRmf.review.proposedOverall]}")`
            : "Confirmed as proposed"}
          {" "}by {resolvedRmf.review.byName}, {new Date(resolvedRmf.review.at).toLocaleDateString()}
          {resolvedRmf.review.notes ? ` — "${resolvedRmf.review.notes}"` : ""}
        </p>
      )}
      {!overriding ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
          <span className="text-sm text-muted-foreground">
            {resolvedRmf.review ? "Reviewer decision:" : "Proposed, confirm or override:"}
          </span>
          <Button size="sm" disabled={busy} onClick={onConfirm}>
            <Check className="w-3.5 h-3.5 mr-1.5" />Confirm
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setOverriding(true)}>
            Override
          </Button>
        </div>
      ) : (
        <div className="space-y-2 border-t pt-2">
          <span className="text-sm text-muted-foreground">Set the overall RMF level:</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RMF_OVERALL_LABELS) as RmfRiskLevel[]).map((level) => (
              <Button key={level} size="sm" variant="outline" disabled={busy} onClick={() => onOverride(level)}>
                {RMF_OVERALL_LABELS[level]}
              </Button>
            ))}
          </div>
          <Textarea
            value={overrideNote}
            onChange={(e) => setOverrideNote(e.target.value)}
            placeholder="Reason for override (optional)..."
            rows={2}
          />
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOverriding(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
