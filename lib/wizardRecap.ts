// Shared "does this field/step actually have content" rule for the wizard —
// used by both the Review & Submit recap (step-10-review-submit.tsx) and the
// step header's progress model (lib/submissionReadiness.ts's getProgressModel,
// rendered by components/steps/step-frame.tsx's StepHeader) so the two never
// compute "done" differently for the same step. Issue #213 item 6: the header
// used to call an optional step done as soon as it was visited, even with no
// content, while the recap already got this right.

import type { FormData } from "@/lib/steps"

/** True for any non-empty string/array, or any boolean — presence, not quality. */
export function hasFieldContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "boolean") return true
  return Boolean(value && String(value).trim())
}

// Steps with no required fields never block submission, so "done" for them
// can't be "nothing missing" (that's vacuously true before the step is ever
// visited) — it has to be "has content" instead. Today only step 4
// (Technical Constraints) is optional.
export const NO_REQUIRED_FIELDS_STEPS = new Set([4])

// The field(s) an optional step's "has content" check reads.
const OPTIONAL_STEP_FIELDS: Partial<Record<number, (keyof FormData)[]>> = {
  4: ["dependencies"],
}

/** Whether an optional step (see `NO_REQUIRED_FIELDS_STEPS`) has any content yet. */
export function isOptionalStepDone(step: number, formData: FormData): boolean {
  const fields = OPTIONAL_STEP_FIELDS[step] || []
  return fields.some((k) => hasFieldContent(formData[k]))
}
