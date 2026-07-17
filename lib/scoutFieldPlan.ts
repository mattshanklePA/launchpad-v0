// Scout multi-field draft engine (issue #168) — which FormData fields the
// assistant drafts for a given wizard step, and the deterministic (no-AI)
// fallback used when the model call fails. Pulled out of app/actions.ts so
// the plan itself, and the fallback's bracket-placeholder behavior, are
// pure and unit-testable without mocking the AI SDK.
//
// One entry per step output field the assistant can draft — reuses the
// existing FormData keys named in the issue (Propose-a-Solution drafts
// `solutionSummary`, `userValue`, and `businessValue` from one Q&A) rather
// than inventing a parallel field set.

import type { FormData } from "@/lib/steps"

export type ScoutFieldPlanEntry = {
  key: keyof FormData
  label: string
}

export const SCOUT_STEP_FIELD_PLAN: Record<number, ScoutFieldPlanEntry[]> = {
  // Business Problem & Opportunity (merged problem + target users)
  2: [{ key: "problemDefinition", label: "Refined Problem & Users Summary" }],
  // Proposed Solution & Expected Benefits (merged, issue #162) — the
  // motivating case for this issue: one Q&A drafts all three fields.
  3: [
    { key: "solutionSummary", label: "Solution Summary" },
    { key: "userValue", label: "Expected User Benefit" },
    { key: "businessValue", label: "Expected Business Benefit" },
  ],
  // Technical Constraints — light free-text notes only.
  4: [{ key: "dependencies", label: "Technical Constraints" }],
}

/**
 * Fields Scout may draft for `step`, filtered against the admin form
 * config's `enabled` map (same shape `buildStepInputs`/`isFieldVisible`
 * use) so the assistant never drafts a field the admin turned off.
 */
export function scoutFieldsForStep(step: number, enabledFields?: Record<string, boolean>): ScoutFieldPlanEntry[] {
  const plan = SCOUT_STEP_FIELD_PLAN[step] || []
  if (!enabledFields) return plan
  return plan.filter((f) => enabledFields[f.key as string] !== false)
}

/**
 * Deterministic, no-AI draft for one field — used when the model call is
 * unavailable. Never invents facts: reuses the submitter's own seed text
 * verbatim (if any) and appends bracketed placeholders for what's missing,
 * matching the same anti-fabrication guardrail the AI path follows.
 */
export function draftFieldFallback(label: string, seedText?: string): { value: string; rationale: string } {
  const rationale = "Assistant unavailable — generic placeholder. Replace the bracketed sections with your specifics."
  const trimmed = seedText?.trim()
  if (trimmed) {
    return {
      value: `${trimmed}\n\n[Add specifics: who exactly, what evidence, how often, which named priority, expected measurable outcome]`,
      rationale,
    }
  }
  return {
    value: `[Describe ${label.toLowerCase()} with specific, observable detail — no generic placeholders]`,
    rationale,
  }
}
