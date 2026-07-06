"use client"

// Left sidebar nav for the wizard. Lets the submitter jump to any step
// instead of clicking Previous repeatedly. Grouped by the 4 phases, with the
// Review step pinned at the bottom as its own block.
//
// Status rules — driven by ACTUAL completeness, not just which step you've
// visited (so an empty form never shows all-green checkmarks):
//   - current     -> highlighted in primary color (blue dot)
//   - complete     -> every required field on the step is filled (green check)
//   - incomplete   -> moved past it but required fields are still missing (amber)
//   - upcoming     -> not reached yet and not complete (muted empty circle)

import { useForm } from "@/context/form-context"
import { getFormSteps, formPhases } from "@/lib/steps"
import { isStepEnabled } from "@/lib/formConfig"
import { getProgressModel } from "@/lib/submissionReadiness"
import { CheckCircle2, Circle, CircleDot, AlertCircle, ClipboardList } from "lucide-react"

const REVIEW_STEP = 9

type StepStatus = "current" | "complete" | "incomplete" | "upcoming"

function statusFor(step: number, current: number, isComplete: (s: number) => boolean): StepStatus {
  if (step === current) return "current"
  if (isComplete(step)) return "complete"
  if (step < current) return "incomplete"
  return "upcoming"
}

export function WizardNav() {
  const { currentStep, setCurrentStep, formData } = useForm()
  const { isStepComplete, canSubmit } = getProgressModel(formData)

  // Confirmation page — nav doesn't apply
  if (currentStep === 10) return null

  return (
    <nav
      aria-label="Wizard navigation"
      className="hidden lg:block sticky top-24 self-start w-60 flex-shrink-0"
    >
      <div className="rounded-lg border bg-white shadow-sm p-3 space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
        <div className="px-2 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your Progress
          </p>
        </div>

        {formPhases.map((phase) => {
          // Only show steps that are enabled (at least one of their fields is on).
          const phaseSteps = getFormSteps().filter(
            (s) => s.step >= phase.stepStart && s.step <= phase.stepEnd && isStepEnabled(s.step),
          )
          // Hide the entire phase if every step in it has been disabled.
          if (phaseSteps.length === 0) return null
          // Phase is "done" only when every enabled step in it is complete.
          const phaseDone = phaseSteps.every((s) => isStepComplete(s.step))
          const phaseActive = currentStep >= phase.stepStart && currentStep <= phase.stepEnd

          return (
            <div key={phase.phase} className="space-y-1">
              <div className="px-2 flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    phaseDone
                      ? "text-green-700"
                      : phaseActive
                        ? "text-uspto-blue-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  Phase {phase.phase}
                </span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span
                  className={`text-[11px] font-semibold ${
                    phaseActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {phase.name}
                </span>
              </div>
              <ul className="space-y-0.5">
                {phaseSteps.map((s) => {
                  const status = statusFor(s.step, currentStep, isStepComplete)
                  return (
                    <li key={s.step}>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(s.step)}
                        className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                          status === "current"
                            ? "bg-uspto-blue-primary/10 text-uspto-blue-primary font-semibold"
                            : status === "complete"
                              ? "text-foreground hover:bg-muted"
                              : status === "incomplete"
                                ? "text-amber-700 hover:bg-amber-50"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {status === "current" ? (
                          <CircleDot className="h-3.5 w-3.5 flex-shrink-0 text-uspto-blue-primary" />
                        ) : status === "complete" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                        ) : status === "incomplete" ? (
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
                        )}
                        <span className="truncate">{s.name}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}

        {/* Review pinned at bottom as its own block */}
        <div className="pt-2 border-t space-y-1">
          <button
            type="button"
            onClick={() => setCurrentStep(REVIEW_STEP)}
            className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
              currentStep === REVIEW_STEP
                ? "bg-uspto-blue-primary/10 text-uspto-blue-primary font-semibold"
                : canSubmit
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            {canSubmit ? (
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
            ) : (
              <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span className="truncate">Review &amp; Submit</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
