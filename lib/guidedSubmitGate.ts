// Guided-mode submit gate (issue #268). One rule set for both intake modes:
// this wraps form mode's `getSubmissionReadiness` rather than restating it,
// and adds only the placeholder check.
//
// Two differences from calling the readiness check directly, both deliberate:
//   - The AI readiness assessment is not required *to open* the gate: guided
//     mode runs it at submit time. Its verdict is still enforced afterward
//     with the full `getSubmissionReadiness(...).canSubmit` (see the submit
//     handler), so "early stage" blocks in both modes alike.
//   - Guided mode drafts `problemDefinition` and `solutionSummary`, which are
//     the refined versions of form mode's `coreProblem` / `proposedSolution`;
//     they count for those when the form field is empty.

import type { FormData } from "@/lib/steps"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { FIELD_REGISTRY_BY_KEY } from "@/lib/fieldRegistry"
import { isFieldVisible } from "@/lib/formConfig"
import { REQUIRED_FIELD_KEYS, getSubmissionReadiness, type MissingItem } from "@/lib/submissionReadiness"
import { findPlaceholders } from "@/lib/placeholderCheck"

export type PlaceholderHit = { field: string; label: string; tokens: string[] }

export type GuidedSubmitGate = {
  canSubmit: boolean
  missing: MissingItem[]
  placeholders: PlaceholderHit[]
  /** Plain-words reason shown to the submitter; empty when the gate is open. */
  message: string
}

/** Fold the guided drafts into the form fields the readiness check reads. */
export function withGuidedAliases(formData: FormData): FormData {
  return {
    ...formData,
    coreProblem: formData.coreProblem?.trim() ? formData.coreProblem : formData.problemDefinition || "",
    proposedSolution: formData.proposedSolution?.trim() ? formData.proposedSolution : formData.solutionSummary || "",
  }
}

function labelFor(field: string): string {
  return FIELD_REGISTRY_BY_KEY[field]?.label || field
}

export function getGuidedSubmitGate(formData: FormData, tenant: TenantConfig = getTenant()): GuidedSubmitGate {
  const aliased = withGuidedAliases(formData)
  const readiness = getSubmissionReadiness(aliased, tenant)
  const missing = readiness.missing.filter((m) => m.field !== "readinessScore")

  const scanKeys = new Set<keyof FormData>([...REQUIRED_FIELD_KEYS, "problemDefinition", "solutionSummary"])
  const placeholders: PlaceholderHit[] = []
  const seenValues = new Set<string>() // a draft aliased into a required field is one finding, not two
  for (const key of scanKeys) {
    if (!isFieldVisible(key, aliased)) continue
    const value = aliased[key]
    const tokens = typeof value === "string" ? findPlaceholders(value) : []
    if (!tokens.length || seenValues.has(value as string)) continue
    seenValues.add(value as string)
    placeholders.push({ field: key, label: labelFor(key), tokens })
  }

  const parts: string[] = []
  if (missing.length) parts.push(`Still needed: ${missing.map((m) => m.message).join(", ")}.`)
  for (const p of placeholders) {
    parts.push(`"${p.label}" still has ${p.tokens.join(", ")} in it. Replace it with the real detail.`)
  }
  const message = parts.length ? `${tenant.assistantName} can't submit this idea yet. ${parts.join(" ")}` : ""

  return { canSubmit: parts.length === 0, missing, placeholders, message }
}
