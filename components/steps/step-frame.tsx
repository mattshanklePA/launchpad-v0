"use client"

// Shared wizard chrome (RD-2, issue #203) — the mock's frame (05/06) applied
// identically to all six steps: a centered 880px column, a basalt-600 header
// card with the step's eyebrow/title/subtitle and a phase-progress block, a
// white field card, and a footer bar with Previous/Next. Composed once here
// so every step component only supplies its own fields — not another copy of
// the header/footer markup.

import type React from "react"
import { useEffect, useState } from "react"
import { useForm } from "@/context/form-context"
import { getFormSteps, getPhaseForStep, getSubmitterRoleLabels, type FormData } from "@/lib/steps"
import { getProgressModel, getSubmissionReadiness } from "@/lib/submissionReadiness"
import { getTenant } from "@/lib/tenant"
import { shortBusinessUnitLabel } from "@/components/dashboard/command-center-data"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight } from "lucide-react"

const WIZARD_STEPS = [1, 2, 3, 4, 5, 6]

/** "Saved a moment ago" / "Saved 4m ago" / "Saved" — the draft-save footer hint. */
export function formatSavedAgo(lastSavedAt: number | null, now: number): string {
  if (!lastSavedAt) return "Saved"
  const seconds = Math.max(0, Math.round((now - lastSavedAt) / 1000))
  if (seconds < 45) return "Saved a moment ago"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `Saved ${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `Saved ${hours}h ago`
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five"]

// Steps 1 and 6 get header copy the mock writes out explicitly (06a/06b),
// distinct from the step's own `title`/`prompt` (lib/steps.ts, unchanged —
// still what the recap and PDF export show). Every other step uses the
// step's own title/prompt as-is.
function wizardHeaderCopy(currentStep: number, formData: FormData, stepInfo: { title: string; prompt: string }) {
  if (currentStep === 1) {
    return {
      title: "Who are you?",
      subtitle: "Name and email come from your session. Confirm your role and office and go.",
    }
  }
  if (currentStep === 6) {
    const readiness = getSubmissionReadiness(formData)
    const shortSteps = new Set(readiness.missing.filter((m) => m.step >= 1 && m.step <= 5).map((m) => m.step))
    const shortCount = shortSteps.size
    const title =
      shortCount === 0
        ? "Ready to submit"
        : `Almost ready — ${NUMBER_WORDS[shortCount] || shortCount} step${shortCount === 1 ? "" : "s"} short`
    const subtitle = formData.readinessScore
      ? "Plumb assessed the idea against what vetting looks for. Fix the findings or submit as-is."
      : "Get Plumb's read before you submit."
    return { title, subtitle }
  }
  return { title: stepInfo.title, subtitle: stepInfo.prompt }
}

export function StepHeader({ onSwitchToGuided }: { onSwitchToGuided?: () => void }) {
  const { currentStep, setCurrentStep, formData } = useForm()
  const steps = getFormSteps(formData.submitterOffice)
  const stepInfo = steps[currentStep - 1]
  const phase = getPhaseForStep(currentStep)
  const { isStepComplete } = getProgressModel(formData)

  if (!stepInfo || currentStep > 6) return null

  const doneCount = WIZARD_STEPS.filter((s) => s !== currentStep && isStepComplete(s)).length
  const roleLabel = getSubmitterRoleLabels()[formData.submitterRole as string]
  // Short form ("AT&R"), not the tenant's full option label ("Acquisition,
  // Training and Readiness (AT&R)") — the long form wrapped to two lines in
  // this chrome-width slot and pushed the Edit link out of alignment.
  const unitLabel = formData.submitterOffice ? shortBusinessUnitLabel(formData.submitterOffice) : undefined
  const { title, subtitle } = wizardHeaderCopy(currentStep, formData, stepInfo)

  return (
    <div className="flex flex-col gap-6 rounded-md bg-keystone-basalt600 px-7 py-6 text-white shadow-sm md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-[460px] flex-col gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-keystone-amberLight">
          Step {currentStep} of 6 · {stepInfo.name}
        </p>
        <h1 className="ks-page-title text-white">{title}</h1>
        <p className="text-[14px] leading-[1.55] text-white/72">{subtitle}</p>
      </div>

      <div className="flex w-full flex-col gap-2 md:w-[260px] md:flex-shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/55">
            Phase {phase?.phase ?? 1} of 3{phase ? ` · ${phase.name}` : ""}
          </span>
          <span className="font-mono text-[11px] text-white/75">{doneCount} of 6 done</span>
        </div>
        <div className="flex gap-[5px]" role="img" aria-label={`${doneCount} of 6 steps done`}>
          {WIZARD_STEPS.map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                s === currentStep
                  ? "bg-attention"
                  : isStepComplete(s)
                    ? "bg-healthy"
                    : "bg-white/18",
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-[12px] text-white/55">
          <span>
            {formData.submitterName || "Submitter"}
            {unitLabel ? ` · ${unitLabel}` : roleLabel ? ` · ${roleLabel}` : ""}
          </span>
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="text-white/85 hover:text-white hover:underline"
          >
            Edit
          </button>
        </div>
        {onSwitchToGuided && (
          <button
            type="button"
            onClick={onSwitchToGuided}
            className="text-left text-[12px] text-white/70 hover:text-white hover:underline"
          >
            Prefer a conversation? Guided mode
          </button>
        )}
      </div>
    </div>
  )
}

export function StepCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-5 rounded-md border border-border-subtle bg-card p-6", className)}>
      {children}
    </div>
  )
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  className,
  children,
}: {
  label?: React.ReactNode
  htmlFor?: string
  required?: boolean
  hint?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-[13.5px] font-semibold text-foreground">
          {label}
          {required && (
            <span className="ml-1.5 font-mono text-[9px] font-normal uppercase tracking-[0.08em] text-foreground-faint">
              required
            </span>
          )}
        </Label>
      )}
      {children}
      {hint && <p className="text-[12.5px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Selected-segment fill for the mock's connected segmented control (users-impacted style fields). */
export function segmentClass(selected: boolean): string {
  return cn(
    "flex-1 border-l border-border-subtle px-3 py-2 text-center text-[13px] transition-colors first:border-l-0",
    selected ? "bg-keystone-basalt text-white" : "text-foreground hover:bg-muted/50",
  )
}

/**
 * Pill-chip className for the mock's chip groups (affected units, route-to,
 * problem type, etc), applied to the shadcn `Toggle` primitive. Written as
 * `data-[state=on]:*` overrides — not a JS-conditional string — so it wins
 * against Toggle's own `data-[state=on]:bg-accent` default at equal CSS
 * specificity (twMerge dedupes same-variant utilities by source order; a
 * plain unconditional class would lose to that more-specific attribute
 * selector regardless of source order).
 */
export const pillToggleClass = cn(
  "h-auto rounded-full border border-border px-3 py-1.5 text-[13px] font-normal text-foreground",
  "hover:border-border-strong hover:bg-transparent",
  "data-[state=on]:border-keystone-basalt data-[state=on]:bg-keystone-basalt data-[state=on]:text-white data-[state=on]:hover:bg-keystone-basalt",
)


export function StepFooterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-border-subtle bg-card py-[18px]">
      <div className="mx-auto flex max-w-[880px] items-center justify-between gap-5 px-4">{children}</div>
    </div>
  )
}

function SavedIndicator() {
  const { lastSavedAt } = useForm()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(id)
  }, [])

  return <span className="text-[12px] text-foreground-faint">{formatSavedAgo(lastSavedAt, now)}</span>
}

export function StepFooter() {
  const { currentStep, goToPreviousStep, goToNextStep, isFirstStep, formData } = useForm()
  const steps = getFormSteps(formData.submitterOffice)
  const nextStep = steps[currentStep]
  const nextLabel = isFirstStep ? "Start" : "Next"

  return (
    <StepFooterShell>
      <Button variant="ghost" onClick={goToPreviousStep} disabled={isFirstStep}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
      </Button>
      <div className="flex items-center gap-3.5">
        <SavedIndicator />
        {nextStep && (
          <Button onClick={goToNextStep}>
            {nextLabel}: {nextStep.name}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </StepFooterShell>
  )
}
