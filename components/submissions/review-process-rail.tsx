"use client"

// RD-6 (issue #207): the right rail for the in-review guided process (mock
// `08 Reviewer Detail - Rationalization.dc.html`), replacing RD-5's
// ReviewerRail while a record is undecided — an identity card, the step
// progress list, and always-visible early exits (Request info / Reject,
// both driven by the same handlers step 5 uses). RD-5's "The submission" and
// "Activity" cards move below these unchanged: ReviewerRail's own output
// *is* exactly those two cards, so this renders it wholesale rather than
// duplicating it.

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { KindTag } from "@/components/ui/kind-tag"
import { StatusPill } from "@/components/ui/status-pill"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { ReviewerRail } from "@/components/submissions/reviewer-rail"
import { STEP_RAIL_LABEL } from "@/components/submissions/review-process"
import type { Submission } from "@/lib/submissions"
import type { TenantConfig } from "@/lib/tenant"
import type { ActivityEvent } from "@/lib/activity"
import { LIFECYCLE_STAGE_LABEL, type LifecycleStage } from "@/lib/reviewWorkflow"
import type { ReviewStep, ReviewStepKey } from "@/lib/reviewSteps"
import { formatKeystoneDate } from "@/components/dashboard/command-center-data"
import { cn } from "@/lib/utils"

type EarlyExitAction = "request_info" | "reject"

function EarlyExitDialog({
  action,
  onOpenChange,
  assistantName,
  comment,
  onCommentChange,
  onSend,
  sendDisabled,
  onDraftWithPlumb,
  draftDisabled,
  onReject,
  busy,
}: {
  action: EarlyExitAction | null
  onOpenChange: (open: boolean) => void
  assistantName: string
  comment: string
  onCommentChange: (v: string) => void
  onSend: () => void
  sendDisabled: boolean
  onDraftWithPlumb: () => void
  draftDisabled: boolean
  onReject: () => void
  busy: boolean
}) {
  return (
    <Dialog open={!!action} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{action === "reject" ? "Reject" : "Request info"}</DialogTitle>
        </DialogHeader>
        {action === "reject" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Rejects the submission now — reversible until sign-off, the same as approving.</p>
            <Textarea value={comment} onChange={(e) => onCommentChange(e.target.value)} placeholder="Reason for the submitter (optional)…" rows={3} />
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => { onReject(); onOpenChange(false) }}>
              Confirm reject
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea value={comment} onChange={(e) => onCommentChange(e.target.value)} placeholder="Write feedback to the submitter…" rows={3} />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={draftDisabled} onClick={onDraftWithPlumb}>
                <PlumbMark className="mr-1.5 h-3.5 w-3.5" />Draft with {assistantName}
              </Button>
              <Button size="sm" disabled={sendDisabled} onClick={() => { onSend(); onOpenChange(false) }}>
                Send &amp; request info
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ReviewProcessRail({
  submission,
  tenant,
  activity,
  lifecycleStage,
  title,
  unitLabel,
  submitterName,
  submittedAt,
  steps,
  currentStepKey,
  onNavigateStep,
  awaitingPlumb,
  draftedByPlumb,
  assistantName,
  busy,
  onReject,
  comment,
  onCommentChange,
  onSend,
  sendDisabled,
  onDraftWithPlumb,
  draftDisabled,
}: {
  submission: Submission
  tenant: TenantConfig
  activity: ActivityEvent[]
  lifecycleStage: LifecycleStage
  title: string
  unitLabel: string
  submitterName: string
  submittedAt: string
  steps: ReviewStep[]
  currentStepKey: ReviewStepKey
  onNavigateStep: (key: ReviewStepKey) => void
  /** Mock 09: before Plumb's read resolves, the progress list shows "Waiting on Plumb" instead of highlighting a real step. */
  awaitingPlumb?: boolean
  draftedByPlumb: number
  assistantName: string
  busy: boolean
  onReject: () => void
  comment: string
  onCommentChange: (v: string) => void
  onSend: () => void
  sendDisabled: boolean
  onDraftWithPlumb: () => void
  draftDisabled: boolean
}) {
  const [exitAction, setExitAction] = useState<EarlyExitAction | null>(null)
  const totalSteps = steps.length
  const settledCount = steps.filter((s) => s.settled).length
  const lastStep = steps[steps.length - 1]

  const railLabel = (step: ReviewStep) =>
    step.key === "governance" ? `${STEP_RAIL_LABEL.governance} · ${draftedByPlumb} drafted by ${assistantName}` : STEP_RAIL_LABEL[step.key]

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-card p-5">
        <div className="flex items-center gap-1.5">
          <KindTag>{LIFECYCLE_STAGE_LABEL[lifecycleStage]}</KindTag>
          <StatusPill status="attention">In review</StatusPill>
        </div>
        <p className="font-heading text-[16.5px] font-bold leading-[1.25] text-foreground">{title}</p>
        <p className="text-[13px] leading-[1.5] text-muted-foreground">
          {unitLabel} · {submitterName} · submitted {formatKeystoneDate(submittedAt)}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-card p-5">
        <span className="ks-microlabel">Your progress · {settledCount} of {totalSteps}</span>
        <div className="flex flex-col gap-2.5 text-[13px]">
          {awaitingPlumb && (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-keystone-basalt" aria-hidden="true" />
              <span>
                <span className="font-semibold text-foreground">Waiting on Plumb</span>
                <span className="block text-muted-foreground">Similar-use-case check running</span>
              </span>
            </div>
          )}
          {steps.map((step) => {
            const isCurrent = !awaitingPlumb && step.key === currentStepKey
            const blocks = step.key === "cluster" && !step.settled
            return (
              <button
                key={step.key}
                type="button"
                className="flex items-start gap-2.5 text-left"
                onClick={() => onNavigateStep(step.key)}
              >
                {step.settled ? (
                  <Check className="mt-0.5 h-[15px] w-[15px] shrink-0 text-healthy-foreground" aria-hidden="true" />
                ) : (
                  <span
                    className={cn(
                      "mt-0.5 h-[15px] w-[15px] shrink-0 rounded-full border",
                      isCurrent ? "border-2 border-keystone-basalt" : "border-border-default",
                    )}
                    aria-hidden="true"
                  />
                )}
                <span>
                  <span className={cn(isCurrent ? "font-semibold text-foreground" : step.settled ? "text-foreground" : "text-foreground-faint")}>
                    {railLabel(step)}
                  </span>
                  {isCurrent && (
                    <span className="block text-muted-foreground">On screen now{blocks ? " · blocks approval" : ""}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setExitAction("request_info")}>
            Request info
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExitAction("reject")}>
            Reject
          </Button>
        </div>
        <p className="text-[12px] leading-[1.5] text-foreground-faint">
          Approve at step {lastStep?.index ?? totalSteps}. Every answer is reversible until {tenant.tierLabels.unit.toLowerCase()} sign-off.
        </p>
      </div>

      <EarlyExitDialog
        action={exitAction}
        onOpenChange={(open) => { if (!open) setExitAction(null) }}
        assistantName={assistantName}
        comment={comment}
        onCommentChange={onCommentChange}
        onSend={onSend}
        sendDisabled={sendDisabled}
        onDraftWithPlumb={onDraftWithPlumb}
        draftDisabled={draftDisabled}
        onReject={onReject}
        busy={busy}
      />

      <div className="border-t border-border-subtle pt-[18px]">
        <ReviewerRail submission={submission} tenant={tenant} activity={activity} />
      </div>
    </div>
  )
}
