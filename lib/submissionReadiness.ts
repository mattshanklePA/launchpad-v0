// Submission readiness gate.
// Two-layer check before the Submit button enables on Step 11:
//   1. COMPLETENESS — every required field has *some* content
//      (presence, not length — quality is judged by the AI, not by char count)
//   2. QUALITY — the AI readiness assessment must have been run AND
//      its verdict must be "ready" or "needs_work" (not "early_stage")
//
// Rationale: the AI's verdict is a richer signal than any length threshold.
// A 10-char title with a clear, specific use case can be more substantive
// than a 100-char rambling title. We trust the AI to surface real quality.

import type { FormData } from "@/lib/steps"
import { isFieldEnabled } from "@/lib/formConfig"

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
}

function presentString(v: string | undefined): boolean {
  return !!(v && v.trim().length > 0)
}

function hasArrayValue(v: string[] | undefined): boolean {
  return Array.isArray(v) && v.length > 0
}

export function getSubmissionReadiness(formData: FormData): SubmissionReadiness {
  const missing: MissingItem[] = []
  const warnings: MissingItem[] = []

  // Local helper that respects the admin Form Configuration. A disabled field
  // is by definition not required — skip the check entirely.
  const need = (
    field: keyof FormData,
    item: Omit<MissingItem, "field"> & { field?: string },
    test: () => boolean,
  ) => {
    if (!isFieldEnabled(field)) return
    if (test()) missing.push({ ...item, field: (item.field as string) || (field as string) })
  }

  // ---------- Step 1: Submitter Info (auto-filled from profile when available) ----------
  need("submitterName", { step: 1, stepName: "Submitter Info", reason: "missing", message: "Submitter name" }, () => !presentString(formData.submitterName))
  need("submitterEmail", { step: 1, stepName: "Submitter Info", reason: "missing", message: "Submitter email" }, () => !presentString(formData.submitterEmail))
  need("submitterRole", { step: 1, stepName: "Submitter Info", reason: "missing", message: "Job role" }, () => !formData.submitterRole)
  need("submitterOffice", { step: 1, stepName: "Submitter Info", reason: "missing", message: "Business unit" }, () => !formData.submitterOffice)

  // ---------- Step 2: Use Case Overview ----------
  need("useCaseTitle", { step: 3, stepName: "Idea Overview", reason: "missing", message: "Idea title" }, () => !presentString(formData.useCaseTitle))
  need("useCaseDescription", { step: 3, stepName: "Idea Overview", reason: "missing", message: "Idea description" }, () => !presentString(formData.useCaseDescription))
  need("publicIndicator", { step: 3, stepName: "Idea Overview", reason: "missing", message: "Public / excluded classification" }, () => !formData.publicIndicator)

  // ---------- Step 3: Problem & Target Users (merged) ----------
  need("coreProblem", { step: 2, stepName: "Problem & Target Users", reason: "missing", message: "Problem statement" }, () => !presentString(formData.coreProblem))
  need("severity", { step: 2, stepName: "Problem & Target Users", reason: "missing", message: "Severity rating" }, () => !formData.severity)
  need("affectedSystem", { step: 2, stepName: "Problem & Target Users", reason: "missing", message: "Affected system" }, () => !formData.affectedSystem)
  need("targetAudience", { step: 2, stepName: "Problem & Target Users", reason: "missing", message: "Target audience" }, () => !formData.targetAudience)
  need("impactedUsersCount", { step: 2, stepName: "Problem & Target Users", reason: "missing", message: "Estimated users impacted" }, () => !formData.impactedUsersCount)
  need("targetUserContext", { step: 2, stepName: "Problem & Target Users", reason: "missing", message: "User profile / context" }, () => !presentString(formData.targetUserContext))

  // ---------- Step 4: Proposed Solution ----------
  need("proposedSolution", { step: 4, stepName: "Proposed Solution", reason: "missing", message: "Proposed solution" }, () => !presentString(formData.proposedSolution))

  // ---------- Step 5: Value to Users and the Business (merged) ----------
  need("userValue", { step: 5, stepName: "Value", reason: "missing", message: "User value statement" }, () => !presentString(formData.userValue))
  need("userTimeSavings", { step: 5, stepName: "Value", reason: "missing", message: "Time savings range" }, () => !formData.userTimeSavings)
  need("businessValue", { step: 5, stepName: "Value", reason: "missing", message: "Business value statement" }, () => !presentString(formData.businessValue))
  need("costSavings", { step: 5, stepName: "Value", reason: "missing", message: "Cost savings range" }, () => !formData.costSavings)

  // ---------- Step 6: Strategic Alignment ----------
  need("relevantOkrs", { step: 6, stepName: "Strategic Alignment", reason: "missing", message: "Strategic alignment text" }, () => !presentString(formData.relevantOkrs))
  need("usptoFocusArea", { step: 6, stepName: "Strategic Alignment", reason: "missing", message: "At least one USPTO focus area" }, () => !hasArrayValue(formData.usptoFocusArea))

  // ---------- Step 7: Feasibility & Security ----------
  need("dependencies", { step: 7, stepName: "Feasibility & Security", reason: "missing", message: "Feasibility / dependencies" }, () => !presentString(formData.dependencies))
  need("implementationComplexity", { step: 7, stepName: "Feasibility & Security", reason: "missing", message: "Implementation complexity" }, () => !formData.implementationComplexity)
  // AI Risk Management — DoC mandated. These fields are locked-on in the
  // registry so `need()` will always run the check.
  need("involvesSensitiveData", { step: 7, stepName: "Feasibility & Security", reason: "missing", message: "PII / sensitive data answer" }, () => !formData.involvesSensitiveData)
  need("aiDecisionalImpact", { step: 7, stepName: "Feasibility & Security", reason: "missing", message: "AI decisional impact answer" }, () => !formData.aiDecisionalImpact)
  need("aiModelSourcing", { step: 7, stepName: "Feasibility & Security", reason: "missing", message: "AI model sourcing" }, () => !formData.aiModelSourcing)
  need("aiHumanReview", { step: 7, stepName: "Feasibility & Security", reason: "missing", message: "Human review answer" }, () => !formData.aiHumanReview)

  // ---------- Step 8: Success Metrics ----------
  need("successMetrics", { step: 8, stepName: "Success Metrics", reason: "missing", message: "Success metrics" }, () => !presentString(formData.successMetrics))
  need("timelineForResults", { step: 8, stepName: "Success Metrics", reason: "missing", message: "Timeline for results" }, () => !formData.timelineForResults)

  // ---------- Quality gate: AI readiness assessment ----------
  if (!formData.readinessScore) {
    missing.push({
      step: 9,
      stepName: "Review",
      field: "readinessScore",
      reason: "not_assessed",
      message: "Run the AI readiness assessment to verify quality",
    })
  } else if (formData.readinessScore === "early_stage") {
    // Quality threshold not met — submission blocked.
    missing.push({
      step: 9,
      stepName: "Review",
      field: "readinessScore",
      reason: "low_quality",
      message:
        "AI readiness assessment marked this as 'Early Stage' — refine the dimensions called out in the summary before submitting (e.g., at least one feature well-defined, clear strategic alignment, defensible user/business value, reasonable measurement and timeline)",
    })
  } else if (formData.readinessScore === "needs_work") {
    warnings.push({
      step: 9,
      stepName: "Review",
      field: "readinessScore",
      reason: "low_quality",
      message: "AI marked this as 'Needs Work' — you can submit, but reviewer will see the gaps called out in the summary",
    })
  }

  // Count enabled-and-required fields dynamically — disabled fields don't
  // count toward the completeness denominator, so a heavily-trimmed config
  // doesn't show as artificially incomplete.
  const REQUIRED_FIELD_KEYS: (keyof FormData)[] = [
    "submitterName", "submitterEmail", "submitterRole", "submitterOffice",
    "useCaseTitle", "useCaseDescription", "publicIndicator",
    "coreProblem", "severity", "affectedSystem", "targetAudience", "impactedUsersCount", "targetUserContext",
    "proposedSolution",
    "userValue", "userTimeSavings", "businessValue", "costSavings",
    "relevantOkrs", "usptoFocusArea",
    "dependencies", "implementationComplexity",
    "involvesSensitiveData", "aiDecisionalImpact", "aiModelSourcing", "aiHumanReview",
    "successMetrics", "timelineForResults",
  ]
  const enabledRequiredCount = REQUIRED_FIELD_KEYS.filter((k) => isFieldEnabled(k)).length
  const totalChecks = enabledRequiredCount + 1 // + 1 for the AI quality gate
  const passed = Math.max(0, totalChecks - missing.length)
  const completenessPercent = Math.max(0, Math.min(100, Math.round((passed / totalChecks) * 100)))

  return {
    canSubmit: missing.length === 0,
    completenessPercent,
    totalChecks,
    missing,
    warnings,
  }
}


// ---------------------------------------------------------------------------
// Progress model — single source of truth for "is this step actually done?"
// Drives the left-nav checkmarks and the top progress bar so they reflect
// real completeness (required fields filled) instead of just which step the
// user has visited. The step numbers here line up with the wizard's
// currentStep (1 = Submitter Info … 8 = Success Metrics, 9 = Review).
// ---------------------------------------------------------------------------
export type ProgressModel = {
  /** Steps (1-8) that still have at least one missing required field. */
  missingSteps: Set<number>
  /** True only when every required item passes (the Submit gate is open). */
  canSubmit: boolean
  /**
   * Whether a given step is fully complete. Content steps (1-8) are complete
   * when none of their required fields are missing. The review step (9) is
   * complete only when the whole submission can be submitted.
   */
  isStepComplete: (step: number) => boolean
}

export function getProgressModel(formData: FormData): ProgressModel {
  const { missing, canSubmit } = getSubmissionReadiness(formData)
  const missingSteps = new Set<number>(missing.map((m) => m.step))
  const isStepComplete = (step: number): boolean => {
    if (step >= 9) return canSubmit // review / final step
    return !missingSteps.has(step)
  }
  return { missingSteps, canSubmit, isStepComplete }
}
