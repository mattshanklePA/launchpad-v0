"use server"

// LaunchPad Co-Pilot server actions for AI vetting + readiness assessment
import { generateObject } from "ai"
import { getModel } from "@/lib/modelProvider"
import { z } from "zod"
import { getFormSteps, type FormData } from "@/lib/steps"
import {
  getFocusAreasForUnit,
  type StrategicFocusAreaId,
  type AlignmentSuggestion,
} from "@/lib/strategicFocusAreas"
import { getTenant } from "@/lib/tenant"
import { proposeHighImpact, proposeTopicArea, proposeAiClassification, proposeHasPii } from "@/lib/ombAutofill"
import type { GovernanceFieldDraft } from "@/lib/governanceCapture"
import { scoutFieldsForStep, draftFieldFallback } from "@/lib/scoutFieldPlan"
import { buildSubmissionContext, buildQuestionModeGuidance } from "@/lib/scoutPrompt"

type Message = {
  role: "user" | "assistant"
  content: string
}

// ============================================================
// USPTO STRATEGIC CONTEXT
// Injected into every co-pilot critique so feedback maps to
// real published USPTO priorities, not generic platitudes.
// Update this block if USPTO publishes a new strategic plan or
// AI strategy revision.
// ============================================================
const TENANT = getTenant()

// Strategic frameworks for the active tenant, injected into every Scout prompt.
const USPTO_STRATEGIC_CONTEXT = TENANT.strategicContext

const HUMANIZATION_GUIDELINES = `
WRITING STYLE — avoid the patterns that make text read as AI-generated. This applies to every sentence you write (questions, rationales, scaffolds, summaries, titles, descriptions):
- No rule-of-three cadences ("We launched fast. We tested hard. We scaled.").
- No contrast framing ("not just X, it's Y").
- No poetic elevation of ordinary things ("this isn't a tool, it's a movement").
- Don't force odd-numbered lists (3 pillars, 5 steps) for their own sake.
- No hypophora: don't pose a question and immediately answer it.
- No adverb stacking ("truly," "deeply," "carefully").
- No rhythmic cliché pairings ("Simple to use. Hard to ignore.").
- No scripted transitions ("Let's unpack this," "Here's what that really means").
- Don't end on a vague vibe; close on something concrete.
- No em dashes. Use a period, comma, colon, or parentheses instead.
Write plainly and specifically. Vary sentence length. Use concrete nouns and the submitter's own facts instead of abstraction.`

// The submission-context block and the QUESTION MODE section moved to
// lib/scoutPrompt.ts so they can be unit-tested — this file is "use server"
// and outside the vitest include globs.

// ============================================================
// STEP-SPECIFIC RUBRICS
// Each step has a rubric describing what "strong" looks like
// and what a USPTO reviewer would push back on.
// ============================================================
const stepRubrics: Record<number, string> = {
  // Step 2: PROBLEM & TARGET USERS (merged)
  2: `For PROBLEM & TARGET USERS (merged step), evaluate whether:
PROBLEM dimensions:
- The root cause is named, not just symptoms
- The cost of inaction is quantified (hours, dollars, errors, pendency days)
- The problem connects to a real organizational mission priority
- The magnitude is established (how many cases/users/instances, how often)
TARGET USER dimensions:
- The affected user role is named with specific workflow context (not just a job title)
- The estimated number of users impacted is realistic at the organization's scale
- Pain points are observable and frequent
- The user experience aligns with the organization's workforce and customer-experience goals
COMBINED: a strong response makes the link explicit — for THIS problem, THESE users are affected in THIS specific way.`,

  // Step 3: PROPOSED SOLUTION + EXPECTED BENEFITS (merged, issue #162)
  3: `For PROPOSED SOLUTION + EXPECTED BENEFITS, evaluate whether:
SOLUTION dimensions:
- The AI/ML mechanism is specific (NLP query expansion, classification model, RAG, etc.) — not just "we'll use AI"
- The user interaction model is defined (what does the user do, what does the system return)
- Existing systems/APIs that must be touched are named
EXPECTED BENEFIT dimensions — framed as the submitter's honest expectation, not a determination:
- The current-state baseline is described (how long/how much does this cost today)
- The expected user- and business-level benefit is specific, not abstract
- The strategic link to a named priority is explicit where the submitter can see one
COMBINED: the benefit claim should read as a reasonable expectation a reviewer can sanity-check, not a padded ROI pitch.`,

  // Step 4: TECHNICAL CONSTRAINTS (issue #162 — light notes only, no
  // self-graded feasibility, no OMB/M-25-21 fields; those move to vetting)
  4: `For TECHNICAL CONSTRAINTS, evaluate whether:
- Any named dependency, blocker, or integration point is stated plainly and honestly
- The note is a quick, honest flag for reviewers — not an attempt at a full feasibility or security assessment
- It's fine if this is brief or even blank; don't push the submitter toward manufacturing risk detail they don't have`,
}

// ============================================================
// Build a labeled block of ALL inputs the submitter has filled
// for the current step (textareas + dropdowns + multi-selects).
// This is what the co-pilot reads so it can coach on the FULL
// picture, not just the primary textarea.
// ============================================================
function fmt(v: string | undefined | string[]): string {
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "(none selected)"
  return v && v.trim() !== "" ? v : "(not provided)"
}

function buildStepInputs(
  formData: FormData,
  step: number,
  enabledFields?: Record<string, boolean>,
): string {
  const on = (k: keyof FormData) => !enabledFields || enabledFields[k as string] !== false
  // Rows are [fieldKey, label]; plain strings are section headers. Only rows
  // whose field is still enabled in the form config are shown, so the coach
  // never asks about or flags a field the admin removed from the wizard.
  type Row = [keyof FormData, string]
  const section = (rows: (Row | string)[]): string =>
    rows
      .filter((r) => typeof r === "string" || on(r[0]))
      .map((r) => (typeof r === "string" ? r : `- ${r[1]}: ${fmt(formData[r[0]] as any)}`))
      .join("\n")

  switch (step) {
    case 2:
      // Business Problem & Opportunity. `severity` is a submitter self-rating
      // dropped from idea intake (issue #162) — left out of the coaching
      // context too since it's no longer gathered here.
      return section([
        `--- PROBLEM ---`,
        ["coreProblem", "Core problem (textarea)"],
        ["problemImpact", "Problem impact (textarea)"],
        ["affectedBusinessUnits", `Affected ${TENANT.tierLabels.unitPlural}`],
        ["problemType", "Problem type tags"],
        `--- TARGET USERS ---`,
        ["targetAudience", "Target audience"],
        ["impactedUsersCount", "Impacted users count"],
        ["painPoints", "Key pain points (textarea)"],
        ["targetUserContext", "User profile / context (textarea)"],
      ])
    case 3:
      // Merged Proposed Solution + Expected Benefits (issue #162).
      // `implementationComplexity`/`userTimeSavings`/`costSavings` are
      // submitter self-ratings dropped from idea intake — value and impact
      // are a Scout/reviewer determination, not left out of the coaching
      // context either.
      return section([
        `--- SOLUTION ---`,
        ["proposedSolution", "Proposed solution (textarea)"],
        ["keyFunctionality", "Key functionality tags"],
        ["deliveryAudience", "Internal or external facing"],
        `--- EXPECTED BENEFITS ---`,
        ["userValue", "Expected user benefit (textarea)"],
        ["otherUserImprovements", "Other user improvements"],
        ["businessValue", "Expected business benefit (textarea)"],
        ["strategicBenefit", "Strategic benefit tags"],
      ])
    case 4:
      // Technical Constraints — light free-text notes only (issue #162
      // dropped the OMB/M-25-21 Feasibility & Security block from intake
      // entirely; it's filled in during vetting instead).
      return section([
        ["dependencies", "Technical constraints / dependencies (textarea)"],
      ])
    default:
      return "(no inputs for this step)"
  }
}

// Helper to get the primary input field for a given step.
// For merged steps, prefer the more leadership-facing field.
function getInputFieldForStep(step: number): keyof FormData | null {
  switch (step) {
    case 2:
      // Business Problem & Opportunity — coach on the problem first (per Jonathan's framing)
      return "coreProblem"
    case 3:
      // Merged Solution + Benefits — coach on the solution first
      return "proposedSolution"
    case 4:
      return "dependencies"
    default:
      return null
  }
}

// ============================================================
// Scout response shape (discriminated by mode)
// ============================================================
export type ScoutOption = {
  label: string
  isRecommended: boolean
}

/** A drafted value for one step output field, plus the reason a submitter sees before applying it. Mirrors lib/governanceCapture.ts's `GovernanceFieldProposal` shape. */
export type ScoutFieldDraft = {
  value: string
  rationale: string
}

export type ScoutResponse =
  | {
      mode: "question"
      questionText: string
      rationale: string
      options: ScoutOption[]
    }
  | {
      mode: "scaffold"
      summary: string
      // Keyed by FormData field name (see lib/scoutFieldPlan.ts's per-step
      // plan) — one drafted value per output field the step collects, not a
      // single blob the panel had to fan back out itself.
      fields: Record<string, ScoutFieldDraft>
    }

// Backwards-compat aliases (deprecated). Kept so older imports don't break
// while the codebase migrates off "Co-Pilot" naming. Safe to remove later.
export type CoPilotOption = ScoutOption
export type CoPilotResponse = ScoutResponse

// Mock fallback for when the API is unavailable. Always returns a scaffold
// (never a question) so the UI doesn't get stuck in a Q&A loop with no AI.
// Drafts every field in the step's plan so a down-model moment still leaves
// the submitter with a starting point per field, not just the primary one.
function getMockResponse(step: number, formData: FormData, enabledFields?: Record<string, boolean>): ScoutResponse {
  const plan = scoutFieldsForStep(step, enabledFields)
  const fields: Record<string, ScoutFieldDraft> = {}
  for (const f of plan) {
    fields[f.key as string] = draftFieldFallback(f.label, formData[f.key] as string | undefined)
  }
  return {
    mode: "scaffold",
    summary:
      `(${TENANT.assistantName} is temporarily unavailable. Here's a generic draft per field — please fill in the bracketed sections with your specific details.)`,
    fields,
  }
}

// ============================================================
// Assess readiness for leadership review (final step assessment)
// ============================================================
export async function assessReadiness(
  formData: FormData,
  // Map of fieldKey -> enabled, from the admin form config. When provided, the
  // brief omits dimensions whose backing fields were turned off so the model
  // does not score their absence as a gap. Optional for backward compatibility.
  enabledFields?: Record<string, boolean>,
): Promise<{ readinessScore: "ready" | "needs_work" | "early_stage"; readinessSummary: string; executiveSummary: string }> {
  const on = (k: string) => !enabledFields || enabledFields[k] !== false

  const targetUser = formData.targetUserSummary || formData.targetUserContext || "[Not provided]"
  const problem = formData.problemDefinition || formData.coreProblem || "[Not provided]"
  const solution = formData.solutionSummary || formData.proposedSolution || "[Not provided]"
  const userValue = formData.userValue || "[Not provided]"
  const businessValue = formData.businessValue || "[Not provided]"
  const constraints = formData.dependencies || ""

  // Build the brief dimension-by-dimension. A toggleable dimension is included
  // only if at least one backing input field is still enabled in the form
  // config; dimensions the admin turned off are omitted AND listed under
  // "Intentionally NOT Collected" so the model never scores their absence as a
  // gap. Locked dimensions (description, problem, solution) always show.
  //
  // Issue #162 slimmed idea intake to 5 light steps — Strategic Alignment,
  // Feasibility & Security (OMB/M-25-21), and Success Metrics are no longer
  // collected from the submitter at all (filled in during vetting instead),
  // so they're not part of this brief or the rating. Grading their absence
  // here would penalize every idea for a step it was never shown.
  const omitted: string[] = []
  const sections: string[] = [`## Idea: ${formData.useCaseTitle || "Untitled"}`]
  const dim = (label: string, backing: string[], body: string, locked = false) => {
    if (locked || backing.some(on)) sections.push(`### ${label}\n${body}`)
    else omitted.push(label)
  }

  dim("Description", ["useCaseDescription"], formData.useCaseDescription || "[Not provided]", true)
  dim("Problem Statement", ["coreProblem"], problem, true)
  dim("Target Users", ["targetAudience", "targetUserContext", "painPoints"], targetUser)
  dim("Proposed Solution", ["proposedSolution"], solution, true)
  dim("Expected Value to Users", ["userValue"], userValue)
  dim("Expected Value to the Business", ["businessValue"], businessValue)

  // Enabled-and-present quantitative signals the exec summary may cite verbatim.
  const dataPoints: string[] = []
  if (on("impactedUsersCount") && formData.impactedUsersCount) dataPoints.push(`- Estimated users impacted: ${formData.impactedUsersCount}`)
  if (dataPoints.length) sections.push(`### Key Data Points\n${dataPoints.join("\n")}`)

  // Technical constraints are a light, optional submitter note (issue #162)
  // — never treated as a gap or scored down when blank.
  if (constraints) sections.push(`### Technical Constraints (submitter note, informational only)\n${constraints}`)

  const omittedNote = omitted.length
    ? `\n\n### Intentionally NOT Collected (form configuration)\nThese dimensions were deliberately removed from the form by the administrator; the submitter was never asked for them. Do NOT treat their absence as a gap, do NOT list them as missing, do NOT lower the readiness rating for them, and do NOT mention them in the executive summary: ${omitted.join(", ")}.`
    : ""

  const submissionSummary = `\n${sections.join("\n\n")}${omittedNote}\n`

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: z.object({
        readinessScore: z.enum(["ready", "needs_work", "early_stage"]).describe("Overall readiness rating for leadership review"),
        readinessSummary: z.string().describe("2-3 sentences explaining the rating and key gaps if any"),
        executiveSummary: z.string().describe("One paragraph executive brief of the idea for a 30-second review"),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior AI strategist at ${TENANT.shortName} evaluating whether an AI idea is ready for leadership review.

${USPTO_STRATEGIC_CONTEXT}

${HUMANIZATION_GUIDELINES}

You are given the submission across the dimensions the submitter was asked to complete. The form is configurable: optional dimensions may have been intentionally turned off by the administrator. Any such dimensions appear in an "Intentionally NOT Collected" section at the end of the brief. You MUST NOT treat those as gaps, missing information, or reasons to lower the readiness rating, and you MUST NOT mention them in the executive summary. Judge readiness and completeness ONLY against the dimensions that were actually collected.

This is a FAST IDEA INTAKE, not a full governance review. Strategic alignment, feasibility/security, and success metrics are deliberately NOT collected here — a reviewer determines those during vetting, after the idea is submitted. Do not ask for them, do not penalize their absence, and do not mention them in the executive summary. Any "Technical Constraints" note is an optional, informational aside from the submitter — never treat it as missing or score it down when blank.

LEADERSHIP FRAMING — IMPORTANT:
Leadership priorities are: ${TENANT.leadershipPriorities}. When evaluating and summarizing, lead with the PROBLEM, then describe the EXPECTED BENEFITS the submitter is claiming — framed as their expectation for a reviewer to confirm, not a determination.

EXECUTIVE SUMMARY STRUCTURE (MANDATORY ORDER):
1. PROBLEM — what's broken, who it affects, and the cost of inaction (use the submitter's numbers if provided; do not invent any)
2. EXPECTED BENEFITS — the user- and business-level value the submitter expects, in their own terms
3. READINESS — is this idea clear and specific enough for a reviewer to vet, or what still needs work
If a section above maps to a dimension listed under "Intentionally NOT Collected", SKIP that section entirely rather than noting it as missing. PROBLEM is always collected.

EVALUATE THE IDEA HONESTLY:

WEIGHTING — weigh these heavily in the rating, in roughly this order:
1. PROBLEM CLARITY — is the problem specific and grounded (who's affected, how badly), not vague ("things are slow")?
2. SOLUTION SPECIFICITY — is the proposed AI/ML approach concrete enough that a reviewer could evaluate it, not just "we'll use AI"?
3. EXPECTED BENEFIT CREDIBILITY — is the claimed user/business benefit plausible and reasonably specific, even if not yet quantified?

Rate it as one of:
- "ready" — The problem is specific and grounded, the solution is concrete, and the expected benefit is plausible and reasonably specific. A reviewer has enough to start vetting.
- "needs_work" — The core idea has merit but 1-2 dimensions are vague or thin (e.g., problem is real but underspecified, or the expected benefit is just an adjective with no substance). Worth pursuing but needs a bit more detail before vetting.
- "early_stage" — Too vague or underdeveloped across multiple dimensions: no clear problem, no concrete solution, or no credible benefit claim. The submitter should keep refining before submitting.

ANTI-FABRICATION RULE FOR THE EXECUTIVE SUMMARY:
SYNTHESIZE only what the submitter actually wrote — do NOT invent specific numbers, named units, programs, or organizations, evidence sources, or impact figures the submitter did not include. If their input is too vague to produce a substantive summary, the summary should honestly reflect that.

VALUE METRICS DISCIPLINE:
When the submitter claims a benefit (faster, better, cheaper), the executive summary should restate it WITH the specific metric the submitter provided. If they said "improves quality," the summary should restate as the specific quality metric they named (e.g., "cuts manual triage time from X hours to Y"). If they didn't quantify it, the summary should note "improves quality (no measurable baseline yet provided)" — don't paper over the missing number.

The readinessSummary should be 2-3 sentences naming specific gaps rather than smoothing over.`,
        },
        {
          role: "user",
          content: submissionSummary,
        },
      ],
    })

    return {
      readinessScore: object.readinessScore,
      readinessSummary: object.readinessSummary,
      executiveSummary: object.executiveSummary,
    }
  } catch (error) {
    console.error("AI Gateway error for readiness assessment, falling back to mock:", error)
    return {
      readinessScore: "needs_work",
      readinessSummary:
        "This idea has a clear problem statement and target users, but the expected user and business benefit could use more specificity before a reviewer starts vetting it.",
      executiveSummary: `"${formData.useCaseTitle || "Untitled Idea"}" proposes an AI-driven approach to improve operations for ${TENANT.shortName} staff. The idea targets a real operational pain point, but the expected benefit needs more detail before it's ready for a reviewer to vet.`,
    }
  }
}

// ============================================================
// Strategic Alignment auto-suggest
// Pre-fills Step 6 by analyzing the problem, target users, solution, and
// value statements already captured. Returns:
//  - focusAreas: 1-3 IDs from the canonical USPTO focus area list
//  - relevantOkrs: short paragraph naming specific USPTO objectives
//  - alignmentSummary: 2-3 sentence executive-ready summary
//  - rationale: why these specific priorities were selected
//
// The canonical focus area list lives in lib/strategicFocusAreas.ts so it
// can be imported by both this server action AND client components (the
// "use server" directive forbids non-async exports).

export async function suggestStrategicAlignment(
  formData: FormData,
): Promise<AlignmentSuggestion> {
  // Build context from the prior steps. We only call the AI when the idea
  // has enough body to alignment-match against — title alone isn't enough.
  const haveBody = Boolean(
    formData.useCaseTitle?.trim() &&
      (formData.coreProblem?.trim() || formData.proposedSolution?.trim()),
  )
  if (!haveBody) {
    return {
      focusAreas: [],
      relevantOkrs: "",
      alignmentSummary: "",
      rationale: "Not enough context yet — fill in the problem, solution, and value steps first, then come back.",
    }
  }

  // Score against the submitter's bureau's own priorities when they've named
  // one (DoC); falls back to the tenant/department-level list otherwise.
  const scopedFocusAreas = getFocusAreasForUnit(formData.submitterOffice)
  const focusAreaList = scopedFocusAreas.map((f) => `  - ${f.id}: ${f.label} (${f.category})`).join("\n")

  const context = [
    formData.useCaseTitle && `Title: ${formData.useCaseTitle}`,
    formData.useCaseDescription && `Description: ${formData.useCaseDescription}`,
    formData.coreProblem && `Problem: ${formData.coreProblem}`,
    formData.problemImpact && `Problem impact: ${formData.problemImpact}`,
    formData.targetUserContext && `Target users: ${formData.targetUserContext}`,
    formData.proposedSolution && `Proposed solution: ${formData.proposedSolution}`,
    formData.userValue && `User value: ${formData.userValue}`,
    formData.businessValue && `Business value: ${formData.businessValue}`,
  ]
    .filter(Boolean)
    .join("\n")

  const systemPrompt = `${USPTO_STRATEGIC_CONTEXT}

${HUMANIZATION_GUIDELINES}

You are ${TENANT.assistantName}, an AI advisor helping ${TENANT.shortName} staff align AI ideas with published strategic priorities. You will receive a submitter's idea (problem, solution, value claims) and must return:

1. A list of 1-3 focus area IDs that this idea CLEARLY advances. Use ONLY the canonical IDs from this list:
${focusAreaList}

2. A short paragraph (2-4 sentences) naming the specific strategic objectives this advances, written in the submitter's voice (first person plural — "we," "this idea").

3. A 2-3 sentence executive-ready alignment summary suitable for leadership review.

4. A 1-2 sentence rationale explaining WHY you chose those specific focus areas (this is for the submitter to validate your suggestion, not for the final submission).

Rules:
- Quality over quantity. Pick 1-2 focus areas the idea CLEARLY advances. 3 only when the case is rock-solid for all three.
- The leadership priorities are ${TENANT.leadershipPriorities}; surface them when the idea genuinely supports them.
- Never invent specific metrics that aren't in the source context. If the submitter said "save 4 hrs/week," you can repeat that; don't make up a "30% reduction in X" they didn't claim.
- If the idea is non-examination (e.g., HR, OCIO ops), align to "goal_employee_experience" + appropriate AI strategy priority — don't force-fit to examination goals.`

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: z.object({
        focusAreas: z
          .array(z.string())
          .min(1)
          .max(3)
          .describe("1-3 focus area IDs from the canonical list"),
        relevantOkrs: z.string().describe("2-4 sentence first-person paragraph naming specific strategic objectives"),
        alignmentSummary: z.string().describe("2-3 sentence executive-ready alignment summary"),
        rationale: z.string().describe("1-2 sentence rationale for the chosen focus areas"),
      }),
      system: systemPrompt,
      prompt: `Idea context:\n${context}\n\nSuggest the strategic alignment for this idea.`,
    })

    // Validate returned focus area IDs against the scoped list — drop anything
    // the AI hallucinated rather than letting bad data into the form.
    const validIds = new Set(scopedFocusAreas.map((f) => f.id))
    const cleanFocusAreas = object.focusAreas.filter((id) => validIds.has(id as StrategicFocusAreaId))

    return {
      focusAreas: cleanFocusAreas,
      relevantOkrs: object.relevantOkrs,
      alignmentSummary: object.alignmentSummary,
      rationale: object.rationale,
    }
  } catch (error) {
    console.error("AI Gateway error for strategic alignment suggestion:", error)
    // Soft fallback: best-guess focus areas based on the title/description text.
    // Better than blocking the demo if the API is down.
    const text = `${formData.useCaseTitle} ${formData.useCaseDescription} ${formData.coreProblem} ${formData.proposedSolution}`.toLowerCase()
    const guess: string[] = []
    if (/pendency|backlog|examin|exam |search|prior art/.test(text)) {
      guess.push("goal_pendency_quality")
    }
    if (/operat|ticket|hr|onboard|workflow|process/.test(text)) {
      guess.push("goal_employee_experience")
    }
    if (/security|pii|bias|fairness|explainab/.test(text)) {
      guess.push("ai_responsible_use")
    }
    if (guess.length === 0) {
      guess.push("ai_infrastructure")
    }
    return {
      focusAreas: guess.slice(0, 2),
      relevantOkrs:
        "This idea aligns with the organization's published strategic priorities. Review the suggested focus areas and add specific references where you have them.",
      alignmentSummary:
        "This idea connects to the organization's published strategic priorities. Review the suggested focus areas and refine the alignment language for your specific use case.",
      rationale: `(Auto-suggested locally — ${TENANT.assistantName} was unavailable. Verify these match your idea before submitting.)`,
    }
  }
}

// ============================================================
// Per-step coaching — Q&A flow with cross-step context
// Each call returns EITHER a single question with options OR
// a final scaffolded template (mode-discriminated).
// ============================================================
export async function validateAndRefineInput(
  formData: FormData,
  step: number,
  conversationHistory: Message[],
  enabledFields?: Record<string, boolean>,
): Promise<ScoutResponse> {
  const currentStepInfo = getFormSteps(formData.submitterOffice).find((s) => s.step === step)
  if (!currentStepInfo) throw new Error("Invalid step number")

  const currentField = getInputFieldForStep(step)
  const userInput = currentField ? (formData[currentField] as string) : ""
  const submissionContext = buildSubmissionContext(formData, step, TENANT)
  const assistantTurns = conversationHistory.filter((m) => m.role === "assistant").length

  // Which FormData fields Scout drafts for this step (lib/scoutFieldPlan.ts),
  // filtered to whatever the admin form config still has enabled. Propose-a-
  // Solution plans 3 fields from one Q&A (solutionSummary, userValue,
  // businessValue) instead of the single scaffoldText string every step used
  // to get regardless of how many output fields it actually had.
  const fieldPlan = scoutFieldsForStep(step, enabledFields)

  const fieldFormattingHints: Partial<Record<keyof FormData, string>> = {
    problemDefinition: `2-3 sentences naming the problem (mission impact, consequences of inaction), then 2-3 sentences describing the affected users (roles, workflow context, observable pain).`,
    solutionSummary: `A concise description of the AI/ML solution with 2-3 bullet points for core functionality.`,
    userValue: `2-3 sentences on the user-level benefit you'd expect it to deliver — frame as an expectation for reviewers to confirm, not a determination.`,
    businessValue: `2-3 sentences on the business-level benefit you'd expect it to deliver — frame as an expectation for reviewers to confirm, not a determination.`,
    dependencies: `A few bullet points naming known dependencies, blockers, or integration realities. Keep it light — this is a quick note for reviewers, not a feasibility or security assessment.`,
  }

  // Build the "fields" sub-schema dynamically from the plan so the model is
  // forced to draft exactly (and only) the named output fields for this
  // step — never a field the step doesn't collect or the admin disabled.
  const fieldsShape: Record<string, z.ZodTypeAny> = {}
  for (const f of fieldPlan) {
    fieldsShape[f.key as string] = z.object({
      value: z
        .string()
        .describe(
          `If mode=scaffold: the drafted value for "${f.label}" — ${fieldFormattingHints[f.key] || "format clearly and concisely."} Synthesize the submitter's actual selections into a paste-ready response, with [BRACKETED PLACEHOLDERS] for any specific facts they still need to provide. Never invent specifics. If mode=question: empty string.`,
        ),
      rationale: z
        .string()
        .describe(
          `If mode=scaffold: 1 short sentence on what in the Q&A/inputs this "${f.label}" draft is grounded in. If mode=question: empty string.`,
        ),
    })
  }
  const fieldsSchema = z.object(fieldsShape)

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: z.object({
        mode: z
          .enum(["question", "scaffold"])
          .describe(
            "'question' to ask another clarifying question; 'scaffold' to produce the final draft. Prefer 'question' for the first 2-3 turns when input is sparse. Move to 'scaffold' after sufficient Q&A or when the user picks 'I have enough'.",
          ),
        questionText: z.string().describe("If mode=question: the single, specific clarifying question. If mode=scaffold: empty string."),
        rationale: z.string().describe("If mode=question: 1-sentence reason why this question matters in strategic terms. If mode=scaffold: empty string."),
        options: z
          .array(
            z.object({
              label: z.string().describe("Short clickable option label (3-12 words)."),
              isRecommended: z.boolean().describe("True only for the single most contextually likely option based on SUBMISSION CONTEXT, otherwise false. Always false when the question asks for a quantity, volume, frequency, duration, headcount, cost, or any other fact only the submitter can know."),
            }),
          )
          .describe(
            "If mode=question: 4-5 options. Use 2-3 specific likely answers FIRST, then 'Other (let me type my own)', then 'I have enough, give me the scaffold'. If mode=scaffold: empty array.",
          ),
        fields: fieldsSchema.describe(
          "If mode=scaffold: one drafted value + rationale per named output field for this step. If mode=question: every field's value and rationale are empty strings.",
        ),
        summary: z.string().describe("If mode=scaffold: 1-2 sentences acknowledging what was learned through the Q&A. If mode=question: empty string."),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior AI strategist at ${TENANT.shortName} who pressure-tests AI ideas. You COACH submitters one question at a time — you NEVER ghostwrite answers.

${USPTO_STRATEGIC_CONTEXT}

${HUMANIZATION_GUIDELINES}

═══ SUBMISSION CONTEXT (carry these through every coaching turn) ═══
${submissionContext}

CURRENT STEP: ${currentStepInfo.title}

EVALUATION CRITERIA (what "strong" looks like for this step):
${stepRubrics[step] || "Apply general rigor: specificity, quantification, and explicit alignment with a named strategic priority."}

═══ THE SUBMITTER'S CURRENT INPUTS FOR THIS STEP (every field) ═══
${buildStepInputs(formData, step, enabledFields)}

When coaching: consider ALL inputs above, not just the textarea. Dropdowns and tag selections are real signal — if the submitter selected "Severity: high" but wrote a vague textarea, that mismatch is worth surfacing. If they tagged "Strategic Benefit: efficiency" and the textarea says nothing measurable, that's a gap to question. Only the fields the submitter was actually shown appear above — do NOT ask about, request, or flag any field that is not listed; it was intentionally excluded from this form.

Q&A turns completed so far in this session: ${assistantTurns}

═══ INTERACTION MODEL ═══

EACH RESPONSE IS EITHER mode="question" OR mode="scaffold". You decide based on:
- If turns so far is 0-2 AND the submitter has not selected "I have enough, give me the scaffold" → prefer mode="question"
- If turns so far is ≥3 OR the most recent user message in history is "I have enough, give me the scaffold" → produce mode="scaffold"
- If the submitter's draft text is already substantive and well-grounded → you may skip directly to mode="scaffold"

${buildQuestionModeGuidance(TENANT)}

— SCAFFOLD MODE —
Synthesize the submitter's selections and draft text into a paste-ready draft for EACH of this step's output fields (listed under "fields" in the schema — draft every one, even if some end up mostly bracketed placeholders).

The 'summary' field should be 1-2 sentences acknowledging what the submitter clarified, covering the Q&A as a whole rather than any single field.

Each field's 'value' is that field's draft; each field's 'rationale' is a 1-sentence note on what in the Q&A grounds it. Field-specific format requirements are given per-field in the schema.

═══ ABSOLUTE ANTI-FABRICATION RULES ═══
- NEVER invent specific numbers (examiner counts, hours saved, dollar values, percentages)
- NEVER name specific Tech Centers, art units, classes, programs the submitter did not name
- NEVER invent evidence sources unless the submitter described one
- NEVER invent timelines or implementation milestones
- Use [BRACKETED PLACEHOLDERS] for every specific fact the submitter has not provided. This is the most important rule.
- Preserve the submitter's exact wording where they DID provide specifics
- Sparse input is USEFUL SIGNAL — leave the brackets in, that's the honest output

═══ TONE ═══
Supportive but Socratic. Reference the organization's strategic priorities by name. Be specific to the submitter's actual words and the SUBMISSION CONTEXT above — never generic-affirm.

Remember: Your job is to make the submitter THINK HARDER, not to give them less work.`,
        },
        ...conversationHistory,
        {
          role: "user",
          content: `User input for "${currentStepInfo.title}": ${userInput || "[No input provided yet]"}`,
        },
      ],
    })

    if (object.mode === "question") {
      return {
        mode: "question",
        questionText: object.questionText || "Could you tell me more about this step?",
        rationale: object.rationale || "",
        options:
          object.options && object.options.length > 0
            ? object.options
            : [
                { label: "Other (let me type my own)", isRecommended: false },
                { label: "I have enough, give me the scaffold", isRecommended: false },
              ],
      }
    }
    const fields: Record<string, ScoutFieldDraft> = {}
    for (const f of fieldPlan) {
      const drafted = (object.fields as Record<string, { value: string; rationale: string }>)[f.key as string]
      fields[f.key as string] =
        drafted && drafted.value
          ? drafted
          : draftFieldFallback(f.label, formData[f.key] as string | undefined)
    }
    return {
      mode: "scaffold",
      fields,
      summary: object.summary || "",
    }
  } catch (error) {
    console.error("AI Gateway error, falling back to mock:", error)
    return getMockResponse(step, formData, enabledFields)
  }
}

// ============================================================
// Idea overview — title + description, drafted LAST from everything collected.
// The Idea Overview step now sits at the end of the wizard, so Scout can
// synthesize a clean title and summary from the problem, solution, value,
// alignment, feasibility, and metrics the submitter already provided. Always
// editable; never overwrites a title/description the submitter has changed.
// ============================================================
export async function suggestIdeaOverview(
  formData: FormData,
): Promise<{ title: string; description: string; error?: string }> {
  const problem = (formData.problemDefinition || formData.coreProblem || "").trim()
  const solution = (formData.solutionSummary || formData.proposedSolution || "").trim()
  const userValue = (formData.userValueSummary || formData.userValue || "").trim()
  const businessValue = (formData.businessValueSummary || formData.businessValue || "").trim()
  const alignment = (formData.alignmentSummary || formData.relevantOkrs || "").trim()
  const metrics = (formData.metricsSummary || formData.successMetrics || "").trim()

  if (!problem && !solution) {
    return {
      title: "",
      description: "",
      error:
        `Fill in the problem and solution first — ${TENANT.assistantName} drafts the title and summary from your earlier answers.`,
    }
  }

  const context = [
    problem && `Problem: ${problem}`,
    solution && `Proposed solution: ${solution}`,
    userValue && `User value: ${userValue}`,
    businessValue && `Business value: ${businessValue}`,
    alignment && `Strategic alignment: ${alignment}`,
    metrics && `Success metrics: ${metrics}`,
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: z.object({
        title: z.string().describe("A concise 3-8 word, Title Case name for the AI use case"),
        description: z
          .string()
          .describe("A 2-3 sentence plain-language summary of what the idea is, who it helps, and the outcome"),
      }),
      system: `You name and summarize a ${TENANT.shortName} AI use-case submission using only what the submitter already wrote. Return a concise Title Case title (3-8 words, no quotation marks, no trailing punctuation) and a 2-3 sentence description covering what the idea is, who it helps, and the intended outcome. Do not invent specifics (units, numbers, systems) the input does not contain.

${HUMANIZATION_GUIDELINES}`,
      prompt: `${context}\n\nWrite the title and description for this idea.`,
    })
    return {
      title: object.title.trim().replace(/^["']+|["']+$/g, ""),
      description: object.description.trim(),
    }
  } catch (error) {
    console.error("AI Gateway error for idea overview, falling back to local draft:", error)
    const seed = solution || problem
    const firstClause = seed.split(/[.\n,;]/)[0].trim()
    const words = firstClause.split(/\s+/).slice(0, 8).join(" ")
    const fallbackTitle = words ? words.replace(/\b\w/g, (c) => c.toUpperCase()) : "New AI Use Case"
    return {
      title: fallbackTitle,
      description: [problem, solution].filter(Boolean).join(" ").slice(0, 280),
      error: `${TENANT.assistantName} was unavailable — drafted from your inputs locally. Edit to fit.`,
    }
  }
}


// ============================================================
// Reviewer assist — advisory read for the submission detail view.
// Advisory ONLY: the human reviewer makes the call. Helps them decide fast
// and drafts the "request info" message when something is missing.
// ============================================================
export async function assistReviewer(
  formData: FormData,
): Promise<{
  verdict: string
  strengths: string[]
  gaps: string[]
  suggestedDisposition: "approve" | "request_info" | "reject"
  draftRequestInfo: string
}> {
  const summary = `
Title: ${formData.useCaseTitle || "Untitled"}
Problem: ${formData.problemDefinition || formData.coreProblem || "[Not provided]"}
Solution: ${formData.solutionSummary || formData.proposedSolution || "[Not provided]"}
Business value: ${formData.businessValueSummary || formData.businessValue || "[Not provided]"}
Cost/time savings: ${formData.costSavings || "[Not provided]"}
Users impacted: ${formData.impactedUsersCount || "[Not provided]"}
Strategic alignment: ${formData.alignmentSummary || formData.relevantOkrs || (Array.isArray(formData.usptoFocusArea) ? formData.usptoFocusArea.join(", ") : "") || "[Not provided]"}
Implementation complexity: ${formData.implementationComplexity || "[Not provided]"}
Success metrics: ${formData.metricsSummary || formData.successMetrics || "[Not provided]"}
Timeline: ${formData.timelineForResults || "[Not provided]"}
AI risk — PII: ${formData.involvesSensitiveData || "?"}; model sourcing: ${formData.aiModelSourcing || "?"}; drives decisions about people: ${formData.aiDecisionalImpact || "?"}; mandatory human review: ${formData.aiHumanReview || "?"}
Prior readiness verdict: ${formData.readinessScore || "n/a"}
`

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: z.object({
        verdict: z.string().describe("1-2 sentence overall read for a reviewer deciding whether this should advance"),
        strengths: z.array(z.string()).describe("2-3 short, specific strengths"),
        gaps: z.array(z.string()).describe("2-3 short, specific gaps or risks the reviewer should probe before approving"),
        suggestedDisposition: z
          .enum(["approve", "request_info", "reject"])
          .describe("Advisory recommendation only — the human reviewer makes the actual decision"),
        draftRequestInfo: z
          .string()
          .describe("A short, specific message to the submitter naming exactly what to clarify or add. Used only if the reviewer chooses to request info."),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior AI strategist helping a ${TENANT.shortName} reviewer decide whether an AI idea should advance to leadership.

${USPTO_STRATEGIC_CONTEXT}

${HUMANIZATION_GUIDELINES}

You are ADVISORY ONLY. The human reviewer makes the decision; never imply you are deciding. Be specific and concise, and base everything ONLY on what the submitter actually provided — never invent numbers, units, or evidence. Frame gaps as concrete things to probe. The draftRequestInfo message should be polite, specific, and short (2-4 sentences), naming exactly what would make this decision-ready.`,
        },
        { role: "user", content: summary },
      ],
    })
    return {
      verdict: object.verdict,
      strengths: object.strengths,
      gaps: object.gaps,
      suggestedDisposition: object.suggestedDisposition,
      draftRequestInfo: object.draftRequestInfo,
    }
  } catch (error) {
    console.error("assistReviewer failed, returning fallback:", error)
    return {
      verdict:
        `${TENANT.assistantName} is temporarily unavailable. Review the submission against problem clarity, quantified value, strategic alignment, feasibility, and the AI risk answers.`,
      strengths: [],
      gaps: ["Could not generate an AI read — assess manually."],
      suggestedDisposition: "request_info",
      draftRequestInfo:
        "Thanks for the submission. Could you add a measurable baseline for your success metric and confirm the AI model sourcing before we score this?",
    }
  }
}

// ============================================================
// Governance-field draft — Scout's propose-then-confirm capture for the
// vetting-stage "complete the use case" surface (issue #161,
// components/submissions/governance-capture-panel.tsx). Drafts a proposed
// value + one-line rationale for each OMB 34-field inventory / M-25-21
// minimum-practice / RMF-input field from the idea's problem, solution,
// expected benefits, and constraints — the reviewer confirms or overrides
// each one (lib/governanceCapture.ts records which).
//
// Split into two tiers, same as lib/ombAutofill.ts's own guardrail (never a
// second rubric):
//   1. Fields with an existing deterministic determination
//      (highImpact/topicArea/aiClassification/hasPii) reuse that module
//      directly instead of re-deriving via the model.
//   2. Fields that are genuinely a judgment call on free text
//      (disseminatesToPublic, scalable, customCode, trainingDataDescription,
//      aiImpactAssessment, demographicFeatures) go to Scout. The M-25-21
//      minimum-practice status fields and the facts Scout can't know from
//      idea text (hasATO, stageOfDevelopment) get a conservative, defensible
//      default instead of a model call — an idea still in vetting hasn't
//      done pre-deployment testing, gotten an ATO, or moved past
//      pre-deployment, so "not started yet" is the honest default, not a
//      guess.
// ============================================================
const DEMOGRAPHIC_FEATURE_VALUES = [
  "race_ethnicity",
  "sex",
  "age",
  "religious_affiliation",
  "socioeconomic_status",
  "ability_status",
  "residency_status",
  "marital_status",
  "income",
  "employment_status",
  "none",
  "other",
] as const

function minPracticeNotStarted(practice: string): { value: "in_progress"; rationale: string } {
  return {
    value: "in_progress",
    rationale: `${TENANT.minimumPracticesLabel} — ${practice} hasn't started yet for a use case still moving through vetting.`,
  }
}

export async function draftGovernanceFields(formData: FormData): Promise<GovernanceFieldDraft> {
  const draft: GovernanceFieldDraft = {}

  // Tier 1 — reuse the existing deterministic determinations.
  draft.stageOfDevelopment = {
    value: "pre_deployment",
    rationale: "Still moving through vetting — hasn't reached pilot or deployment yet.",
  }
  const hi = proposeHighImpact(formData)
  draft.highImpact = { value: hi.value, rationale: hi.rationale }
  const topic = proposeTopicArea(formData)
  if (topic) draft.topicArea = topic
  const classification = proposeAiClassification(formData)
  if (classification) draft.aiClassification = classification
  const pii = proposeHasPii(formData)
  if (pii) draft.hasPii = pii
  draft.hasATO = { value: "no", rationale: "No deployment yet, so no Authorization to Operate exists." }

  // M-25-21 minimum-practice status fields — only meaningful once high-impact
  // and deployed (lib/fieldRegistry.ts's `highImpactAndDeployed`), but
  // drafting them unconditionally is harmless: the capture panel only shows
  // a field once `isFieldVisible` says it applies.
  draft.preDeploymentTesting = minPracticeNotStarted("pre-deployment testing")
  draft.aiImpactAssessmentCompleted = minPracticeNotStarted("the AI impact assessment")
  draft.independentReviewConducted = minPracticeNotStarted("independent review")
  draft.ongoingMonitoringPlan = minPracticeNotStarted("the ongoing monitoring plan")
  draft.operatorTrainingEstablished = minPracticeNotStarted("periodic operator training")
  draft.failSafeMechanism = minPracticeNotStarted("the fail-safe mechanism")
  draft.humanOversightAppeal = minPracticeNotStarted("the appeal process")
  draft.publicConsultationSteps = {
    value: ["in_progress"],
    rationale: `${TENANT.minimumPracticesLabel} — public consultation hasn't started yet for a use case still moving through vetting.`,
  }

  // Tier 2 — Scout drafts the fields that are a real judgment call on the
  // idea's own text.
  const context = [
    formData.useCaseTitle && `Title: ${formData.useCaseTitle}`,
    (formData.problemDefinition || formData.coreProblem) && `Problem: ${formData.problemDefinition || formData.coreProblem}`,
    (formData.solutionSummary || formData.proposedSolution) && `Proposed solution: ${formData.solutionSummary || formData.proposedSolution}`,
    (formData.businessValueSummary || formData.businessValue) && `Expected benefits: ${formData.businessValueSummary || formData.businessValue}`,
    formData.dependencies && `Constraints / dependencies: ${formData.dependencies}`,
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: z.object({
        disseminatesToPublic: z.enum(["yes", "no"]).describe("Does the AI system's output get disseminated to the public?"),
        disseminatesToPublicRationale: z.string().describe("1 sentence citing what in the idea text supports this"),
        scalable: z.enum(["yes", "no"]).describe("Is this use case intended to scale beyond its current deployment?"),
        scalableRationale: z.string().describe("1 sentence citing what in the idea text supports this"),
        customCode: z.enum(["yes", "no"]).describe("Does this project include custom-developed code (vs. off-the-shelf/no-code configuration)?"),
        customCodeRationale: z.string().describe("1 sentence citing what in the idea text supports this"),
        trainingDataDescription: z
          .string()
          .describe("1-2 sentences describing the data likely used to train/fine-tune/evaluate the model(s), based on the proposed solution. Empty string if nothing can be inferred."),
        aiImpactAssessment: z
          .string()
          .describe("2-3 sentences: the AI system's intended purpose, expected benefits, and potential risks — drafted from the problem/solution/benefits text (M-25-21 impact-assessment content)."),
        demographicFeatures: z
          .array(z.enum(DEMOGRAPHIC_FEATURE_VALUES))
          .describe("Demographic variables the model likely uses as features, based on the idea text. ['none'] if nothing suggests demographic features are used."),
      }),
      system: `You are ${TENANT.assistantName}, drafting the OMB federal AI use case inventory and M-25-21 minimum-practice fields for a ${TENANT.shortName} reviewer completing vetting on an AI idea. You draft PROPOSALS ONLY — a human reviewer confirms or overrides every field. Base every answer strictly on the idea text given; never invent specifics (data sources, user groups, systems) it doesn't contain. When the idea text doesn't clearly support an answer, default to the conservative/lower-risk option (disseminatesToPublic: "no", scalable: "no", customCode: "no", demographicFeatures: ["none"]) and say so in the rationale.

${HUMANIZATION_GUIDELINES}`,
      prompt: `${context || "(No idea text provided yet.)"}\n\nDraft the governance fields for this idea.`,
    })

    draft.disseminatesToPublic = { value: object.disseminatesToPublic, rationale: object.disseminatesToPublicRationale }
    draft.scalable = { value: object.scalable, rationale: object.scalableRationale }
    draft.customCode = { value: object.customCode, rationale: object.customCodeRationale }
    draft.trainingDataDescription = {
      value: object.trainingDataDescription,
      rationale: "Drafted from the proposed solution — confirm against the actual data source.",
    }
    draft.aiImpactAssessment = {
      value: object.aiImpactAssessment,
      rationale: "Drafted from the idea's problem, solution, and expected benefits.",
    }
    draft.demographicFeatures = {
      value: object.demographicFeatures,
      rationale:
        object.demographicFeatures.length && object.demographicFeatures[0] !== "none"
          ? "Inferred from the idea text — confirm against the actual model features."
          : "No demographic-feature signal found in the idea text.",
    }
  } catch (error) {
    console.error("draftGovernanceFields: AI Gateway error, falling back to deterministic defaults:", error)
    const unavailable = `${TENANT.assistantName} was unavailable — defaulted conservatively; confirm manually.`
    draft.disseminatesToPublic = { value: "no", rationale: unavailable }
    draft.scalable = { value: "no", rationale: unavailable }
    draft.customCode = { value: "no", rationale: unavailable }
    draft.trainingDataDescription = { value: "", rationale: `${TENANT.assistantName} was unavailable — describe the training/evaluation data manually.` }
    draft.aiImpactAssessment = {
      value: [formData.coreProblem, formData.proposedSolution, formData.businessValue].filter(Boolean).join(" "),
      rationale: `${TENANT.assistantName} was unavailable — assembled directly from the problem/solution/business-value text; edit as needed.`,
    }
    draft.demographicFeatures = { value: ["none"], rationale: unavailable }
  }

  return draft
}
