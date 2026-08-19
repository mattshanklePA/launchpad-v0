"use client"

// RD-6 (issue #207) section 4, mock `09 Reviewer Detail - Plumb Loading.dc.html`
// — the guided process's shell before Plumb's read resolves. Same header
// shell as ReviewProcess (ProcessHeaderCard), a staged-progress card
// (components/launchpad/plumb-progress.tsx) plus a "you don't have to wait"
// escape hatch, and the rail's progress list reads "Waiting on Plumb". The
// escape hatch and the rail's step rows both call `onSkipToSteps` — the
// submission is already loaded, so there's nothing to actually wait on to
// start working the steps; only the advisory read is still in flight.

import { Button } from "@/components/ui/button"
import { ProcessHeaderCard } from "@/components/submissions/review-process"
import { PlumbProgress } from "@/components/launchpad/plumb-progress"

export function ReviewProcessLoading({
  submissionId,
  totalSteps,
  reviewerName,
  assistantName,
  governanceDone,
  recommendationDone,
  onSkipToSteps,
}: {
  submissionId: string
  totalSteps: number
  reviewerName: string
  assistantName: string
  governanceDone: boolean
  recommendationDone: boolean
  onSkipToSteps: () => void
}) {
  return (
    <div className="flex flex-col gap-[18px]">
      <ProcessHeaderCard
        eyebrow={`Review · ${submissionId.slice(0, 8)} · just submitted`}
        title={`${assistantName} reads it before you do`}
        lead={`Up to 35 seconds. It checks for duplicates, drafts the governance fields, and writes an advisory recommendation.`}
        stepIndex={null}
        totalSteps={totalSteps}
        reviewerName={reviewerName}
      />

      <PlumbProgress assistantName={assistantName} governanceDone={governanceDone} recommendationDone={recommendationDone} />

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border-subtle bg-card p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-foreground">You don&apos;t have to wait</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            The submission itself is ready to read, and the decision buttons stay live. {assistantName}&apos;s read arrives as advice, not a gate.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSkipToSteps}>
          Read the submission
        </Button>
      </div>
    </div>
  )
}
