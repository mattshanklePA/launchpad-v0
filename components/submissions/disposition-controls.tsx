"use client"

// The Disposition checklist item's three controls (ES2-12 A), pulled out of
// submission-detail.tsx so the one thing that was lying — which button looks
// like the current decision — is a pure function with its own test.
//
// The bug: Approve rendered as the filled primary button and Reject as an
// outline button regardless of the record's status. On a rejected submission
// the reviewer saw a REJECTED badge, a signed rejection with reasoning, and a
// bright blue Approve beside a greyed-out Reject — it read as if Approve were
// the pending action. The High-impact determination control a few items below
// already gets this right: the button matching the recorded value renders
// `default`, the others render `outline`. This does the same.
//
// Both buttons stay enabled either way. A reviewer can still reverse a
// decision; what changes is which one is visually *current*, not which ones
// are available. Approve's `blockReason` disable (rationalization pending) is
// unchanged.

import { Button } from "@/components/ui/button"
import { Check, X, MessageSquare } from "lucide-react"
import type { SubmissionStatus } from "@/lib/reviewWorkflow"
import { cn } from "@/lib/utils"

type DispositionAction = "approve" | "reject"
type DispositionVariant = "default" | "outline"

/**
 * Which button variant the Approve/Reject pair renders for a recorded status.
 * Approve stays primary until a rejection is on the record — that's the
 * pre-decision look ISS-8 tuned, and it must not change for a submission that
 * has yet to be decided.
 */
export function dispositionButtonVariant(action: DispositionAction, status: SubmissionStatus): DispositionVariant {
  if (action === "reject") return status === "rejected" ? "default" : "outline"
  return status === "rejected" ? "outline" : "default"
}

// The components-sheet "disposition trio" look (00 Components Sheet.dc.html,
// DIVERGENCES.md item 9): once a decision is on the record, it renders as a
// filled color chip with a check/x mark rather than a filled button — a step
// beyond `dispositionButtonVariant`'s default/outline split, reserved for
// callers that want that specific decided-state visual (reviewer-detail's
// "Why it was {approved|rejected}" card, issue #206). Every other caller
// keeps the plain three-button trio unchanged.
const DECISION_CHIP_CLASS = "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white"

/** The filled chip half of the disposition trio, on its own — for callers (the reviewer-detail header, issue #206) that show the made decision somewhere other than beside its own Approve/Reject/Request info actions. */
export function DecisionChip({ decision, className }: { decision: "approved" | "rejected"; className?: string }) {
  const approved = decision === "approved"
  return (
    <span className={cn(DECISION_CHIP_CLASS, approved ? "bg-healthy" : "bg-alert", className)}>
      {approved ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
      {approved ? "Approved" : "Rejected"}
    </span>
  )
}

export function DispositionControls({
  status,
  busy,
  blockReason,
  chipStyle,
  onApprove,
  onRequestInfo,
  onReject,
}: {
  status: SubmissionStatus
  busy: boolean
  blockReason?: string
  /** Renders the decided outcome (approved/rejected only) as a filled chip instead of a button. No effect while undecided. */
  chipStyle?: boolean
  onApprove: () => void
  onRequestInfo: () => void
  onReject: () => void
}) {
  const decided = chipStyle && (status === "approved" || status === "rejected")

  if (decided) {
    const approved = status === "approved"
    return (
      <div className="flex flex-wrap items-center gap-2">
        <DecisionChip decision={status === "approved" ? "approved" : "rejected"} />
        <Button variant="outline" onClick={approved ? onReject : onApprove} disabled={busy}>
          {approved ? <X className="w-4 h-4 mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
          {approved ? "Reject" : "Approve"}
        </Button>
        <Button variant="ghost" onClick={onRequestInfo} disabled={busy}>
          <MessageSquare className="w-4 h-4 mr-1.5" />Request info
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant={dispositionButtonVariant("approve", status)} onClick={onApprove} disabled={busy || !!blockReason} title={blockReason}>
        <Check className="w-4 h-4 mr-1.5" />Approve
      </Button>
      <Button variant="outline" onClick={onRequestInfo} disabled={busy}>
        <MessageSquare className="w-4 h-4 mr-1.5" />Request info
      </Button>
      <Button variant={dispositionButtonVariant("reject", status)} onClick={onReject} disabled={busy}>
        <X className="w-4 h-4 mr-1.5" />Reject
      </Button>
    </div>
  )
}
