// Submission readiness gate — the *idea* intake gate (issue #160, slimmed
// further by issue #162).
// Two-layer check before the Submit button enables on the Review step:
//   1. COMPLETENESS — every required field has *some* content
//      (presence, not length — quality is judged by the AI, not by char count)
//   2. QUALITY — the AI readiness assessment must have been run AND
//      its verdict must be "ready" or "needs_work" (not "early_stage")
//
// Rationale: the AI's verdict is a richer signal than any length threshold.
// A 10-char title with a clear, specific use case can be more substantive
// than a 100-char rambling title. We trust the AI to surface real quality.
//
// Two-stage lifecycle (issue #160): a submitter here is only ever submitting
// an *idea* (raw, unvetted) — the OMB 34-field inventory, the M-25-21
// minimum-practice block, and the RMF inputs are governance work that
// belongs to the *vetting* stage (a reviewer turning an idea into an
// approved use case, lib/reviewWorkflow.ts's `getLifecycleStage`), not
// intake. Those checks still run (same `showWhen`-aware gating as every
// other field) so the data is there the moment a reviewer needs it, but
// they land in `governanceMissing` — informational, and never counted
// toward `canSubmit`/`completenessPercent`. The fields themselves are
// unchanged in the data model and the OMB export (lib/ombExport.ts) still
// reads them regardless of whether they were "required" to submit.
//
// Issue #162 narrowed idea intake further, to a 5-step flow (Problem,
// Solution & Benefits, Technical Constraints, Summary, Review & Submit):
// Strategic Alignment and Success Metrics are no longer collected at
// intake at all (filled in during vetting, same as the governance block),
// and the submitter *self-rating* fields — `severity`, `implementationComplexity`,
// `userTimeSavings`, `costSavings` — are dropped from the gate too. Value and
// impact are a Scout/reviewer determination, not something a submitter grades
// on their own idea. All of these fields stay in `FormData`; they're simply
// never demanded here, same treatment as the OMB governance block above.

import type { FormData } from "@/lib/steps"
import { isFieldVisible } from "@/lib/formConfig"
import { getTenant, type TenantConfig } from "@/lib/tenant"

// The governance fields tracked in `governanceMissing` below — exported so
// lib/governanceCapture.ts (issue #161's reviewer-side "complete the use
// case" capture) can drive the same field list without hand-duplicating it.
// Order matches the `omb(...)` calls in `getSubmissionReadiness`.
export const GOVERNANCE_FIELD_KEYS: (keyof FormData)[] = [
  "stageOfDevelopment",
  "highImpact",
  "highImpactJustification",
  "topicArea",
  "aiClassification",
  "disseminatesToPublic",
  "scalable",
  "hasATO",
  "atoSystemName",
  "systemSource",
  "systemSourceVendorName",
  "operationalDate",
  "trainingDataDescription",
  "hasPii",
  "demographicFeatures",
  "customCode",
  "preDeploymentTesting",
  "aiImpactAssessmentCompleted",
  "aiImpactAssessment",
  "independentReviewConducted",
  "ongoingMonitoringPlan",
  "operatorTrainingEstablished",
  "failSafeMechanism",
  "humanOversightAppeal",
  "publicConsultationSteps",
]

export type MissingReason = "missing" | "not_assessed" | "low_quality"

export type MissingItem = {
  step: number
  stepName: string
  field: string
  reason: MissingReason
  message: string
}

export type SubmissionReadiness = {
  canSubmit: boolean
  completenessPercent: number
  totalChecks: number
  missing: MissingItem[]
  warnings: MissingItem[]
  // Governance fields (OMB inventory, M-25-21 minimum practice, RMF inputs)
  // that are currently applicable (per `showWhen`) but unanswered. Vetting-
  // stage information only — never blocks idea submission.
  governanceMissing: MissingItem[]
}

function presentString(v: string | undefined): boolean {
  return !!(v && v.trim().length > 0)
}

function hasArrayValue(v: string[] | undefined): boolean {
  return Array.isArray(v) && v.length > 0
}

export function getSubmissionReadiness(
  formData: FormData,
  tenant: TenantConfig = getTenant(),
): SubmissionReadiness {
  const tiers = tenant.tierLabels
  const missing: MissingItem[] = []
  const warnings: MissingItem[] = []
  const governanceMissing: MissingItem[] = []

  // Local helper that respects the admin Form Configuration and each field's
  // `showWhen` prerequisite (issue #60): a disabled field, or one whose
  // prerequisite isn't met yet (so the wizard doesn't render it), is by
  // definition not required — skip the check entirely. Same resolver the
  // wizard uses (`isFieldVisible`), so "still needed to submit" can never
  // demand a field the submitter can't currently see. `target` lets the idea
  // gate (`missing`) and the vetting-stage governance checks
  // (`governanceMissing`, issue #160) share this exact same gating logic
  // while landing in separate buckets.
  const needInto = (
    target: MissingItem[],
    field: keyof FormData,
    item: Omit<MissingItem, "field"> & { field?: string },
    test: () => boolean,
  ) => {
    if (!isFieldVisible(field, formData)) return
    if (test()) target.push({ ...item, field: (item.field as string) || (field as string) })
  }

  const need = (
    field: keyof FormData,
    item: Omit<MissingItem, "field"> & { field?: string },
    test: () => boolean,
  ) => needInto(missing, field, item, test)

  // ---------- Step 1: Submitter Info (auto-filled from profile when available) ----------
  need("submitterName", { step: 1, stepName: "Submitter Info", reason: "missing", message: "Submitter name" }, () => !presentString(formData.submitterName))
  need("submitterEmail", { step: 1, stepName: "Submitter Info", reason: "missing", message: "Submitter email" }, () => !presentString(formData.submitterEmail))
  need("submitterRole", { step: 1, stepName: "Submitter Info", reason: "missing", message: "Job role" }, () => !formData.submitterRole)
  need("submitterOffice", { step: 1, stepName: "Submitter Info", reason: "missing", message: tiers.unit }, () => !formData.submitterOffice)

  // ---------- Step 2: Business Problem & Opportunity ----------
  need("coreProblem", { step: 2, stepName: "Business Problem & Opportunity", reason: "missing", message: "Problem statement" }, () => !presentString(formData.coreProblem))
  need("affectedBusinessUnits", { step: 2, stepName: "Business Problem & Opportunity", reason: "missing", message: `Affected ${tiers.unitPlural.toLowerCase()}` }, () => !hasArrayValue(formData.affectedBusinessUnits))
  need("targetAudience", { step: 2, stepName: "Business Problem & Opportunity", reason: "missing", message: "Target audience" }, () => !formData.targetAudience)
  need("impactedUsersCount", { step: 2, stepName: "Business Problem & Opportunity", reason: "missing", message: "Estimated users impacted" }, () => !formData.impactedUsersCount)
  need("targetUserContext", { step: 2, stepName: "Business Problem & Opportunity", reason: "missing", message: "User profile / context" }, () => !presentString(formData.targetUserContext))

  // ---------- Step 3: Proposed Solution & Expected Benefits (merged) ----------
  need("proposedSolution", { step: 3, stepName: "Proposed Solution & Benefits", reason: "missing", message: "Proposed solution" }, () => !presentString(formData.proposedSolution))
  need("userValue", { step: 3, stepName: "Proposed Solution & Benefits", reason: "missing", message: "Expected user benefit" }, () => !presentString(formData.userValue))
  need("businessValue", { step: 3, stepName: "Proposed Solution & Benefits", reason: "missing", message: "Expected business benefit" }, () => !presentString(formData.businessValue))

  // ---------- Step 5: Idea Overview ----------
  need("useCaseTitle", { step: 5, stepName: "Idea Overview", reason: "missing", message: "Idea title" }, () => !presentString(formData.useCaseTitle))
  need("useCaseDescription", { step: 5, stepName: "Idea Overview", reason: "missing", message: "Idea description" }, () => !presentString(formData.useCaseDescription))
  need("isWithheld", { step: 5, stepName: "Idea Overview", reason: "missing", message: "Withhold-from-public-reporting reason" }, () => !formData.isWithheld)

  // ---------- OMB federal AI use case inventory, M-25-21, and RMF inputs (issue #160) ----------
  // These are governance fields that belong to the *vetting* stage, not idea
  // intake (issue #160) — they land in `governanceMissing`, never `missing`,
  // so they're tracked but don't block a submitter from submitting an idea.
  // Every check below is still scoped to "currently applicable" purely by
  // calling `needInto()`, which gates on `isFieldVisible` — the same
  // resolver the wizard uses for `showWhen` conditional disclosure
  // (lib/formConfig.ts). A field whose prerequisite isn't met (e.g.
  // `topicArea` before a development stage is chosen, or any of the 9
  // high-impact-only fields unless `highImpact === "high_impact"` AND
  // `stageOfDevelopment === "deployed"`) is simply never checked — no second
  // copy of the `showWhen` predicates lives here.
  // step: 0 — these aren't demanded on any wizard step anymore (issue #162
  // moved the whole governance block to vetting-only); 0 flags that plainly
  // rather than pointing at a real intake step number.
  const omb = (field: keyof FormData, message: string, test: () => boolean) =>
    needInto(governanceMissing, field, { step: 0, stepName: "Governance (vetting)", reason: "missing", message }, test)

  omb("stageOfDevelopment", "Stage of development", () => !formData.stageOfDevelopment)
  omb("highImpact", "High-impact determination", () => !formData.highImpact)
  omb("highImpactJustification", "High-impact justification", () => !presentString(formData.highImpactJustification))
  omb("topicArea", "Use case topic area", () => !formData.topicArea)
  omb("aiClassification", "AI classification", () => !formData.aiClassification)
  omb("disseminatesToPublic", "Disseminates information to the public answer", () => !formData.disseminatesToPublic)
  omb("scalable", "Scalable-beyond-deployment answer", () => !formData.scalable)
  omb("hasATO", "Associated ATO answer", () => !formData.hasATO)
  omb("atoSystemName", "ATO system name", () => !presentString(formData.atoSystemName))
  omb("systemSource", "Built in-house / under contract / purchased", () => !formData.systemSource)
  omb("systemSourceVendorName", "Vendor name", () => !presentString(formData.systemSourceVendorName))
  omb("operationalDate", "Operational / pilot start date", () => !presentString(formData.operationalDate))
  omb("trainingDataDescription", "Training / evaluation data description", () => !presentString(formData.trainingDataDescription))
  omb("hasPii", "Involves PII answer", () => !formData.hasPii)
  omb("demographicFeatures", "Demographic variables used as model features", () => !hasArrayValue(formData.demographicFeatures))
  omb("customCode", "Includes custom-developed code answer", () => !formData.customCode)
  // M-25-21 minimum-practice risk-management fields (#26-34) — only reached
  // when `isFieldVisible` says the high-impact-and-deployed gate is open.
  omb("preDeploymentTesting", "Pre-deployment testing answer", () => !formData.preDeploymentTesting)
  omb("aiImpactAssessmentCompleted", "AI impact assessment completed answer", () => !formData.aiImpactAssessmentCompleted)
  omb("aiImpactAssessment", "Potential impacts description", () => !presentString(formData.aiImpactAssessment))
  omb("independentReviewConducted", "Independent review answer", () => !formData.independentReviewConducted)
  omb("ongoingMonitoringPlan", "Ongoing monitoring plan answer", () => !formData.ongoingMonitoringPlan)
  omb("operatorTrainingEstablished", "Operator training answer", () => !formData.operatorTrainingEstablished)
  omb("failSafeMechanism", "Fail-safe mechanism answer", () => !formData.failSafeMechanism)
  omb("humanOversightAppeal", "Appeal process answer", () => !formData.humanOversightAppeal)
  omb("publicConsultationSteps", "Public consultation steps", () => !hasArrayValue(formData.publicConsultationSteps))

  // ---------- Quality gate: AI readiness assessment (Step 6: Review & Submit) ----------
  if (!formData.readinessScore) {
    missing.push({
      step: 6,
      stepName: "Review",
      field: "readinessScore",
      reason: "not_assessed",
      message: "Run the AI readiness assessment to verify quality",
    })
  } else if (formData.readinessScore === "early_stage") {
    // Quality threshold not met — submission blocked.
    missing.push({
      step: 6,
      stepName: "Review",
      field: "readinessScore",
      reason: "low_quality",
      message:
        "AI readiness assessment marked this as 'Early Stage' — refine the dimensions called out in the summary before submitting (e.g., at least one feature well-defined, clear strategic alignment, defensible user/business value, reasonable measurement and timeline)",
    })
  } else if (formData.readinessScore === "needs_work") {
    warnings.push({
      step: 6,
      stepName: "Review",
      field: "readinessScore",
      reason: "low_quality",
      message: "AI marked this as 'Needs Work' — you can submit, but reviewer will see the gaps called out in the summary",
    })
  }

  // Count enabled-and-required fields dynamically — disabled fields don't
  // count toward the completeness denominator, so a heavily-trimmed config
  // doesn't show as artificially incomplete. The OMB inventory, M-25-21, and
  // RMF governance fields are deliberately absent here (issue #160), and so
  // are Strategic Alignment, Success Metrics, and the submitter self-rating
  // fields (`severity`, `implementationComplexity`, `userTimeSavings`,
  // `costSavings`) as of issue #162 — none of them are part of the idea
  // completeness percentage anymore.
  const REQUIRED_FIELD_KEYS: (keyof FormData)[] = [
    "submitterName", "submitterEmail", "submitterRole", "submitterOffice",
    "coreProblem", "affectedBusinessUnits", "targetAudience", "impactedUsersCount", "targetUserContext",
    "proposedSolution", "userValue", "businessValue",
    "useCaseTitle", "useCaseDescription", "isWithheld",
  ]
  const enabledRequiredCount = REQUIRED_FIELD_KEYS.filter((k) => isFieldVisible(k, formData)).length
  const totalChecks = enabledRequiredCount + 1 // + 1 for the AI quality gate
  const passed = Math.max(0, totalChecks - missing.length)
  const completenessPercent = Math.max(0, Math.min(100, Math.round((passed / totalChecks) * 100)))

  return {
    canSubmit: missing.length === 0,
    completenessPercent,
    totalChecks,
    missing,
    warnings,
    governanceMissing,
  }
}


// ---------------------------------------------------------------------------
// Progress model — single source of truth for "is this step actually done?"
// Drives the left-nav checkmarks and the top progress bar so they reflect
// real completeness (required fields filled) instead of just which step the
// user has visited. The step numbers here line up with the wizard's
// currentStep (1 = Submitter Info … 5 = Idea Overview, 6 = Review).
// ---------------------------------------------------------------------------
export type ProgressModel = {
  /** Steps (1-5) that still have at least one missing required field. */
  missingSteps: Set<number>
  /** True only when every required item passes (the Submit gate is open). */
  canSubmit: boolean
  /**
   * Whether a given step is fully complete. Content steps (1-5) are complete
   * when none of their required fields are missing. The review step (6) is
   * complete only when the whole submission can be submitted.
   */
  isStepComplete: (step: number) => boolean
}

export function getProgressModel(formData: FormData): ProgressModel {
  const { missing, canSubmit } = getSubmissionReadiness(formData)
  const missingSteps = new Set<number>(missing.map((m) => m.step))
  const isStepComplete = (step: number): boolean => {
    if (step >= 6) return canSubmit // review / final step
    return !missingSteps.has(step)
  }
  return { missingSteps, canSubmit, isStepComplete }
}
