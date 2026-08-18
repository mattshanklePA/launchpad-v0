// Presentation helpers for the AI vetting-readiness result (ES2-14).
//
// The readiness panel used to be a badge plus a prose paragraph: the verdict
// was there, but what to do about it was buried in the prose and there was
// nothing to click. The panel now reads verdict → hyperlinked gaps → prose,
// the same shape the deterministic gate (components/steps/submission-gate.tsx)
// already uses for hard-missing fields. The two lists stay separate: this one
// is the AI's quality read, that one is field completeness.
//
// Both functions here are pure so the copy can be tested without rendering.

import { getFormSteps } from "@/lib/steps"

/** One concrete gap the submitter should close, pointing at the step that fixes it. */
export type ReadinessFinding = {
  step: number
  message: string
}

/**
 * The one-line verdict shown next to the readiness badge. Derived from the
 * score, never from the model, so the wording can't drift between runs.
 * Same sentence for every tenant.
 */
export function readinessVerdictSentence(score: string | undefined | null): string {
  switch (score) {
    case "ready":
      return "Ready for a reviewer."
    case "needs_work":
      return "Close the items below, then submit."
    case "early_stage":
      return "Keep refining before you submit."
    default:
      return ""
  }
}

/**
 * The step name a finding points at, taken from the live wizard flow so it
 * stays in lockstep with `getFormSteps` (and with the deterministic gate,
 * which names the same steps). Empty string for a step that isn't in the flow.
 */
export function findingStepName(step: number, submitterOffice?: string | null): string {
  return getFormSteps(submitterOffice).find((s) => s.step === step)?.name || ""
}
