// Auto-fill / AI-propose engine for the OMB federal AI use case inventory
// fields (issue #61 — "cut OMB intake burden"). Two distinct mechanisms live
// here, both pure/no I/O so they're unit-testable without a live session or
// Supabase connection:
//
// 1. Profile auto-fill (`profileAutofill`) — deterministic copy from the
//    logged-in user's session. Zero typing, zero judgment; the submitter can
//    still edit every field.
// 2. AI-proposed fields (the `propose*` functions) — advisory, rule-based
//    recommendations (Kestrel) with a one-line rationale. Each wraps an
//    existing pure determination module (lib/highImpactDetermination.ts,
//    lib/ombConsolidation.ts, lib/useCaseTopicArea.ts) so the reasoning is
//    always the same one a reviewer sees elsewhere in the app. Never
//    fabricates: when a value can't be derived, `value` comes back empty so
//    the field stays blank and shows up in lib/submissionReadiness.ts's
//    "still needed" list instead of silently guessing.
//
// The wizard steps that render these fields are responsible for (a)
// pre-filling the underlying FormData field with `value` the first time it's
// empty, and (b) rendering `rationale` next to a way to override/clear the
// suggestion — see components/steps/step-8-feasibility-security.tsx and
// components/steps/step-2-use-case-overview.tsx.

import type { FormData } from "@/lib/steps"
import type { Session } from "@/lib/auth"
import { determineHighImpact, allHighImpactFactors } from "@/lib/highImpactDetermination"
import { determineConsolidation, type ConsolidationResult } from "@/lib/ombConsolidation"
import { proposeUseCaseTopicArea as proposeTopicArea, type UseCaseTopicAreaResult } from "@/lib/useCaseTopicArea"

export type AutofillSource = "profile" | "wizard" | "ai_proposed"

export type Proposal = {
  value: string
  rationale: string
}

/**
 * Profile-derived fields (Step 1) — the same values `lib/auth.ts`'s session
 * already carries. Zero typing: agency is implicit in the active tenant,
 * bureau/component + office + email come straight from the account. Pure
 * function of a `Session` so it's testable without `window`/localStorage —
 * context/form-context.tsx's `profileFromSession()` is the only caller and
 * just supplies `getSession()`.
 */
export function profileAutofill(session: Session | null | undefined): Partial<FormData> {
  if (!session) return {}
  return {
    submitterName: session.name || "",
    submitterEmail: session.email || "",
    submitterRole: (session.jobRole as FormData["submitterRole"]) || "",
    submitterOffice: (session.businessUnit as FormData["submitterOffice"]) || "",
    submitterSubOffice: session.office || "",
  }
}

// ─── Wizard-answer → OMB field mapping ──────────────────────────────────────
// These OMB inventory questions are answered by the SAME field the wizard
// already collects earlier for its own purposes — there is no separate OMB
// copy of the question, so there's nothing to double-enter. This table
// exists so the mapping is explicit, documented, and unit-testable (mirrors
// lib/ombExport.ts's CSV column mapping, which reads these same fields).
export const WIZARD_TO_OMB_FIELD_MAP: {
  formField: keyof FormData
  ombQuestion: string
}[] = [
  { formField: "coreProblem", ombQuestion: "What problem is the AI intended to solve?" },
  { formField: "solutionSummary", ombQuestion: "Describe the AI system's outputs" },
  { formField: "businessValue", ombQuestion: "Expected benefits" },
  { formField: "involvesSensitiveData", ombQuestion: "Involves PII?" },
  { formField: "aiModelSourcing", ombQuestion: "Model sourcing (vendor / in-house)" },
  { formField: "systemSource", ombQuestion: "Built in-house/under contract/purchased" },
]

/**
 * Value already captured for each wizard→OMB mapped field, for display (e.g.
 * a "here's what's carrying over" summary) — never re-asks, just reflects
 * what's already there.
 */
export function getWizardDerivedOmbFields(
  fd: Pick<FormData, "coreProblem" | "solutionSummary" | "businessValue" | "involvesSensitiveData" | "aiModelSourcing" | "systemSource">,
): { formField: keyof FormData; ombQuestion: string; value: string }[] {
  return WIZARD_TO_OMB_FIELD_MAP.map((m) => ({ ...m, value: (fd[m.formField as keyof typeof fd] as string) || "" }))
}

// ─── AI-proposed fields ──────────────────────────────────────────────────────

type HighImpactInputs = Parameters<typeof determineHighImpact>[0]

/** Proposes the OMB "high-impact AI?" answer. Wraps lib/highImpactDetermination.ts. */
export function proposeHighImpact(fd: HighImpactInputs): Proposal {
  const result = determineHighImpact(fd)
  return { value: result.recommendation, rationale: result.reasons[0] || "" }
}

export type AiClassification = "rights_impacting" | "safety_impacting" | "both" | "not_classified" | ""

const RIGHTS_LIKE_FACTORS = new Set(["rights", "benefits_access", "resource_allocation", "enforcement"])

/**
 * Proposes an OMB "AI classification" (rights-impacting / safety-impacting /
 * both / not classified) from the same rights/safety criteria
 * lib/highImpactDetermination.ts uses for its high-impact recommendation
 * (manually-checked `highImpactFactors` plus the signals it infers) — no
 * separate inference logic to keep in sync.
 */
export function proposeAiClassification(fd: HighImpactInputs): Proposal {
  const factors = allHighImpactFactors(fd)
  const rights = [...factors].some((f) => RIGHTS_LIKE_FACTORS.has(f))
  const safety = factors.has("safety")

  if (rights && safety) {
    return {
      value: "both",
      rationale: "Touches both rights-impacting and safety-impacting criteria (OMB M-25-21 Section 5).",
    }
  }
  if (rights) {
    return {
      value: "rights_impacting",
      rationale: "Meaningfully affects rights, benefits access, resource allocation, or an enforcement action (OMB M-25-21 Section 5).",
    }
  }
  if (safety) {
    return {
      value: "safety_impacting",
      rationale: "Meaningfully affects the safety of individuals (OMB M-25-21 Section 5).",
    }
  }
  return {
    value: "not_classified",
    rationale: "No rights- or safety-impacting criteria identified from the factors and risk answers captured so far.",
  }
}

/** Proposes an OMB use case topic area. Wraps lib/useCaseTopicArea.ts. */
export function proposeUseCaseTopicArea(fd: Parameters<typeof proposeTopicArea>[0]): UseCaseTopicAreaResult {
  return proposeTopicArea(fd)
}

/** Proposes the OMB consolidation/reporting-mode classification. Wraps lib/ombConsolidation.ts. */
export function proposeConsolidation(fd: Parameters<typeof determineConsolidation>[0]): ConsolidationResult {
  return determineConsolidation(fd)
}

type WithholdInputs = Pick<FormData, "involvesSensitiveData"> &
  Partial<Pick<FormData, "securityClassification" | "nationalSecuritySystem">>

/**
 * Proposes the "should this be withheld from the public inventory?" answer
 * (`publicIndicator`) — defaults to "public" (not withheld) unless a
 * sensitive-data or restricted-classification signal is already on the form.
 * Advisory only; the submitter/reviewer makes the final call before
 * anything is published.
 */
export function proposePublicIndicator(fd: WithholdInputs): Proposal {
  if (fd.involvesSensitiveData === "yes") {
    return { value: "excluded", rationale: "Involves PII or other sensitive data — defaults to withheld from public disclosure." }
  }
  if (fd.securityClassification === "controlled") {
    return { value: "excluded", rationale: "Marked Controlled — defaults to withheld from public disclosure." }
  }
  if (fd.nationalSecuritySystem === "yes") {
    return { value: "excluded", rationale: "Flagged as a National Security System / IC use — defaults to withheld from public disclosure." }
  }
  return { value: "public", rationale: "No PII, restricted classification, or NSS/IC flag identified — defaults to public." }
}
