// NIST AI RMF profile — a deterministic Govern/Map/Measure/Manage lens over
// the OMB/DoC fields LaunchPad already collects, per the spec in
// docs/nist-rmf-mapping.md (Roadmap #22 story 2). Pure, no I/O — mirrors
// lib/riskProfile.ts's computeRiskProfile shape/cascade style and the
// determination-module pattern (lib/highImpactDetermination.ts,
// lib/ombReportability.ts): reads fields LaunchPad already has, never
// recomputes a second copy of an existing determination.
//
// This is a lens, not new intake — see docs/nist-rmf-mapping.md §3-5 for the
// field -> function mapping and the per-function rubric this file implements
// literally. §6 is the overall rollup cascade.

import type { FormData } from "@/lib/steps"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { departmentFinalApprovalEnabled } from "@/lib/bureauSignoff"
import type { BureauSignoff, DepartmentApproval } from "@/lib/bureauSignoff"
import { STATUS_BADGE_CLASS } from "@/lib/statusTokens"

export type RmfFunctionKey = "govern" | "map" | "measure" | "manage"

export type RmfFunctionStatus = "covered" | "partial" | "gap" | "not_yet_applicable"

export type RmfRiskLevel = "on_track" | "attention" | "at_risk" | "unknown"

export type RmfFunctionResult = {
  status: RmfFunctionStatus
  reasons: string[]
}

export type RmfProfile = {
  functions: Record<RmfFunctionKey, RmfFunctionResult>
  overall: RmfRiskLevel
  rationale: string
  // Short "Function: reason" strings surfaced individually so the UI can
  // list them on hover — mirrors RiskProfile's `flags` (lib/riskProfile.ts).
  flags: string[]
}

export const RMF_FUNCTION_ORDER: RmfFunctionKey[] = ["govern", "map", "measure", "manage"]

export const RMF_FUNCTION_LABELS: Record<RmfFunctionKey, string> = {
  govern: "Govern",
  map: "Map",
  measure: "Measure",
  manage: "Manage",
}

export const RMF_OVERALL_LABELS: Record<RmfRiskLevel, string> = {
  on_track: "On Track",
  attention: "Needs Attention",
  at_risk: "At Risk",
  unknown: "RMF Unassessed",
}

export const RMF_FUNCTION_STATUS_LABELS: Record<RmfFunctionStatus, string> = {
  covered: "Covered",
  partial: "Partial",
  gap: "Gap",
  not_yet_applicable: "Not yet applicable",
}

// Fields this module reads. `bureauSignoff`/`departmentApproval` aren't part
// of `FormData` itself — they're recorded on the submission's `form_data` at
// runtime by lib/bureauSignoff.ts — so callers with a `Submission` pass
// `getBureauSignoff(submission)`/`getDepartmentApproval(submission)` through.
export type RmfInputs = Partial<FormData> & {
  bureauSignoff?: BureauSignoff
  departmentApproval?: DepartmentApproval
}

type FieldCheck = { label: string; ok: boolean; note?: string }

/** Placeholder answer states that mean "not yet a final answer" across the OMB minimum-practice fields. */
const PLACEHOLDER_VALUES = new Set(["in_progress", "waived"])

function isDecided(v: string | undefined): boolean {
  return !!v && !PLACEHOLDER_VALUES.has(v)
}

function presentText(v: string | undefined): boolean {
  return !!v && v.trim().length > 0
}

/** Resolves `covered`/`partial`/`gap` from a flat list of field checks — `covered` if every check passes, `gap` if none do, `partial` otherwise. Mirrors §5's "all answered" / "none answered" / otherwise structure for Map, Measure, and Manage. */
function summarizeChecks(checks: FieldCheck[], coveredReason: string): { status: "covered" | "partial" | "gap"; reasons: string[] } {
  const missing = checks.filter((c) => !c.ok)
  if (missing.length === 0) return { status: "covered", reasons: [coveredReason] }
  const reasons = missing.map((c) => c.note || `${c.label} not yet answered.`)
  if (missing.length === checks.length) return { status: "gap", reasons }
  return { status: "partial", reasons }
}

/**
 * Govern — accountable review, authorization, disclosure.
 * `not_yet_applicable` only if nothing has been submitted yet.
 */
function governStatus(fd: RmfInputs, tenant: TenantConfig): RmfFunctionResult {
  if (!fd.stageOfDevelopment) {
    return { status: "not_yet_applicable", reasons: ["No use case has been submitted yet."] }
  }

  const reviewStatus = fd.reviewStatus || "submitted"
  const departmentTierEnabled = departmentFinalApprovalEnabled(tenant)
  const atoAnswered = fd.hasATO === "no" || (fd.hasATO === "yes" && presentText(fd.atoSystemName))

  const missing: string[] = []
  if (reviewStatus !== "approved") {
    missing.push(`Review is not yet approved (current status: "${reviewStatus}").`)
  } else {
    if (!fd.bureauSignoff) missing.push("Approved with no bureau sign-off on file.")
    if (departmentTierEnabled && !fd.departmentApproval) missing.push("Approved with no department-level approval on file.")
  }
  if (!atoAnswered) {
    if (!fd.hasATO) missing.push("Associated ATO status has not been answered.")
    else if (fd.hasATO === "yes") missing.push("ATO marked yes but no system name is on file.")
    else missing.push("Associated ATO status is still in progress.")
  }
  if (!fd.isWithheld) missing.push("Public-disclosure (withhold-from-public) decision has not been answered.")

  if (missing.length === 0) {
    return {
      status: "covered",
      reasons: [
        departmentTierEnabled
          ? "Review is approved with bureau sign-off and department approval on file, and ATO and public-disclosure status are both recorded."
          : "Review is approved with bureau sign-off on file, and ATO and public-disclosure status are both recorded.",
      ],
    }
  }

  const gapCondition = (reviewStatus === "draft" || reviewStatus === "submitted") && !fd.hasATO && !fd.isWithheld
  return { status: gapCondition ? "gap" : "partial", reasons: missing }
}

/**
 * Map — context, classification, impact screening.
 * `not_yet_applicable` if nothing has been submitted yet or the use case has been retired.
 */
function mapStatus(fd: RmfInputs): RmfFunctionResult {
  if (!fd.stageOfDevelopment) {
    return { status: "not_yet_applicable", reasons: ["No use case has been submitted yet."] }
  }
  if (fd.stageOfDevelopment === "retired") {
    return { status: "not_yet_applicable", reasons: ["This use case has been retired."] }
  }

  const checks: FieldCheck[] = [
    { label: "Use case topic area", ok: !!fd.topicArea },
    { label: "AI classification", ok: !!fd.aiClassification },
    { label: "Problem statement", ok: presentText(fd.coreProblem) },
    { label: "Business value statement", ok: presentText(fd.businessValue) },
    { label: "Solution summary", ok: presentText(fd.solutionSummary) },
    { label: "High-impact determination", ok: !!fd.highImpact },
    { label: "Disseminates information to the public", ok: presentText(fd.disseminatesToPublic) },
    { label: "Scalable beyond current deployment", ok: presentText(fd.scalable) },
  ]
  // Only counted when applicable — otherwise this check would be vacuously
  // "ok" and mask a fully-blank submission as partial instead of gap.
  if (fd.highImpact === "presumed_not_high_impact") {
    checks.push({ label: "High-impact justification", ok: presentText(fd.highImpactJustification) })
  }
  return summarizeChecks(
    checks,
    "Use case is classified, scoped, and screened for high-impact effects.",
  )
}

/** Measure/Manage share the same applicability gate as `lib/fieldRegistry.ts`'s `highImpactAndDeployed` `showWhen` predicate. */
function highImpactAndDeployed(fd: RmfInputs): boolean {
  return fd.highImpact === "high_impact" && fd.stageOfDevelopment === "deployed"
}

const NOT_YET_APPLICABLE_REASON =
  "Not yet applicable — the M-25-21 minimum-practice fields only apply once this use case is both high-impact and deployed."

/**
 * Measure — testing, assessment, review.
 * `not_yet_applicable` unless high-impact and deployed.
 */
function measureStatus(fd: RmfInputs): RmfFunctionResult {
  if (!highImpactAndDeployed(fd)) {
    return { status: "not_yet_applicable", reasons: [NOT_YET_APPLICABLE_REASON] }
  }

  const checks: FieldCheck[] = [
    { label: "Pre-deployment testing", ok: fd.preDeploymentTesting === "yes" },
    { label: "AI impact assessment completed", ok: fd.aiImpactAssessmentCompleted === "yes" },
    { label: "Potential impacts description", ok: presentText(fd.aiImpactAssessment) },
    {
      label: "Independent review",
      ok: !!fd.independentReviewConducted && fd.independentReviewConducted.startsWith("yes_"),
    },
  ]
  return summarizeChecks(
    checks,
    "Pre-deployment testing, impact assessment, and independent review are all on file.",
  )
}

/**
 * Manage — monitoring, training, fail-safe, appeal, consultation.
 * Same applicability gate as Measure.
 */
function manageStatus(fd: RmfInputs): RmfFunctionResult {
  if (!highImpactAndDeployed(fd)) {
    return { status: "not_yet_applicable", reasons: [NOT_YET_APPLICABLE_REASON] }
  }

  const checks: FieldCheck[] = [
    { label: "Ongoing monitoring plan", ok: fd.ongoingMonitoringPlan === "yes" },
    { label: "Operator training", ok: fd.operatorTrainingEstablished === "yes" },
    { label: "Fail-safe mechanism", ok: isDecided(fd.failSafeMechanism) },
    { label: "Appeal process", ok: isDecided(fd.humanOversightAppeal) },
    { label: "Public consultation steps", ok: Array.isArray(fd.publicConsultationSteps) && fd.publicConsultationSteps.length > 0 },
    { label: "Custom code answer", ok: !!fd.customCode },
    { label: "System source", ok: !!fd.systemSource },
  ]
  return summarizeChecks(
    checks,
    "Ongoing monitoring, training, fail-safe, appeal, and public-consultation steps are all on file.",
  )
}

/** Builds the "Function: reason" flag strings for a non-covered/non-not_yet_applicable function. */
function flagsFor(key: RmfFunctionKey, result: RmfFunctionResult): string[] {
  return result.reasons.map((r) => `${RMF_FUNCTION_LABELS[key]}: ${r}`)
}

/**
 * Computes the deterministic NIST AI RMF profile for one submission's
 * fields: per-function status + reasons (docs/nist-rmf-mapping.md §5), plus
 * the overall rollup (§6) — most-severe-wins cascade mirroring
 * `computeRiskProfile`'s HIGH -> MEDIUM -> LOW style. Pure — no I/O.
 */
export function computeRmfProfile(fd: RmfInputs, tenant: TenantConfig = getTenant()): RmfProfile {
  const govern = governStatus(fd, tenant)
  const map = mapStatus(fd)
  const measure = measureStatus(fd)
  const manage = manageStatus(fd)

  const functions: Record<RmfFunctionKey, RmfFunctionResult> = { govern, map, measure, manage }

  const flags: string[] = []
  for (const key of RMF_FUNCTION_ORDER) {
    const result = functions[key]
    if (result.status === "gap" || result.status === "partial") flags.push(...flagsFor(key, result))
  }

  const highImpactPreDeployment =
    fd.highImpact === "high_impact" && (measure.status === "not_yet_applicable" || manage.status === "not_yet_applicable")
  if (highImpactPreDeployment) {
    if (measure.status === "not_yet_applicable") {
      flags.push(`${RMF_FUNCTION_LABELS.measure}: flagged high-impact — testing/assessment/review will be required once this deploys.`)
    }
    if (manage.status === "not_yet_applicable") {
      flags.push(`${RMF_FUNCTION_LABELS.manage}: flagged high-impact — monitoring/training/appeal will be required once this deploys.`)
    }
  }

  // Cascade — first match wins (docs/nist-rmf-mapping.md §6).
  if (map.status === "not_yet_applicable") {
    return {
      functions,
      overall: "unknown",
      rationale: "Not enough has been submitted yet to assess this use case's RMF governance lifecycle.",
      flags,
    }
  }

  const anyGap = govern.status === "gap" || map.status === "gap" || measure.status === "gap" || manage.status === "gap"
  if (anyGap) {
    return {
      functions,
      overall: "at_risk",
      rationale: "At least one RMF function has a governance gap that needs attention.",
      flags,
    }
  }

  const anyPartial = govern.status === "partial" || map.status === "partial" || measure.status === "partial" || manage.status === "partial"
  if (anyPartial || highImpactPreDeployment) {
    return {
      functions,
      overall: "attention",
      rationale: "One or more RMF functions are only partially covered — review the flags for what's missing.",
      flags,
    }
  }

  return {
    functions,
    overall: "on_track",
    rationale: "Every applicable RMF function is fully covered.",
    flags,
  }
}

/** Color tokens for the overall RMF badge — mirrors `riskBadgeClass` (lib/riskProfile.ts). */
export function rmfBadgeClass(level: RmfRiskLevel): string {
  switch (level) {
    case "on_track":
      return STATUS_BADGE_CLASS.healthy
    case "attention":
      return STATUS_BADGE_CLASS.attention
    case "at_risk":
      return STATUS_BADGE_CLASS.alert
    default:
      return STATUS_BADGE_CLASS.neutral
  }
}

/** Color tokens for a per-function status chip. */
export function rmfFunctionStatusBadgeClass(status: RmfFunctionStatus): string {
  switch (status) {
    case "covered":
      return STATUS_BADGE_CLASS.healthy
    case "partial":
      return STATUS_BADGE_CLASS.attention
    case "gap":
      return STATUS_BADGE_CLASS.alert
    default:
      return STATUS_BADGE_CLASS.neutral
  }
}
