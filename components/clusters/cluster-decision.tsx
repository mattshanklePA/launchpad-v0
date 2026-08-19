"use client"

// RD-4 footer decision card (mock A2 Cluster) — the same
// buildRationalizationPatch + patchSubmissionFormData write
// components/admin/rationalization-panel.tsx uses, lifted into
// lib/rationalizationActions.ts so neither surface duplicates the write.
// Exported so RD-6 (issue #206, reviewer-path step 1) can reuse it.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import type { Submission } from "@/lib/submissions"
import { getSession } from "@/lib/auth"
import type { RationalizationCluster, RationalizationDecision, Rationalization } from "@/lib/rationalization"
import { applyRationalizationDecision, undoRationalizationDecision } from "@/lib/rationalizationActions"
import { spellCount } from "@/components/dashboard/command-center-data"

export function ClusterDecision({
  cluster,
  members,
  decision,
  leadId,
  onDecided,
}: {
  cluster: RationalizationCluster
  members: Submission[]
  decision: Rationalization | undefined
  /** The tentative (pre-decision) or recorded (post-decision) lead's submission id. */
  leadId: string
  onDecided: () => void | Promise<void>
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  const count = cluster.memberIds.length
  const lead = members.find((m) => m.id === leadId)
  const leadTitle = lead?.formData.useCaseTitle || "the lead use case"
  const otherCount = count - 1

  const decide = async (nextDecision: RationalizationDecision) => {
    setBusy(true)
    try {
      const session = getSession()
      await applyRationalizationDecision(cluster, nextDecision, {
        leadSubmissionId: nextDecision === "consolidated" ? leadId : undefined,
        decidedBy: session?.name || session?.email || "Reviewer",
        decidedAt: new Date().toISOString(),
      })
      await onDecided()
      toast({
        title: nextDecision === "consolidated" ? "Consolidated into lead" : "Kept separate and linked",
        description: `Clears the rationalization block on all ${count} submissions.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Couldn't record the decision",
        description: error instanceof Error ? error.message : "Something went wrong. Try again.",
      })
    } finally {
      setBusy(false)
    }
  }

  const undo = async () => {
    setBusy(true)
    try {
      await undoRationalizationDecision(cluster)
      await onDecided()
      toast({ title: "Decision undone", description: "The cluster is pending rationalization again." })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Couldn't undo the decision",
        description: error instanceof Error ? error.message : "Something went wrong. Try again.",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-4 rounded-md border border-border-subtle bg-card p-5 shadow-sm sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-bold text-foreground">Your call. Either choice clears the block on all {spellCount(count).toLowerCase()}.</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Keeping them separate records the overlap and leaves each program office its own approval. Consolidating makes{" "}
          {leadTitle} the lead and links the other{otherCount === 1 ? "" : "s"} beneath it.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {decision ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={undo}>
            Undo decision
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => decide("keep_separate")}>
              Keep separate and link
            </Button>
            <Button type="button" disabled={busy} onClick={() => decide("consolidated")}>
              Consolidate into lead
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
