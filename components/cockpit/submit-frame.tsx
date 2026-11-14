"use client"

// NL-8 (#289): the shared top of both ways in to "Submit an idea" on ES2
// (`features.cockpitLook`): the band (K1) with the guided/form switch on its
// right, and one numbered progress line under it. Presentation only: every
// word, step name and count comes in as a prop.

import type { ReactNode } from "react"
import { HeaderBand } from "./header-band"
import { cn } from "@/lib/utils"

/** "Submit an idea · Step {step} of {count}" with the numbers filled in, upper-cased for the band. */
export function submitEyebrow(pattern: string, step: number, count: number): string {
  return pattern.replace(/\{step\}/g, String(step)).replace(/\{count\}/g, String(count)).toUpperCase()
}

export function SubmitBand({
  eyebrow,
  title,
  modeToggle,
  background,
}: {
  eyebrow: string
  title: string
  /** The guided/form switch, placed on the band's right side. */
  modeToggle?: ReactNode
  background?: string
}) {
  return (
    <HeaderBand
      eyebrow={eyebrow}
      title={title}
      headingLevel="h2"
      background={background}
      actions={modeToggle ? <div className="text-[var(--ks-chalk)] [&_span]:text-[var(--ks-chalk)]">{modeToggle}</div> : undefined}
    />
  )
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
    <nav aria-label="Progress" data-cockpit="submit-progress" className={cn("border-b border-[var(--ks-limestone-dark)] bg-white px-8 py-3", className)}>
      <ol className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
        {steps.map((s, i) => {
          const n = i + 1
          const isCurrent = n === current
          return (
            <li key={`${n}-${s.label}`} aria-current={isCurrent ? "step" : undefined} className="flex items-center gap-2">
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
              <span
                className={cn(
                  "text-[13px] text-[var(--ks-ink-900)]",
                  isCurrent ? "font-bold" : "font-medium",
                )}
              >
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
