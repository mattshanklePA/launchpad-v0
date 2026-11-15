"use client"

// NL-8 (#289), NL-10 (#311): the shared top of both ways in to "Submit an idea"
// on ES2 (`features.cockpitLook`). The page band (CockpitShell) carries the
// eyebrow, the step question and the Guided/Form switch, so this file draws no
// band of its own: it hands those words to the shell, and draws the one
// numbered step line under it. Presentation only: every word, step name and
// count comes in as a prop.

import type { ReactNode } from "react"
import { CockpitBandRight, useCockpitBand } from "./band-context"
import { cn } from "@/lib/utils"

/** "Submit an idea · Step {step} of {count}" with the numbers filled in, upper-cased for the band. */
export function submitEyebrow(pattern: string, step: number, count: number): string {
  return pattern.replace(/\{step\}/g, String(step)).replace(/\{count\}/g, String(count)).toUpperCase()
}

/** The six step labels from the tenant's copy ("A|B|C|D|E|F"). */
export function submitStepLabels(copyValue: string): string[] {
  return copyValue.split("|")
}

/**
 * Puts the Submit eyebrow and step question in the page band and the
 * Guided/Form switch on its right. Renders nothing itself; nothing at all
 * outside the ES2 shell.
 */
export function SubmitBandContent({
  eyebrow,
  title,
  modeToggle,
}: {
  eyebrow: string
  title: string
  modeToggle?: ReactNode
}) {
  useCockpitBand({ eyebrow, title })
  return modeToggle ? <CockpitBandRight>{modeToggle}</CockpitBandRight> : null
}

export type SubmitProgressStep = { label: string; done?: boolean }

/** One numbered step line. The current step carries aria-current; a done step carries the word "done". */
export function SubmitProgress({
  steps,
  current,
  className,
}: {
  steps: SubmitProgressStep[]
  /** 1-based. */
  current: number
  className?: string
}) {
  return (
    <nav aria-label="Progress" data-cockpit="submit-progress" className={cn("border border-[var(--ks-limestone-dark)] bg-white px-5 py-3", className)}>
      <ol className="m-0 flex list-none flex-nowrap justify-between gap-x-3 overflow-x-auto p-0">
        {steps.map((s, i) => {
          const n = i + 1
          const isCurrent = n === current
          return (
            <li key={`${n}-${s.label}`} aria-current={isCurrent ? "step" : undefined} className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-[3px] border font-mono text-[12px] font-bold",
                  isCurrent
                    ? "border-[var(--ks-basalt)] bg-[var(--ks-basalt)] text-[var(--ks-chalk)]"
                    : "border-[var(--ks-limestone-dark)] bg-white text-[var(--ks-ink-900)]",
                )}
              >
                {n}
              </span>
              <span className={cn("text-[13px] text-[var(--ks-ink-900)]", isCurrent ? "font-bold" : "font-medium")}>
                {s.label}
                {s.done && !isCurrent ? <span className="sr-only"> (done)</span> : null}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
