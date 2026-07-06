"use client"
import { useForm } from "@/context/form-context"
import { formPhases, getFormSteps, getPhaseForStep } from "@/lib/steps"
import { isStepEnabled } from "@/lib/formConfig"
import { getProgressModel } from "@/lib/submissionReadiness"
import { CheckCircle2 } from "lucide-react"

// Enabled, completable steps that fall inside a phase's range.
function enabledStepsInPhase(stepStart: number, stepEnd: number): number[] {
  return getFormSteps()
    .filter((s) => s.step >= stepStart && s.step <= stepEnd && isStepEnabled(s.step))
    .map((s) => s.step)
}

export function ProgressBar() {
  const { currentStep, formData } = useForm()
  const { isStepComplete, canSubmit } = getProgressModel(formData)

  // Review step (9) lives outside the 4 phases — show its own state.
  const isReview = currentStep >= 9
  const activePhase = getPhaseForStep(currentStep)

  // How many steps in the active phase are actually complete (not just visited)?
  const activePhaseSteps = activePhase
    ? enabledStepsInPhase(activePhase.stepStart, activePhase.stepEnd)
    : []
  const completeInPhase = activePhaseSteps.filter((s) => isStepComplete(s)).length

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isReview ? (
            <>
              <CheckCircle2
                className={`h-4 w-4 flex-shrink-0 ${canSubmit ? "text-green-600" : "text-muted-foreground"}`}
              />
              <span className="text-sm font-semibold whitespace-nowrap">
                {canSubmit ? "Ready to submit" : "Final review"}
              </span>
            </>
          ) : activePhase ? (
            <>
              <span className="text-sm font-semibold whitespace-nowrap">
                Phase {activePhase.phase} of {formPhases.length}
              </span>
              <span className="text-sm text-muted-foreground truncate">· {activePhase.name}</span>
            </>
          ) : null}
        </div>
        {activePhase && !isReview && activePhaseSteps.length > 0 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completeInPhase} of {activePhaseSteps.length} complete
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {formPhases.map((p) => {
          const steps = enabledStepsInPhase(p.stepStart, p.stepEnd)
          const completed = steps.filter((s) => isStepComplete(s)).length
          const isComplete = steps.length > 0 && completed === steps.length
          const isActive = !isReview && activePhase?.phase === p.phase
          // Fill reflects how many of the phase's steps are actually done.
          const phaseFill = steps.length === 0 ? 0 : (completed / steps.length) * 100
          return (
            <div key={p.phase} className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isComplete ? "bg-green-600" : isActive ? "bg-uspto-blue-primary" : "bg-uspto-blue-primary/60"
                }`}
                style={{ width: `${phaseFill}%` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
