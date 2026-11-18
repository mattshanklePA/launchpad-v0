"use client"

// F7-3 (#346), ES2 only (`features.reviewerDecides`): the right side of the
// review step screen. "Your review" is the page's one step list (done, current,
// to do, each a mark plus a word), and "The submission" sits below it. No record
// code, no second counter. Presentation only.

import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { SectionTitle } from "@/components/cockpit"
import { formatKeystoneDate } from "@/components/dashboard/command-center-data"
import { StatusTag } from "@/components/submissions/record-cockpit"
import type { Submission } from "@/lib/submissions"
import type { TenantConfig } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import { businessUnitLabel, getBusinessUnit, type SubmissionStatus } from "@/lib/reviewWorkflow"
import type { ReviewStep, ReviewStepKey } from "@/lib/reviewSteps"
import { cn } from "@/lib/utils"

/** The short name of a step in the list, from the tenant's copy. */
export function stepWord(copy: ReturnType<typeof tenantCopy>, key: ReviewStepKey): string {
  const words: Record<ReviewStepKey, string> = {
    cluster: copy.stepWordCluster,
    high_impact: copy.stepWordHighImpact,
    rmf: copy.stepWordRmf,
    governance: copy.stepWordFields,
    disposition: copy.stepWordDecide,
  }
  return words[key]
}

export type StepState = "done" | "current" | "todo"

export function stepState(step: ReviewStep, currentKey: ReviewStepKey): StepState {
  if (step.key === currentKey) return "current"
  return step.settled ? "done" : "todo"
}

export function ReviewStepList({
  steps,
  currentStepKey,
  onNavigateStep,
  tenant,
  submission,
  status,
}: {
  steps: ReviewStep[]
  currentStepKey: ReviewStepKey
  onNavigateStep: (key: ReviewStepKey) => void
  tenant: TenantConfig
  submission: Submission
  status: SubmissionStatus
}) {
  const copy = tenantCopy(tenant)
  const [expanded, setExpanded] = useState(false)
  const fd = submission.formData
  const stateWord: Record<StepState, string> = { done: copy.stepDone, current: copy.stepCurrent, todo: copy.stepToDo }

  const full: [string, string][] = (
    [
      ["Proposed solution", fd.solutionSummary || fd.proposedSolution || ""],
      ["Business value", fd.businessValueSummary || fd.businessValue || ""],
      ["Success metrics", fd.metricsSummary || fd.successMetrics || ""],
      ["Executive summary", fd.executiveSummary || ""],
    ] as [string, string][]
  ).filter(([, v]) => v.trim())

  const facts: [string, string][] = [
    ["Problem", fd.problemDefinition || fd.coreProblem || "Not yet set"],
    ["Who uses it", fd.targetUserSummary || fd.targetUserContext || fd.targetAudience || "Not yet set"],
    ["Data", fd.trainingDataDescription?.trim() || "Not yet set"],
  ]

  return (
    <div className="flex min-w-0 flex-col gap-[18px]">
      <section aria-label={copy.stepYourReview} className="flex flex-col gap-3 border border-[var(--ks-limestone-dark)] bg-white p-5">
        <SectionTitle title={copy.stepYourReview} />
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {steps.map((step) => {
            const state = stepState(step, currentStepKey)
            return (
              <li key={step.key}>
                <button
                  type="button"
                  aria-current={state === "current" ? "step" : undefined}
                  onClick={() => onNavigateStep(step.key)}
                  className="flex w-full items-start gap-2.5 text-left text-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {state === "done" ? (
                    <Check className="mt-0.5 h-[15px] w-[15px] shrink-0 text-healthy-foreground" aria-hidden="true" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 h-[15px] w-[15px] shrink-0 rounded-full border",
                        state === "current" ? "border-4 border-[var(--ks-ink-900)]" : "border-[var(--ks-limestone-dark)]",
                      )}
                    />
                  )}
                  <span className="min-w-0">
                    <span className={cn("block", state === "current" ? "font-semibold text-[var(--ks-ink-900)]" : "text-[var(--ks-ink-700)]")}>
                      {stepWord(copy, step.key)}
                    </span>
                    <span className="block font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ks-ink-700)]">{stateWord[state]}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-label={copy.stepSubmissionTitle} className="flex flex-col gap-3 border border-[var(--ks-limestone-dark)] bg-white p-5">
        <SectionTitle title={copy.stepSubmissionTitle} />
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusTag status={status} />
        </div>
        <p className="m-0 break-words text-[15px] font-semibold leading-[1.3] text-[var(--ks-ink-900)]">{fd.useCaseTitle || "Untitled idea"}</p>
        <p className="m-0 break-words text-[13px] leading-[1.5] text-[var(--ks-ink-700)]">
          {businessUnitLabel(getBusinessUnit(submission))} · {fd.submitterName || "Anonymous"} · submitted {formatKeystoneDate(submission.submittedAt)}
        </p>
        <dl className="m-0 flex flex-col gap-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="mb-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]">{label}</dt>
              <dd className="m-0 break-words text-[14px] leading-[1.5] text-[var(--ks-ink-900)]">{value}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-left text-[13px] font-semibold text-[var(--ks-active-blue-dark)] hover:underline"
        >
          {copy.stepReadFull}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </button>
        {expanded && (
          <div className="flex flex-col gap-3 border-t border-[var(--ks-limestone-dark)] pt-3">
            {full.length === 0 ? <p className="m-0 text-[13px] text-[var(--ks-ink-700)]">Nothing more has been written.</p> : null}
            {full.map(([label, value]) => (
              <div key={label}>
                <div className="text-[13px] font-medium">{label}</div>
                <p className="m-0 whitespace-pre-wrap break-words text-[13px] text-[var(--ks-ink-700)]">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
