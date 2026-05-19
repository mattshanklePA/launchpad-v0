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

  // ---------- Step 1: Submitter Info (auto-filled from profile when available) ----------
  if (!presentString(formData.submitterName)) {
    missing.push({ step: 1, stepName: "Submitter Info", field: "submitterName", reason: "missing", message: "Submitter name" })
  }
  if (!presentString(formData.submitterEmail)) {
    missing.push({ step: 1, stepName: "Submitter Info", field: "submitterEmail", reason: "missing", message: "Submitter email" })
  }
  if (!formData.submitterRole) {
    missing.push({ step: 1, stepName: "Submitter Info", field: "submitterRole", reason: "missing", message: "Job role" })
  }
  if (!formData.submitterOffice) {
    missing.push({ step: 1, stepName: "Submitter Info", field: "submitterOffice", reason: "missing", message: "Business unit" })
  }

  // ---------- Step 2: Use Case Overview ----------
  if (!presentString(formData.useCaseTitle)) {
    missing.push({ step: 2, stepName: "Idea Overview", field: "useCaseTitle", reason: "missing", message: "Idea title" })
  }
  if (!presentString(formData.useCaseDescription)) {
    missing.push({ step: 2, stepName: "Idea Overview", field: "useCaseDescription", reason: "missing", message: "Idea description" })
  }
  if (!formData.publicIndicator) {
    missing.push({ step: 2, stepName: "Idea Overview", field: "publicIndicator", reason: "missing", message: "Public / excluded classification" })
  }

  // ---------- Step 3: Problem & Target Users (merged) ----------
  if (!presentString(formData.coreProblem)) {
    missing.push({ step: 3, stepName: "Problem & Target Users", field: "coreProblem", reason: "missing", message: "Problem statement" })
  }
  if (!formData.severity) {
    missing.push({ step: 3, stepName: "Problem & Target Users", field: "severity", reason: "missing", message: "Severity rating" })
  }
  if (!formData.affectedSystem) {
    missing.push({ step: 3, stepName: "Problem & Target Users", field: "affectedSystem", reason: "missing", message: "Affected system" })
  }
  if (!formData.targetAudience) {
    missing.push({ step: 3, stepName: "Problem & Target Users", field: "targetAudience", reason: "missing", message: "Target audience" })
  }
  if (!formData.impactedUsersCount) {
    missing.push({ step: 3, stepName: "Problem & Target Users", field: "impactedUsersCount", reason: "missing", message: "Estimated users impacted" })
  }
  if (!presentString(formData.targetUserContext)) {
    missing.push({ step: 3, stepName: "Problem & Target Users", field: "targetUserContext", reason: "missing", message: "User profile / context" })
  }

  // ---------- Step 4: Proposed Solution ----------
  if (!presentString(formData.proposedSolution)) {
    missing.push({ step: 4, stepName: "Proposed Solution", field: "proposedSolution", reason: "missing", message: "Proposed solution" })
  }

  // ---------- Step 5: Value to Users and the Business (merged) ----------
  if (!presentString(formData.userValue)) {
    missing.push({ step: 5, stepName: "Value", field: "userValue", reason: "missing", message: "User value statement" })
  }
  if (!formData.userTimeSavings) {
    missing.push({ step: 5, stepName: "Value", field: "userTimeSavings", reason: "missing", message: "Time savings range" })
  }
  if (!presentString(formData.businessValue)) {
    missing.push({ step: 5, stepName: "Value", field: "businessValue", reason: "missing", message: "Business value statement" })
  }
  if (!formData.costSavings) {
    missing.push({ step: 5, stepName: "Value", field: "costSavings", reason: "missing", message: "Cost savings range" })
  }

  // ---------- Step 6: Strategic Alignment ----------
  if (!presentString(formData.relevantOkrs)) {
    missing.push({ step: 6, stepName: "Strategic Alignment", field: "relevantOkrs", reason: "missing", message: "Strategic alignment text" })
  }
  if (!hasArrayValue(formData.usptoFocusArea)) {
    missing.push({ step: 6, stepName: "Strategic Alignment", field: "usptoFocusArea", reason: "missing", message: "At least one USPTO focus area" })
  }

  // ---------- Step 7: Feasibility & Security ----------
  if (!presentString(formData.dependencies)) {
    missing.push({ step: 7, stepName: "Feasibility & Security", field: "dependencies", reason: "missing", message: "Feasibility / dependencies" })
  }
  if (!formData.implementationComplexity) {
    missing.push({ step: 7, stepName: "Feasibility & Security", field: "implementationComplexity", reason: "missing", message: "Implementation complexity" })
  }
  if (!formData.involvesSensitiveData) {
    missing.push({ step: 7, stepName: "Feasibility & Security", field: "involvesSensitiveData", reason: "missing", message: "PII / sensitive data answer" })
  }
  // AI Risk Management — DoC mandated, all three required for submission.
  if (!formData.aiDecisionalImpact) {
    missing.push({ step: 7, stepName: "Feasibility & Security", field: "aiDecisionalImpact", reason: "missing", message: "AI decisional impact answer" })
  }
  if (!formData.aiModelSourcing) {
    missing.push({ step: 7, stepName: "Feasibility & Security", field: "aiModelSourcing", reason: "missing", message: "AI model sourcing" })
  }
  if (!formData.aiHumanReview) {
    missing.push({ step: 7, stepName: "Feasibility & Security", field: "aiHumanReview", reason: "missing", message: "Human review answer" })
  }

  // ---------- Step 8: Success Metrics ----------
  if (!presentString(formData.successMetrics)) {
    missing.push({ step: 8, stepName: "Success Metrics", field: "successMetrics", reason: "missing", message: "Success metrics" })
  }
  if (!formData.timelineForResults) {
    missing.push({ step: 8, stepName: "Success Metrics", field: "timelineForResults", reason: "missing", message: "Timeline for results" })
  }

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

  const totalChecks = 25 + 1 // 25 required fields + 1 quality gate
  const passed = totalChecks - missing.length
  const completenessPercent = Math.max(0, Math.min(100, Math.round((passed / totalChecks) * 100)))

  return {
    canSubmit: missing.length === 0,
    completenessPercent,
    totalChecks,
    missing,
    warnings,
  }
}
