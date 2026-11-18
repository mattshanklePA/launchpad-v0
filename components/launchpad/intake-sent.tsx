"use client"

// The page after an idea is sent (F6-3, #343). ES2 only (`features.sentPage`).
// Shows where the idea went: office, who reviews it next, how long a decision
// usually takes there, and what happens now. No record code and no promise of
// email: the app has neither.

import Link from "next/link"
import { SubmitBandContent } from "@/components/cockpit"
import { shortBusinessUnitLabel } from "@/components/dashboard/command-center-data"
import { getBusinessUnit, getOffice } from "@/lib/reviewWorkflow"
import { formatDays } from "@/lib/timeToDecision"
import { DECISION_WINDOW_DAYS } from "@/lib/officeDecisionTime"
import type { SentDecisionTime } from "@/app/sent-actions"
import type { Submission } from "@/lib/submissions"
import { tenantCopy } from "@/lib/tenant/copy"
import { getTenant } from "@/lib/tenant"

const LABEL = "m-0 mb-1 font-mono text-[10px] font-bold uppercase tracking-[.08em] text-[var(--ks-ink-700,#4A545E)]"
const VALUE = "m-0 text-[14px] leading-[1.45] text-[var(--ks-ink-900,#2A333C)]"

/** "AT&R · ACWS": the office's short name, then the program's name when the idea has one. */
function officeText(s: Submission): string {
  const unit = getBusinessUnit(s)
  const program = getOffice(s)
  const programLabel = program
    ? (getTenant().unit.options.find((o) => o.value === unit)?.offices?.find((p) => p.value === program)?.label ?? program)
    : ""
  return [shortBusinessUnitLabel(unit), programLabel].filter(Boolean).join(" · ")
}

export function IntakeSent({ submission, time }: { submission: Submission; time: SentDecisionTime | null }) {
  const copy = tenantCopy(getTenant())
  const unit = getBusinessUnit(submission)
  const title = String(submission.formData.useCaseTitle || "").trim() || "Untitled idea"

  let timeText = ""
  if (time?.status === "days") timeText = `${formatDays(time.days)}, last ${DECISION_WINDOW_DAYS} days`
  else if (time) timeText = copy.sentNotEnough

  return (
    <div data-cockpit="submit-sent" className="flex flex-col gap-6">
      <SubmitBandContent eyebrow={copy.submitSentEyebrow.toUpperCase()} title={copy.sentThanks} />
      <div className="flex flex-col gap-4 rounded-lg border border-[var(--ks-line,#D6CEBE)] border-t-[3px] border-t-[#2E9E7B] bg-white p-6">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-[3px] border border-[#2E9E7B] bg-white px-2 py-[3px] font-mono text-[11px] font-bold tracking-[.04em] text-[#1F6F56]">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <circle cx="5" cy="5" r="4" fill="#2E9E7B" />
          </svg>
          {copy.sentTag}
        </span>
        <h2 className="m-0 text-[28px] font-black tracking-[-.02em]">{title}</h2>
        <div className="grid gap-x-8 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          <div>
            <p className={LABEL}>{copy.sentOfficeLabel}</p>
            <p className={VALUE}>{officeText(submission)}</p>
          </div>
          <div>
            <p className={LABEL}>{copy.sentNextLabel}</p>
            <p className={VALUE}>{`The ${shortBusinessUnitLabel(unit)} reviewer`}</p>
          </div>
          <div>
            <p className={LABEL}>{copy.sentTimeLabel}</p>
            <p className={VALUE} data-testid="sent-time">{timeText || " "}</p>
          </div>
          <div>
            <p className={LABEL}>{copy.sentNowLabel}</p>
            <p className={VALUE}>{copy.sentNowBody}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/submissions/${submission.id}`} className="rounded-[5px] border border-[#006BA1] bg-[#006BA1] px-4 py-[9px] text-[14px] font-semibold text-white no-underline hover:bg-[#1E252C]">
            {copy.sentSee}
          </Link>
          <Link href="/submit" className="rounded-[5px] border border-[var(--ks-line,#D6CEBE)] bg-white px-[14px] py-[9px] text-[14px] font-semibold text-[var(--ks-ink-900,#2A333C)] no-underline">
            {copy.sentAnother}
          </Link>
        </div>
      </div>
    </div>
  )
}
