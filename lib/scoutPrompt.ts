import type { FormData } from "@/lib/steps"
import { getTenant, type TenantConfig } from "@/lib/tenant"

// ============================================================
// SCOUT PROMPT PIECES
// The parts of the per-step coaching prompt that are pure string
// building: the submission-context block and the QUESTION MODE
// section. They live here rather than in app/actions.ts because
// that file is "use server" (every export must be an async server
// action) and is outside the vitest include globs, so nothing in
// it can be unit-tested. Same split lib/scoutFieldPlan.ts already
// makes for the per-step field plan.
// ============================================================

// Attribution for one context line (ES2-9). A block whose step the submitter is
// standing on right now is their in-progress draft, not a previous step's
// finished answer. Labelling it "from Step 2" while the co-pilot is coaching
// step 2 tells the model that work is already behind them and invites it to
// treat a half-written sentence as settled.
function attribution(blockStep: number, currentStep: number): string {
  return blockStep === currentStep ? `Step ${blockStep}, in progress` : `from Step ${blockStep}`
}

// ============================================================
// SUBMISSION CONTEXT BUILDER
// Compiles the submitter's responses so the co-pilot has full
// context when coaching on the current step.
//
// ES2-9: each block is included as soon as its step is REACHED
// (`>= n`), not once it has been passed (`> n`). The old gate meant
// that on step 2 the submitter could fill in the core problem, the
// affected groups and the audience, click "Help Me with the
// Problem", and the co-pilot would be handed none of it — then ask
// for a number and flag an invented range as recommended.
// ============================================================
export function buildSubmissionContext(
  formData: FormData,
  currentStep: number,
  tenant: TenantConfig = getTenant(),
): string {
  const lines: string[] = []

  if (formData.submitterRole || formData.submitterOffice) {
    const role = (formData.submitterRole || "unspecified role").replace(/_/g, " ")
    const office = formData.submitterOffice ? formData.submitterOffice.toUpperCase() : "unspecified office"
    lines.push(`- Submitter is a ${role} in ${office}`)
  }
  if (formData.useCaseTitle) {
    lines.push(`- Idea title: "${formData.useCaseTitle}"`)
  }
  if (formData.useCaseDescription) {
    lines.push(`- Idea description: ${formData.useCaseDescription}`)
  }
  // Step 2 is the merged Problem & Target Users step — surface BOTH the
  // problem definition and the target user context once it's been touched.
  if (
    currentStep >= 2 &&
    (formData.problemDefinition || formData.coreProblem || formData.targetUserSummary || formData.targetUserContext)
  ) {
    const from = attribution(2, currentStep)
    if (formData.problemDefinition || formData.coreProblem) {
      lines.push(`- Problem (${from}): ${formData.problemDefinition || formData.coreProblem}`)
    }
    if (formData.targetUserSummary || formData.targetUserContext) {
      lines.push(`- Target users (${from}): ${formData.targetUserSummary || formData.targetUserContext}`)
    }
  }
  // Step 3 is the merged Proposed Solution + Expected Benefits step.
  if (
    currentStep >= 3 &&
    (formData.solutionSummary || formData.proposedSolution || formData.userValue || formData.businessValue)
  ) {
    const from = attribution(3, currentStep)
    if (formData.solutionSummary || formData.proposedSolution) {
      lines.push(`- Proposed solution (${from}): ${formData.solutionSummary || formData.proposedSolution}`)
    }
    if (formData.userValue) {
      lines.push(`- Expected user benefit (${from}): ${formData.userValue}`)
    }
    if (formData.businessValue) {
      lines.push(`- Expected business benefit (${from}): ${formData.businessValue}`)
    }
  }
  if (currentStep >= 4 && formData.dependencies) {
    lines.push(`- Technical constraints (${attribution(4, currentStep)}): ${formData.dependencies}`)
  }

  if (lines.length === 0) {
    return `(No prior context — this is the submitter's first ${tenant.assistantName} interaction.)`
  }
  return lines.join("\n")
}

// ============================================================
// EXAMPLE USER GROUPS
// The groups the co-pilot may name when a question asks "who is
// affected". Resolved from the active tenant's own configuration
// (ES2-9) — this used to be a hardcoded USPTO list ("examiners, IT
// staff, OGC attorneys, applicants, the public, contract admins")
// that every deployment received, so an Army instance was coached
// with patent-office vocabulary. "Other" is dropped: it is a form
// escape hatch, not a user group.
// ============================================================
export function exampleUserGroups(tenant: TenantConfig = getTenant()): string[] {
  const seen = new Set<string>()
  const groups: string[] = []
  for (const option of [...tenant.targetAudiences, ...tenant.submitterRoles]) {
    if (option.value === "other" || seen.has(option.label)) continue
    seen.add(option.label)
    groups.push(option.label)
  }
  return groups
}

// ============================================================
// QUESTION MODE
// ============================================================
export function buildQuestionModeGuidance(tenant: TenantConfig = getTenant()): string {
  const groups = exampleUserGroups(tenant).join(", ")
  return `— QUESTION MODE —
Ask ONE specific question that ONLY the submitter can answer from their own observation, role, or organization.

Provide a 1-sentence rationale explaining why this question matters in strategic terms.

Provide 4-5 options. Structure them like this:
- 2-3 specific likely answers. When an answer names a user group, choose it from the groups this organization actually recognizes (${groups}) based on what the submission says, and do NOT default to whichever group happens to be listed first.
- Then: "Other (let me type my own)"
- Then: "I have enough, give me the scaffold"

Mark exactly ONE option as isRecommended=true if SUBMISSION CONTEXT suggests an obvious starting point. Otherwise mark none as recommended.
NEVER mark an option as recommended when the question asks for a quantity, a volume, a frequency, a duration, a headcount, a cost, or any other fact only the submitter can know. You have no grounds to recommend a number they have not given you, and putting "(Recommended)" beside a range you invented is fabrication. Recommendation is reserved for classification questions where the SUBMISSION CONTEXT actually supports one answer.`
}
