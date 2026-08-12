"use client"

// Zone 1 of the reviewer detail redesign (issue #145): the assistant's
// rolled-up recommendation, what's blocking approval, and one primary
// action — "Approve as recommended" once the assistant recommends approving
// and nothing blocks it, or "Resolve the blocker" (jumping to the relevant
// checklist item) otherwise. Advisory only: this never sets a determination
// itself, it only surfaces `assist`/`blockingText` the caller already
// computed from the same lib/* logic the rest of the page uses.

import { useState } from "react"
import { ChevronDown, Loader2, ShieldCheck, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlossaryTerm } from "@/components/launchpad/glossary-term"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { cn } from "@/lib/utils"
import { STATUS_BADGE_CLASS, STATUS_BORDER_L_CLASS, type KeystoneStatus } from "@/lib/statusTokens"
import type { assistReviewer } from "@/app/actions"

type Assist = Awaited<ReturnType<typeof assistReviewer>>

const DISPOSITION_LABEL: Record<Assist["suggestedDisposition"], string> = {
  approve: "Approve",
  request_info: "Request info",
  reject: "Reject",
}

// Keystone status colors (lib/statusTokens.ts): approve reads healthy, a
// request for more info reads attention (amber, badge-only — never a page
// background wash), reject reads alert.
const DISPOSITION_KEYSTONE: Record<Assist["suggestedDisposition"], KeystoneStatus> = {
  approve: "healthy",
  request_info: "attention",
  reject: "alert",
}

export function DecisionHeader({
  assistantName,
  assisting,
  assist,
  blockingText,
  busy,
  onApprove,
  onResolveBlocker,
}: {
  assistantName: string
  assisting: boolean
  assist: Assist | null
  blockingText: string | null
  busy: boolean
  onApprove: () => void
  onResolveBlocker: () => void
}) {
  const [showAnalysis, setShowAnalysis] = useState(false)
  const hasAnalysis = !!assist && (assist.strengths.length > 0 || assist.gaps.length > 0)
  const primaryLabel = blockingText ? "Resolve the blocker" : "Approve as recommended"

  return (
    <section aria-labelledby="decision-heading" className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <PlumbMark className="h-4 w-4" />
        <h2 id="decision-heading" className="text-sm font-semibold">
          {assistantName}&apos;s recommendation
        </h2>
        <Badge variant="outline" className="gap-1 text-[10px] bg-muted text-muted-foreground">
          <GlossaryTerm term="advisory">Advisory</GlossaryTerm>
        </Badge>
      </div>

      {!assisting && assist && (
        <div className="flex flex-wrap items-start gap-2">
          <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", STATUS_BADGE_CLASS[DISPOSITION_KEYSTONE[assist.suggestedDisposition]])}>
            {DISPOSITION_LABEL[assist.suggestedDisposition]}
          </Badge>
          <p className="text-sm leading-relaxed">{assist.verdict}</p>
        </div>
      )}

      <div
        className={cn(
          "flex items-start gap-2 rounded-md border border-l-4 bg-card p-3 text-sm text-foreground",
          STATUS_BORDER_L_CLASS[assisting ? "neutral" : blockingText ? "attention" : "healthy"],
        )}
      >
        {assisting ? (
          <Loader2 className="mt-0.5 h-4 w-4 flex-none animate-spin text-muted-foreground" aria-hidden="true" />
        ) : blockingText ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-attention-foreground" aria-hidden="true" />
        ) : (
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-healthy-foreground" aria-hidden="true" />
        )}
        <span>
          {assisting
            ? `${assistantName} is reviewing this submission…`
            : blockingText ?? "Nothing is blocking approval right now."}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!assisting && (
          <Button onClick={blockingText ? onResolveBlocker : onApprove} disabled={busy}>
            {primaryLabel}
          </Button>
        )}
        {hasAnalysis && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            aria-expanded={showAnalysis}
            aria-controls="assistant-analysis"
            onClick={() => setShowAnalysis((v) => !v)}
          >
            {showAnalysis ? "Hide" : "See"} {assistantName}&apos;s full analysis
            <ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition-transform", showAnalysis && "rotate-180")} aria-hidden="true" />
          </Button>
        )}
      </div>

      {hasAnalysis && showAnalysis && assist && (
        <div id="assistant-analysis" className="grid gap-4 border-t pt-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium text-healthy-foreground">Strengths</div>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {assist.strengths.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-alert">Gaps to probe</div>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {assist.gaps.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
