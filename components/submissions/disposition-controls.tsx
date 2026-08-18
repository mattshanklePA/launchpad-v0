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

export function DispositionControls({
  status,
  busy,
  blockReason,
  onApprove,
  onRequestInfo,
  onReject,
}: {
  status: SubmissionStatus
  busy: boolean
  blockReason?: string
  onApprove: () => void
  onRequestInfo: () => void
  onReject: () => void
}) {
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
