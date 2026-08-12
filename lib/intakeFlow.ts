// Conversational-first idea intake (issue #169) — the ordered list of "light"
// idea fields the assistant walks a submitter through in one continuous
// thread, and the pure completeness logic that drives it.
//
// Deliberately a SMALLER field set than lib/submissionReadiness.ts's full
// wizard gate (which also demands target-audience detail, an idea title and
// description, and an AI readiness score): issue #169 asks for only the
// bare-minimum idea fields — business problem/opportunity, proposed solution,
// expected benefits to users and business, affected business unit, and
// internal/external. Reviewers request anything more via the existing
// `needs_info` flow, same as any other gap found during vetting.
//
// Order: problem first, then who it affects (mirrors the wizard's Step 2,
// which already asks both together), then the solution and its expected
// benefits — already one combined AI draft turn per issue #168's multi-field
// engine (lib/scoutFieldPlan.ts's step-3 plan drafts all three fields from a
// single Q&A).

import type { FormData } from "@/lib/steps"
import { isFieldEnabled } from "@/lib/formConfig"
import { getTenant, type TenantConfig } from "@/lib/tenant"

export type IntakeTopicId = "problem" | "affectedUnits" | "audience" | "solutionBenefits"

export type IntakeTopic = {
  id: IntakeTopicId
  // Record-panel section label ("your idea so far").
  label: string
  kind: "draft" | "choice"
  // "draft" topics reuse the existing multi-field assistant engine
  // (lib/scoutFieldPlan.ts's SCOUT_STEP_FIELD_PLAN via validateAndRefineInput),
  // keyed by the wizard step number whose field plan matches this topic.
  scoutStep?: number
  // Fields this topic is responsible for — what the record panel shows/edits,
  // and what `isTopicCaptured` checks for "done". A topic with more than one
  // field (solutionBenefits) is captured only once every one of them has
  // content, matching what a single scaffold turn actually fills.
  fields: (keyof FormData)[]
}

// The affected-units topic's label is the tenant's own tier vocabulary — it
// sits directly under the record panel's card heading, which resolves from
// `lib/fieldRegistry.ts`'s `Affected ${unitPlural}`, so a hardcoded label made
// one screen contradict itself.
export function getIntakeTopics(tenant: TenantConfig = getTenant()): IntakeTopic[] {
  return [
  { id: "problem", label: "Business problem or opportunity", kind: "draft", scoutStep: 2, fields: ["problemDefinition"] },
  { id: "affectedUnits", label: `Affected ${tenant.tierLabels.unitPlural}`, kind: "choice", fields: ["affectedBusinessUnits"] },
  { id: "audience", label: "Internal or external", kind: "choice", fields: ["deliveryAudience"] },
  {
    id: "solutionBenefits",
    label: "Proposed solution & expected benefits",
    kind: "draft",
    scoutStep: 3,
    fields: ["solutionSummary", "userValue", "businessValue"],
  },
  ]
}

/** The active tenant's topics — the module-load snapshot every existing consumer uses. */
export const INTAKE_TOPICS: IntakeTopic[] = getIntakeTopics()

function present(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0
  return typeof v === "string" && v.trim().length > 0
}

export function isTopicCaptured(topic: IntakeTopic, formData: FormData): boolean {
  return topic.fields.every((key) => present(formData[key]))
}

/**
 * The topics currently in play — every admin-enabled light-intake topic, in
 * order. Pass `formData.submitterOffice` so a topic scoped to another
 * bureau (bureau-cascade tenants only) is skipped the same way the wizard
 * would skip its field, so the assistant never asks about something it
 * couldn't actually save.
 */
export function activeIntakeTopics(businessUnit?: string | null): IntakeTopic[] {
  return INTAKE_TOPICS.filter((t) => t.fields.some((f) => isFieldEnabled(f, businessUnit)))
}

/** First topic not yet captured, or null once every light field is in. */
export function nextIntakeTopic(formData: FormData): IntakeTopic | null {
  const topics = activeIntakeTopics(formData.submitterOffice)
  return topics.find((t) => !isTopicCaptured(t, formData)) || null
}

/** True once every active light-intake topic has been captured. */
export function intakeMinimumMet(formData: FormData): boolean {
  return nextIntakeTopic(formData) === null
}
