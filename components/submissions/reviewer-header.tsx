"use client"

// Reviewer detail header card (issue #206, mock `07 Reviewer Detail -
// Decided.dc.html`): basalt-600 hero stating what this record is and, once
// it's decided, who decided it and how — visible on every tab. An undecided
// record shows the ordinary `StatusPill` in the same slot instead (DIVERGENCES.md
// item 8's "one badge system").

import { StatusPill } from "@/components/ui/status-pill"
import { DecisionChip } from "@/components/submissions/disposition-controls"
import { LIFECYCLE_STAGE_LABEL, STATUS_LABEL, type LifecycleStage, type SubmissionStatus } from "@/lib/reviewWorkflow"
import { formatKeystoneDate } from "@/components/dashboard/command-center-data"
import type { KeystoneStatus } from "@/lib/statusTokens"
import { cn } from "@/lib/utils"

// Mirrors lib/reviewWorkflow.ts's statusBadgeClasses mapping, but as a
// KeystoneStatus for StatusPill rather than a Badge className.
const STATUS_KEYSTONE: Record<SubmissionStatus, KeystoneStatus> = {
  draft: "neutral",
  submitted: "neutral",
  in_review: "attention",
  needs_info: "alert",
  approved: "healthy",
  rejected: "alert",
}

export function ReviewerHeader({
  slugTail,
  lifecycleStage,
  title,
  unitLabel,
  submitterName,
  submittedAt,
  status,
  decision,
  decidedAt,
  decidedByName,
  decidedByUnitShort,
}: {
  slugTail: string
  lifecycleStage: LifecycleStage
  title: string
  unitLabel: string
  submitterName: string
  submittedAt: string
  status: SubmissionStatus
  /** Set only once the record is decided (`status` is "approved" or "rejected"). */
  decision?: "approved" | "rejected"
  decidedAt?: string
  decidedByName?: string
  decidedByUnitShort?: string
}) {
  const meta = [
    unitLabel,
    submitterName,
    `submitted ${formatKeystoneDate(submittedAt)}`,
    decidedAt ? `decided ${formatKeystoneDate(decidedAt)}` : null,
  ].filter(Boolean).join(" · ")

  return (
    <div className="flex flex-col items-start justify-between gap-8 rounded-lg bg-keystone-basalt600 p-6 text-keystone-chalk shadow-sm sm:flex-row">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="ks-microlabel text-keystone-amberLight">
          Use case {slugTail} · {LIFECYCLE_STAGE_LABEL[lifecycleStage]}
        </p>
        <h1 className="max-w-[26ch] font-heading text-[27px] font-black leading-[1.12] tracking-[-0.022em] text-white">{title}</h1>
        <p className="text-[13.5px] text-white/72">{meta}</p>
      </div>

      {decision ? (
        <div className="flex w-full shrink-0 flex-col gap-2 rounded-md bg-[rgba(42,51,60,0.5)] p-4 sm:w-[250px]">
          <span className="ks-microlabel text-white/55">The decision</span>
          <DecisionChip decision={decision} />
          <p className="text-[13px] leading-relaxed text-white/72">
            {decidedByName ? `by ${decidedByName}${decidedByUnitShort ? ` · ${decidedByUnitShort}` : ""}` : null}
            {decidedByName && decidedAt ? <br /> : null}
            {decidedAt ? formatKeystoneDate(decidedAt) : null}
          </p>
        </div>
      ) : (
        <div className="shrink-0">
          <StatusPill status={STATUS_KEYSTONE[status]} className="border-white/20 bg-transparent text-white">
            {STATUS_LABEL[status]}
          </StatusPill>
        </div>
      )}
    </div>
  )
}
