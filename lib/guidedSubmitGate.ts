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

// ---------------------------------------------------------------------------
// "Before you send" list (F6-1, issue #341). Pure; no screen. Built from the
// gate's `missing` and `placeholders` — the gate itself is not changed.
// ---------------------------------------------------------------------------

export type BeforeYouSendRowId = "idea" | "who" | "problem" | "audience" | "proposal" | "other" | "readiness"

export type BeforeYouSendRow = {
  id: BeforeYouSendRowId
  label: string
  done: boolean
  /** Key of the first field to fix (for the "Fix" link); absent when done. */
  fixField?: string
}

export type BeforeYouSendBlank = { field: string; label: string; tokens: string[]; row: BeforeYouSendRowId }

export type BeforeYouSend = {
  rows: BeforeYouSendRow[]
  blanks: BeforeYouSendBlank[]
  ready: boolean
  /** "Ready to send" or "N things left: a, b." */
  summary: string
}

const ROW_FIELDS: { id: BeforeYouSendRowId; fields: string[] }[] = [
  { id: "idea", fields: ["useCaseTitle", "useCaseDescription"] },
  { id: "who", fields: ["submitterOffice", "submitterRole", "submitterName", "submitterEmail"] },
  { id: "problem", fields: ["coreProblem", "problemDefinition", "affectedBusinessUnits"] },
  { id: "audience", fields: ["targetAudience", "impactedUsersCount", "targetUserContext"] },
  { id: "proposal", fields: ["proposedSolution", "solutionSummary", "userValue", "businessValue", "isWithheld"] },
]

function rowOf(field: string): BeforeYouSendRowId {
  return ROW_FIELDS.find((r) => r.fields.includes(field))?.id ?? "other"
}

export function getBeforeYouSend(formData: FormData, tenant: TenantConfig = getTenant()): BeforeYouSend {
  const gate = getGuidedSubmitGate(formData, tenant)
  const aliased = withGuidedAliases(formData)

  // The gate lists a blank once per distinct text. Here every visible field
  // holding that text is its own blank, so each marks its own row. Only the
  // required keys are expanded, so a guided draft folded into its form field
  // still counts once.
  const blanks: BeforeYouSendBlank[] = []
  const seenFields = new Set<string>()
  const addBlank = (field: string, tokens: string[]) => {
    if (seenFields.has(field)) return
    seenFields.add(field)
    blanks.push({ field, label: labelFor(field), tokens, row: rowOf(field) })
  }
  for (const p of gate.placeholders) {
    addBlank(p.field, p.tokens)
    const value = aliased[p.field as keyof FormData]
    for (const key of REQUIRED_FIELD_KEYS) {
      if (key === p.field || !isFieldVisible(key, aliased)) continue
      if (typeof value === "string" && aliased[key] === value) addBlank(key as string, p.tokens)
    }
  }

  const labels: Record<BeforeYouSendRowId, string> = {
    idea: "Idea title and short description",
    who: `Your ${tenant.tierLabels.unit.toLowerCase()} and your role`,
    problem: "The problem in your words",
    audience: "Who uses it, and how many people",
    proposal: "What you propose and what it is worth",
    other: "Other details",
    readiness: "The readiness rating is Early Stage",
  }

  const rows: BeforeYouSendRow[] = ROW_FIELDS.map(({ id, fields }) => {
    const bad = new Set<string>([
      ...gate.missing.filter((m) => rowOf(m.field) === id).map((m) => m.field),
      ...blanks.filter((b) => b.row === id).map((b) => b.field),
    ])
    const fixField = fields.find((f) => bad.has(f))
    return { id, label: labels[id], done: bad.size === 0, ...(fixField ? { fixField } : {}) }
  })

  // Anything the gate flags that fits none of the five rows still shows.
  const otherBad = [
    ...gate.missing.filter((m) => rowOf(m.field) === "other").map((m) => m.field),
    ...blanks.filter((b) => b.row === "other").map((b) => b.field),
  ]
  if (otherBad.length) rows.push({ id: "other", label: labels.other, done: false, fixField: otherBad[0] })

  // The gate leaves the readiness rating out (the submit handler checks it
  // after assessing). If the draft already carries "early stage", the send
  // will be stopped, so the list must not read "Ready to send".
  if (formData.readinessScore === "early_stage") {
    rows.push({ id: "readiness", label: labels.readiness, done: false, fixField: "readinessScore" })
  }

  const left = rows.filter((r) => !r.done)
  const ready = left.length === 0 && gate.canSubmit
  const summary = ready
    ? "Ready to send"
    : `${left.length} ${left.length === 1 ? "thing" : "things"} left: ${left.map((r) => r.label.toLowerCase()).join(", ")}.`
  return { rows, blanks, ready, summary }
}
