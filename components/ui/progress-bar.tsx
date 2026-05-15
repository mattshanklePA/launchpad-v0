"use client"
import { useForm } from "@/context/form-context"
import { Progress } from "@/components/ui/progress"
import { formPhases, getPhaseForStep } from "@/lib/steps"
import { CheckCircle2 } from "lucide-react"

export function ProgressBar() {
  const { totalSteps, currentStep } = useForm()

  // Review step (11) lives outside the 4 phases — show its own state.
  const isReview = currentStep >= 11
  const activePhase = getPhaseForStep(currentStep)

  // Overall progress: count completed phases + partial credit for current phase.
  // When on review, all 4 phases are done.
  const completedPhases = isReview
    ? formPhases.length
    : activePhase
      ? activePhase.phase - 1 + (currentStep - activePhase.stepStart + 1) / (activePhase.stepEnd - activePhase.stepStart + 1)
      : 0
  const overallProgress = (completedPhases / formPhases.length) * 100

  // Within-phase progress (e.g., "step 2 of 3 in this phase")
  const stepInPhase = activePhase ? currentStep - activePhase.stepStart + 1 : 0
  const stepsInPhase = activePhase ? activePhase.stepEnd - activePhase.stepStart + 1 : 0

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {isReview ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-sm font-semibold whitespace-nowrap">Final Review</span>
            </>
          ) : activePhase ? (
            <>
              <span className="text-sm font-semibold whitespace-nowrap">
                Phase {activePhase.phase} of {formPhases.length}
              </span>
              <span className="text-sm text-muted-foreground truncate">
                · {activePhase.name}
              </span>
            </>
          ) : null}
        </div>
        {activePhase && !isReview && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {stepInPhase} of {stepsInPhase}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {formPhases.map((p) => {
          const isComplete = isReview || currentStep > p.stepEnd
          const isActive = !isReview && activePhase?.phase === p.phase
          // Per-phase fill: full if complete, partial if active
          const phaseFill = isComplete
            ? 100
            : isActive
              ? ((currentStep - p.stepStart + 1) / (p.stepEnd - p.stepStart + 1)) * 100
              : 0
          return (
            <div key={p.phase} className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${isComplete ? "bg-green-600" : "bg-uspto-blue-primary"}`}
                style={{ width: `${phaseFill}%` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
