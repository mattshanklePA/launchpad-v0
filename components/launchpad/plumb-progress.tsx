"use client"

// RD-6 (issue #207): Plumb's staged-progress card (mock `09 Reviewer Detail
// - Plumb Loading.dc.html`) — never a spinner. Four stages: read the
// submission, check for similar use cases, draft governance fields, write
// the recommendation.
//
// Every stage is driven by a real signal, not a fabricated delay:
//  - "Read the submission" / "Checking for similar use cases" resolve
//    essentially the instant this mounts — by the time a caller renders this
//    component the submission is already loaded and `findSimilar` (which
//    this component's data flows from) runs synchronously, so there is
//    nothing to wait on. A one-tick mount effect flips both from "active" to
//    "done" rather than rendering them pre-resolved, so the very first frame
//    still shows a checklist in progress, not a page that's already
//    finished. No fallback timer is needed for either.
//  - "Drafting governance fields" / "Writing the recommendation" track the
//    real promises the caller owns (the governance draft call, the
//    assistant's advisory read) via `governanceDone` / `recommendationDone`.
//    They resolve independently — there's no waterfall gating between them.
//
// Rendered into a fixed-height slot: pass the exported
// PLUMB_PROGRESS_MIN_HEIGHT_CLASS to both this component and whatever
// "resolved" card replaces it, so swapping between them never shifts layout.

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { KindTag } from "@/components/ui/kind-tag"
import { GlossaryTerm } from "@/components/launchpad/glossary-term"
import { cn } from "@/lib/utils"

/** Shared min-height so a loading card and the resolved card it swaps for never shift the page around it. */
export const PLUMB_PROGRESS_MIN_HEIGHT_CLASS = "min-h-[196px]"

type PlumbStageState = "done" | "active" | "upcoming"

const STAGE_LABELS = [
  "Read the submission",
  "Checking for similar use cases",
  "Drafting governance fields",
  "Writing the recommendation",
]

// Rough, non-authoritative remaining-time hints — plausible placeholder data
// (DIVERGENCES.md item 9), same spirit as the mock's "about 30 seconds".
const STAGE_SECONDS_REMAINING = [30, 25, 15, 5]

function StageDot({ state }: { state: PlumbStageState }) {
  if (state === "done") {
    return (
      <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center" aria-hidden="true">
        <Check className="h-[15px] w-[15px] text-healthy-foreground" strokeWidth={2.4} />
      </span>
    )
  }
  if (state === "active") {
    return <span className="h-[13px] w-[13px] shrink-0 rounded-full border-2 border-primary" aria-hidden="true" />
  }
  return <span className="h-[15px] w-[15px] shrink-0 rounded-full border border-border-default" aria-hidden="true" />
}

export function PlumbProgress({
  assistantName,
  governanceDone,
  recommendationDone,
  className,
}: {
  assistantName: string
  /** The governance-field draft promise has resolved (stage 3). */
  governanceDone: boolean
  /** The assistant's advisory read has resolved (stage 4). */
  recommendationDone: boolean
  className?: string
}) {
  const [readyAfterMount, setReadyAfterMount] = useState(false)

  useEffect(() => {
    setReadyAfterMount(true)
  }, [])

  const states: PlumbStageState[] = [
    readyAfterMount ? "done" : "active",
    !readyAfterMount ? "upcoming" : "done",
    !readyAfterMount ? "upcoming" : governanceDone ? "done" : "active",
    !readyAfterMount ? "upcoming" : recommendationDone ? "done" : "active",
  ]
  const currentStageIndex = Math.max(1, states.findIndex((s) => s !== "done") + 1 || states.length)
  const secondsRemaining = STAGE_SECONDS_REMAINING[currentStageIndex - 1] ?? STAGE_SECONDS_REMAINING[STAGE_SECONDS_REMAINING.length - 1]

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border-subtle bg-card p-6 shadow-sm",
        PLUMB_PROGRESS_MIN_HEIGHT_CLASS,
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlumbMark className="h-[15px] w-[15px] shrink-0" />
          <span className="ks-microlabel">{assistantName} · reading this submission</span>
          <KindTag>
            <GlossaryTerm term="advisory">Advisory</GlossaryTerm>
          </KindTag>
        </div>
        <span className="text-[12.5px] text-muted-foreground">
          Step {currentStageIndex} of 4 · about {secondsRemaining} seconds
        </span>
      </div>

      <div className="flex flex-1 items-start gap-7">
        <div className="flex w-[280px] shrink-0 flex-col gap-2.5 text-[13.5px]">
          {STAGE_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2.5">
              <StageDot state={states[i]} />
              <span className={cn(states[i] === "upcoming" ? "text-foreground-faint" : states[i] === "active" ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 pt-0.5">
          <div className="h-[11px] w-[94%] animate-pulse rounded bg-muted" />
          <div className="h-[11px] w-[76%] animate-pulse rounded bg-muted" />
          <div className="h-[11px] w-[86%] animate-pulse rounded bg-muted" />
          <p className="mt-0.5 text-[12.5px] text-foreground-faint">Its read lands here at this exact size — nothing shifts.</p>
        </div>
      </div>
    </div>
  )
}
