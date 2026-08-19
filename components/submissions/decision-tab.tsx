"use client"

// "The decision" tab body for a DECIDED record (issue #206, mock `07
// Reviewer Detail - Decided.dc.html`, 07a): why it happened, Plumb's
// advisory read against it, and the last few messages with the submitter.
// Undecided records keep today's checklist body instead (see
// submission-detail.tsx's "Review" tab) — this component only ever renders
// once `status` is "approved" or "rejected".

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { KindTag } from "@/components/ui/kind-tag"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { DispositionControls } from "@/components/submissions/disposition-controls"
import type { SubmissionComment, SubmissionStatus } from "@/lib/reviewWorkflow"
import { formatKeystoneDate } from "@/components/dashboard/command-center-data"
import { cn } from "@/lib/utils"
import type { assistReviewer } from "@/app/actions"

type Assist = Awaited<ReturnType<typeof assistReviewer>>

const DISPOSITION_GERUND: Record<Assist["suggestedDisposition"], string> = {
  approve: "approving",
  reject: "rejecting",
  request_info: "requesting more info",
}

/** "Plumb recommended {x}; the reviewer's decision agrees." / "...; the reviewer decided otherwise." — null while there's no assist read to compare against. Deterministic: driven only by whether `suggestedDisposition` matches the recorded `decision`. */
export function plumbAgreementSentence(assist: Assist | null, decision: "approved" | "rejected"): string | null {
  if (!assist) return null
  const agrees = (decision === "approved" && assist.suggestedDisposition === "approve")
    || (decision === "rejected" && assist.suggestedDisposition === "reject")
  return `Plumb recommended ${DISPOSITION_GERUND[assist.suggestedDisposition]}; ${agrees ? "the reviewer's decision agrees" : "the reviewer decided otherwise"}.`
}

export function DecisionTab({
  reasonText,
  decision,
  status,
  busy,
  onApprove,
  onReject,
  onRequestInfo,
  reversibilityText,
  showDispositionButtons,
  assistantName,
  assisting,
  assist,
  comments,
  submitterFirstName,
  comment,
  onCommentChange,
  onSend,
  sendDisabled,
  onDraftWithPlumb,
  draftDisabled,
  onSeeAllConversation,
}: {
  reasonText: string
  decision: "approved" | "rejected"
  status: SubmissionStatus
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onRequestInfo: () => void
  reversibilityText: string
  showDispositionButtons: boolean
  assistantName: string
  assisting: boolean
  assist: Assist | null
  comments: SubmissionComment[]
  submitterFirstName: string
  comment: string
  onCommentChange: (v: string) => void
  onSend: () => void
  sendDisabled: boolean
  onDraftWithPlumb: () => void
  draftDisabled: boolean
  onSeeAllConversation: () => void
}) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const hasAnalysis = !!assist && (assist.strengths.length > 0 || assist.gaps.length > 0)
  const agreement = plumbAgreementSentence(assist, decision)
  const recent = comments.slice(-3)

  return (
    <div className="flex flex-col gap-[18px]">
      <div className={cn("space-y-3 rounded-lg border border-border-subtle bg-card p-5 shadow-sm border-l-[3px]", decision === "approved" ? "border-l-healthy" : "border-l-alert")}>
        <span className="ks-microlabel">Why it was {decision === "approved" ? "approved" : "rejected"}</span>
        <p className="max-w-[70ch] text-[15px] leading-[1.65] text-foreground">{reasonText}</p>
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {showDispositionButtons && (
            <DispositionControls
              status={status}
              busy={busy}
              chipStyle
              onApprove={onApprove}
              onRequestInfo={onRequestInfo}
              onReject={onReject}
            />
          )}
          <span className="ml-1 text-[12px] text-foreground-faint">{reversibilityText}</span>
        </div>
      </div>

      <div className="space-y-3.5 rounded-lg border border-border-subtle bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PlumbMark className="h-[15px] w-[15px] shrink-0" />
            <span className="ks-microlabel">{assistantName}</span>
            <KindTag>Advisory</KindTag>
          </div>
          {hasAnalysis && (
            <button
              type="button"
              className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
              aria-expanded={showAnalysis}
              onClick={() => setShowAnalysis((v) => !v)}
            >
              {showAnalysis ? "Hide the full analysis" : "Read the full analysis"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAnalysis && "rotate-180")} aria-hidden="true" />
            </button>
          )}
        </div>

        {assisting ? (
          <p className="text-[14.5px] text-muted-foreground">{assistantName} is reading this submission…</p>
        ) : assist ? (
          <p className="text-[14.5px] leading-[1.6] text-foreground">
            {assist.verdict} {agreement}
          </p>
        ) : null}

        {hasAnalysis && showAnalysis && assist && (
          <div className="grid gap-4 border-t border-border-subtle pt-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium text-healthy-foreground">Strengths</div>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {assist.strengths.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-alert">Gaps flagged</div>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {assist.gaps.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border-subtle bg-card p-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="ks-microlabel">Conversation with the submitter</span>
          <button type="button" className="text-[13px] font-semibold text-primary hover:underline" onClick={onSeeAllConversation}>
            See all
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {recent.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
          {recent.map((c, i) => (
            <div key={c.id} className={cn("flex flex-col gap-[3px]", i > 0 && "border-l-2 border-border-subtle pl-[18px]")}>
              <div className="text-[12.5px] text-muted-foreground">
                <span className="font-semibold text-foreground">{c.authorName}</span> · {c.authorRole} · {formatKeystoneDate(c.createdAt)}
              </div>
              <div className="max-w-[68ch] text-[14px] leading-[1.6]">{c.body}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border-subtle pt-2.5">
          <Textarea
            id="comment-box"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder={`Reply to ${submitterFirstName}…`}
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={draftDisabled} onClick={onDraftWithPlumb}>
              <PlumbMark className="mr-1.5 h-3.5 w-3.5" />Draft with {assistantName}
            </Button>
            <Button size="sm" disabled={sendDisabled} onClick={onSend}>
              Send &amp; request info
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
