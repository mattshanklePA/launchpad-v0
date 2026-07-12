// OMB intake auto-fill/AI-propose engine (issue #61) — cuts the ~34-field OMB
// burden by proposing an answer instead of leaving every field blank for the
// submitter to author from scratch. Two distinct mechanisms, both additive on
// top of what already existed before this issue:
//
// 1. Profile auto-fill (Agency, Bureau/Component, Email) already happens by
//    construction — `profileFromSession()` in context/form-context.tsx
//    pre-fills Step 1 (submitterOffice/submitterEmail) from the logged-in
//    user's session, and "Agency" is never asked at all (it's the tenant's
//    own name, read at export time — see lib/ombExport.ts). Wizard-answer
//    reuse for problem/outputs/benefits (`coreProblem`/`solutionSummary`/
//    `businessValue`) is likewise already true by construction: lib/ombExport.ts
//    maps those fields directly to their OMB columns, so there's no second
//    field to double-enter. Nothing to add here for either.
//
// 2. AI-proposed, submitter-confirmed fields (this module) — the fields OMB
//    requires a judgment call on, not a fact the submitter already typed
//    somewhere else: is-high-impact, topic area, AI classification, and
//    should-this-be-withheld. Each wraps an existing pure determination
//    module (or a new one, for topic area / classification) so the
//    reasoning a submitter sees here matches what a reviewer sees elsewhere
//    (lib/highImpactDetermination.ts, lib/useCaseTopicArea.ts,
//    lib/aiClassificationDetermination.ts). Advisory only — every proposal
//    returns a one-line rationale, never a bare value, and a field the
//    engine can't confidently derive comes back `null` rather than a guess.
//    The wizard (components/launchpad/ai-proposed-hint.tsx) pre-fills the
//    field once while it's still empty and always shows the rationale so the
//    submitter can change it — never fabricated, always overridable.
//
// `hasPii` is a third, narrower case: not a judgment call, but a near-duplicate
// question the submitter already answered as `involvesSensitiveData` (the
// Department's PII/sensitive-data mandate — a separate mandate from OMB's,
// see docs/omb-2025-inventory-fields.md, but asking the same underlying fact
// twice is exactly the burden this issue targets) — so it's reused, not
// re-derived, and flagged as coming from that earlier answer.

import type { FormData } from "@/lib/steps"
import { determineHighImpact } from "@/lib/highImpactDetermination"
import { determineTopicArea } from "@/lib/useCaseTopicArea"
import { determineAiClassification } from "@/lib/aiClassificationDetermination"

/** A proposed value for one field, plus the one-line reason a submitter sees before confirming or overriding it. */
export type AutofillProposal<T> = {
  value: T
  rationale: string
}

/** `determineHighImpact`'s binary "yes"/"no" mapped onto OMB's exact three-way `highImpact` field (docs/omb-2025-inventory-fields.md #7). Always returns a proposal — a submission with no risk signals is confidently "not high-impact," not underivable. */
export function proposeHighImpact(fd: Parameters<typeof determineHighImpact>[0]): AutofillProposal<FormData["highImpact"]> {
  const result = determineHighImpact(fd)
  return {
    value: result.recommendation === "yes" ? "high_impact" : "not_high_impact",
    rationale: result.reasons[0] || "",
  }
}

/** Proposes `topicArea` from the problem/solution text (lib/useCaseTopicArea.ts). `null` when no keyword match — left blank and flagged rather than guessed. */
export function proposeTopicArea(fd: Parameters<typeof determineTopicArea>[0]): AutofillProposal<FormData["topicArea"]> | null {
  const result = determineTopicArea(fd)
  if (!result.value) return null
  return { value: result.value, rationale: result.reason }
}

/** Proposes `aiClassification` from the problem/solution text (lib/aiClassificationDetermination.ts). `null` when no keyword match. */
export function proposeAiClassification(
  fd: Parameters<typeof determineAiClassification>[0],
): AutofillProposal<FormData["aiClassification"]> | null {
  const result = determineAiClassification(fd)
  if (!result.value) return null
  return { value: result.value, rationale: result.reason }
}

/** Proposes `publicIndicator` (OMB's "should this be withheld?" field #5) — defaults to public/"No" unless a security signal already on the form suggests otherwise. Always returns a proposal; the default itself is the safe answer, not a guess. */
export function proposePublicIndicator(
  fd: Pick<FormData, "nationalSecuritySystem" | "securityClassification">,
): AutofillProposal<FormData["publicIndicator"]> {
  if (fd.nationalSecuritySystem === "yes") {
    return {
      value: "excluded",
      rationale: "Flagged as a National Security System / Intelligence Community use — defaults to excluded from public reporting.",
    }
  }
  if (fd.securityClassification === "controlled") {
    return {
      value: "excluded",
      rationale: "Marked Controlled information — defaults to excluded from public reporting.",
    }
  }
  return {
    value: "public",
    rationale: "No FOIA-protected interest, legal restriction, or security classification identified yet — defaults to public reporting (OMB's \"No\").",
  }
}

/** Reuses the Department's `involvesSensitiveData` answer for OMB's near-duplicate `hasPii` question (field #21) instead of asking again. `null` until the submitter has actually answered the earlier question. */
export function proposeHasPii(fd: Pick<FormData, "involvesSensitiveData">): AutofillProposal<FormData["hasPii"]> | null {
  if (fd.involvesSensitiveData !== "yes" && fd.involvesSensitiveData !== "no") return null
  return {
    value: fd.involvesSensitiveData,
    rationale: `Reusing your "${fd.involvesSensitiveData === "yes" ? "Yes" : "No"}" answer to the PII / sensitive data question above.`,
  }
}
