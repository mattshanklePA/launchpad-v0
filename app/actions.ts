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

// ============================================================
// SUBMISSION CONTEXT BUILDER
// Compiles the submitter's responses from previous steps so the
// co-pilot has full context when coaching on the current step.
// ============================================================
function buildSubmissionContext(formData: FormData, currentStep: number): string {
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
    currentStep > 2 &&
    (formData.problemDefinition || formData.coreProblem || formData.targetUserSummary || formData.targetUserContext)
  ) {
    if (formData.problemDefinition || formData.coreProblem) {
      lines.push(`- Problem (from Step 2): ${formData.problemDefinition || formData.coreProblem}`)
    }
    if (formData.targetUserSummary || formData.targetUserContext) {
      lines.push(`- Target users (from Step 2): ${formData.targetUserSummary || formData.targetUserContext}`)
    }
  }
  if (currentStep > 3 && (formData.solutionSummary || formData.proposedSolution)) {
    lines.push(`- Proposed solution (from Step 3): ${formData.solutionSummary || formData.proposedSolution}`)
  }
  // Step 5 is the merged Value step — both user and business value.
  if (
    currentStep > 4 &&
    (formData.userValueSummary || formData.userValue || formData.businessValueSummary || formData.businessValue)
  ) {
    if (formData.userValueSummary || formData.userValue) {
      lines.push(`- User value (from Step 4): ${formData.userValueSummary || formData.userValue}`)
    }
    if (formData.businessValueSummary || formData.businessValue) {
      lines.push(`- Business value (from Step 4): ${formData.businessValueSummary || formData.businessValue}`)
    }
  }
  if (currentStep > 5 && (formData.alignmentSummary || formData.relevantOkrs)) {
    lines.push(`- Strategic alignment (from Step 5): ${formData.alignmentSummary || formData.relevantOkrs}`)
  }
  if (currentStep > 6 && (formData.feasibilitySummary || formData.dependencies)) {
    lines.push(`- Feasibility (from Step 6): ${formData.feasibilitySummary || formData.dependencies}`)
  }
  if (currentStep > 7 && (formData.metricsSummary || formData.successMetrics)) {
    lines.push(`- Success metrics (from Step 7): ${formData.metricsSummary || formData.successMetrics}`)
  }

  if (lines.length === 0) {
    return "(No prior context — this is the submitter's first Scout interaction.)"
  }
  return lines.join("\n")
}

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
- Pain points are observable and frequent, with a clear severity
- The user experience aligns with the organization's workforce and customer-experience goals
COMBINED: a strong response makes the link explicit — for THIS problem, THESE users are affected in THIS specific way.`,

  // Step 3: PROPOSED SOLUTION
  3: `For PROPOSED SOLUTION, evaluate whether:
- The AI/ML mechanism is specific (NLP query expansion, classification model, RAG, etc.) — not just "we'll use AI"
- The user interaction model is defined (what does the user do, what does the system return)
- Existing systems/APIs that must be touched are named
- The approach aligns with the organization's priority of building AI capability through infrastructure and resources`,

  // Step 4: VALUE (merged user + business)
  4: `For VALUE (merged user + business value), evaluate whether:
USER VALUE dimensions:
- The current-state baseline is quantified (how long does the user spend today)
- The expected improvement is grounded in data (pilot, benchmark, comparable system) — not a guess
- The confidence level is acknowledged (high/medium/low and why)
- The benefit is specific to real users, not abstract
BUSINESS VALUE dimensions:
- Labor-hour savings, dollar savings, throughput gains, or public-facing improvements are quantified with a defensible baseline
- The strategic link to a named priority is explicit (especially the leadership priorities)
- Secondary benefits (quality, consistency, reduced rework, public access) are identified
- The ROI claim is realistic — overly aggressive estimates undermine credibility
COMBINED: the user-level benefit must scale into a defensible business-level number.`,

  // Step 5: STRATEGIC ALIGNMENT
  5: `For STRATEGIC ALIGNMENT, evaluate whether:
- The submitter names 1-2 specific strategic priorities, not vague gestures like "modernization" or "efficiency"
- The mechanism connecting the idea to each priority is explicit (how, exactly, does this advance it?)
- Expected contribution is quantified where possible
- Responsible AI considerations are addressed — bias mitigation, human oversight, explainability
- The submitter shows focus by naming what this idea does NOT prioritize`,

  // Step 6: FEASIBILITY & SECURITY
  6: `For FEASIBILITY & SECURITY, evaluate whether:
- The hardest technical risk is named honestly (not buried)
- FedRAMP/ATO timeline implications are realistic (typically 8-12+ weeks for amendments)
- Data sensitivity and 508 accessibility are addressed
- Union/CBA considerations are flagged where workflows change
- Critical-path dependencies (other systems, teams, procurement) are identified
- A fallback plan exists if the biggest risk materializes
- AI risk management questions are addressed: PII use, decision-making impact, American-built model sourcing`,

  // Step 7: SUCCESS METRICS
  7: `For SUCCESS METRICS, evaluate whether:
- Baseline data source is named (current system telemetry, time-motion study, etc.)
- Leading indicators (adoption, usage frequency) are distinguished from lagging indicators (time saved, quality)
- A decision point is defined (at week X, if metric < threshold, we will Y)
- The collection method is realistic (not "we'll figure out how to measure later")
- Metrics tie back to the strategic priority the idea is meant to advance`,
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
      // Merged Problem & Target Users
      return section([
        `--- PROBLEM ---`,
        ["coreProblem", "Core problem (textarea)"],
        ["problemImpact", "Problem impact (textarea)"],
        ["affectedSystem", "Affected system"],
        ["problemType", "Problem type tags"],
        ["severity", "Severity"],
        `--- TARGET USERS ---`,
        ["targetAudience", "Target audience"],
        ["impactedUsersCount", "Impacted users count"],
        ["painPoints", "Key pain points (textarea)"],
        ["targetUserContext", "User profile / context (textarea)"],
      ])
    case 3:
      // Proposed Solution
      return section([
        ["proposedSolution", "Proposed solution (textarea)"],
        ["implementationComplexity", "Implementation complexity"],
        ["keyFunctionality", "Key functionality tags"],
      ])
    case 4:
      // Merged Value (user + business)
      return section([
        `--- USER VALUE ---`,
        ["userValue", "User value (textarea)"],
        ["userTimeSavings", "User time savings range"],
        ["otherUserImprovements", "Other user improvements"],
        `--- BUSINESS VALUE ---`,
        ["businessValue", "Business value (textarea)"],
        ["costSavings", "Cost savings range"],
        ["strategicBenefit", "Strategic benefit tags"],
      ])
    case 5:
      // Strategic Alignment
      return section([
        ["usptoFocusArea", "Strategic focus areas selected"],
        ["relevantOkrs", "Relevant OKRs / alignment text"],
      ])
    case 6:
      // Feasibility & Security (includes AI Risk Management questions)
      return section([
        ["resourcesNeeded", "Resources needed"],
        ["dependencies", "Dependencies (textarea)"],
        `--- AI RISK MANAGEMENT (DoC + EO mandated) ---`,
        ["involvesSensitiveData", "Uses PII / sensitive data"],
        ["securityClassification", "Security classification"],
        ["accessControlRequirements", "Access control requirements"],
        ["aiDecisionalImpact", "AI drives decisions about people"],
        ["aiModelSourcing", "AI model sourcing"],
        ["aiHumanReview", "Mandatory human review"],
      ])
    case 7:
      // Success Metrics
      return section([
        ["successMetrics", "Success metrics description (textarea)"],
        ["keyMetrics", "Key metrics tags"],
        ["timelineForResults", "Timeline for results"],
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
      // Merged Problem & Users — coach on the problem first (per Jonathan's framing)
      return "coreProblem"
    case 3:
      return "proposedSolution"
    case 4:
      // Merged Value — coach on the business-value statement first
      return "businessValue"
    case 5:
      return "relevantOkrs"
    case 6:
      return "dependencies"
    case 7:
      return "successMetrics"
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

export type ScoutResponse =
  | {
      mode: "question"
      questionText: string
      rationale: string
      options: ScoutOption[]
    }
  | {
      mode: "scaffold"
      scaffoldText: string
      summary: string
    }

// Backwards-compat aliases (deprecated). Kept so older imports don't break
// while the codebase migrates off "Co-Pilot" naming. Safe to remove later.
export type CoPilotOption = ScoutOption
export type CoPilotResponse = ScoutResponse

// Mock fallback for when the API is unavailable. Always returns a scaffold
// (never a question) so the UI doesn't get stuck in a Q&A loop with no AI.
function getMockResponse(step: number, userInput: string): ScoutResponse {
  const currentStepInfo = getFormSteps().find((s) => s.step === step)
  const stepTitle = currentStepInfo?.title || "this step"
  return {
    mode: "scaffold",
    summary:
      "(Scout is temporarily unavailable. Here's a generic scaffold — please fill in the bracketed sections with your specific details.)",
    scaffoldText: userInput
      ? `${userInput}\n\n[Add the following specifics:\n- WHO specifically (which user group, what unit)\n- WHAT evidence you've observed\n- HOW OFTEN this occurs\n- WHICH strategic priority this advances by name\n- WHAT measurable outcome you expect]`
      : `[Describe ${stepTitle} with:\n- Specific user group (not just a generic role)\n- Observable evidence you've seen\n- Frequency and severity\n- Connection to a named strategic priority\n- Measurable expected outcome]`,
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
  const userValue = formData.userValueSummary || formData.userValue || "[Not provided]"
  const businessValue = formData.businessValueSummary || formData.businessValue || "[Not provided]"
  const alignmentText = formData.alignmentSummary || formData.relevantOkrs || ""
  const focusAreas = Array.isArray(formData.usptoFocusArea) ? formData.usptoFocusArea : []
  const alignment =
    alignmentText || (focusAreas.length ? `Focus areas: ${focusAreas.join(", ")}` : "[Not provided]")
  const feasibility = formData.feasibilitySummary || formData.dependencies || "[Not provided]"
  const metrics = formData.metricsSummary || formData.successMetrics || "[Not provided]"

  // Risk profile — locked compliance fields, always assessed.
  const riskFlags: string[] = []
  if (formData.involvesSensitiveData === "yes") riskFlags.push("Uses PII / sensitive data")
  if (formData.aiDecisionalImpact === "yes") riskFlags.push("AI drives decisions about applicants/employees")
  if (formData.aiModelSourcing === "foreign") riskFlags.push("Foreign-built model — EO compliance issue")
  if (formData.aiModelSourcing === "unknown") riskFlags.push("Model sourcing not yet determined")
  if (formData.aiHumanReview === "no") riskFlags.push("No mandatory human review before action")
  if (formData.dataReadiness === "needs_build") riskFlags.push("No AI-ready data yet — must be collected or labeled first")
  if (formData.dataReadiness === "partial") riskFlags.push("Data only partially AI-ready — labeling/cleanup needed")
  if (formData.impactLevel === "il6") riskFlags.push("Classified (IL6 / Secret) — requires an accredited secure enclave and the strictest controls")

  // Build the brief dimension-by-dimension. A toggleable dimension is included
  // only if at least one backing input field is still enabled in the form
  // config; dimensions the admin turned off are omitted AND listed under
  // "Intentionally NOT Collected" so the model never scores their absence as a
  // gap. Locked dimensions (description, problem, solution, risk) always show.
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
  dim("Value to Users", ["userValue", "userTimeSavings"], userValue)
  dim("Value to the Business", ["businessValue", "costSavings"], businessValue)
  dim("Strategic Alignment", ["usptoFocusArea", "relevantOkrs"], alignment)
  dim("Feasibility & Security", ["dependencies", "resourcesNeeded"], feasibility)

  // Enabled-and-present quantitative signals the exec summary may cite verbatim.
  const dataPoints: string[] = []
  if (on("impactedUsersCount") && formData.impactedUsersCount) dataPoints.push(`- Estimated users impacted: ${formData.impactedUsersCount}`)
  if (on("costSavings") && formData.costSavings) dataPoints.push(`- Estimated cost / time savings: ${formData.costSavings}`)
  if (on("userTimeSavings") && formData.userTimeSavings) dataPoints.push(`- Expected user time savings: ${formData.userTimeSavings}`)
  if (on("severity") && formData.severity) dataPoints.push(`- Problem severity: ${formData.severity}`)
  if (on("implementationComplexity") && formData.implementationComplexity) dataPoints.push(`- Implementation complexity: ${formData.implementationComplexity}`)
  if (formData.impactLevel) dataPoints.push(`- Data classification / Impact Level: ${formData.impactLevel.toUpperCase()}`)
  if (formData.dataReadiness) dataPoints.push(`- Data readiness: ${formData.dataReadiness === "ai_ready" ? "AI-ready data exists" : formData.dataReadiness === "partial" ? "partial — needs labeling/cleanup" : "must be built/relabeled"}`)
  if (formData.trl) dataPoints.push(`- Maturity: TRL ${formData.trl} of 9`)
  if (on("timelineForResults") && formData.timelineForResults) dataPoints.push(`- Timeline for results: ${formData.timelineForResults}`)
  if (dataPoints.length) sections.push(`### Key Data Points\n${dataPoints.join("\n")}`)

  sections.push(
    `### AI Risk Profile\n${riskFlags.length > 0 ? riskFlags.map((f) => `- ${f}`).join("\n") : "No mandatory-disclosure risk flags raised."}`,
  )

  dim("Success Metrics", ["successMetrics", "timelineForResults"], metrics)

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

LEADERSHIP FRAMING — IMPORTANT:
Leadership priorities are: ${TENANT.leadershipPriorities}. When evaluating and summarizing, lead with the PROBLEM, then align EXPECTED BENEFITS to those priorities by name where the submission supports it. Don't force-fit; if the idea doesn't materially advance them, say so and connect it to the strategic priority it actually advances.

EXECUTIVE SUMMARY STRUCTURE (MANDATORY ORDER):
1. PROBLEM — what's broken, who it affects, and the cost of inaction (use the submitter's numbers if provided; do not invent any)
2. EXPECTED BENEFITS / VALUE METRICS — quantified outcomes tied to named strategic priorities
3. STRATEGIC ALIGNMENT — the specific Strategic Plan goal(s) and/or AI Strategy priority(ies) this advances
4. RISK PROFILE — surface any flags from the AI Risk Profile section (PII, decisional impact, model sourcing, human review)
5. READINESS — is this ready for a leadership decision, or what still needs work
If a section above (1-3) maps to a dimension listed under "Intentionally NOT Collected", SKIP that section entirely rather than noting it as missing. PROBLEM and RISK PROFILE are always collected.

EVALUATE THE IDEA HONESTLY:

WEIGHTING — weigh these heavily in the rating, in roughly this order:
1. DATA READINESS — does AI-ready data exist today? "Must be built/relabeled" is the most common reason AI initiatives fail; a strong concept with no data foundation is NOT "ready".
2. STRATEGIC + MISSION ALIGNMENT — a specifically named strategic priority and mission outcome (see leadership priorities above), with a stated mechanism — not "modernization".
3. RESPONSIBLE-AI POSTURE — appropriate human judgment for anything decisional, American-built model inside the accredited boundary, declared classification/Impact Level consistent with the data, and bias/traceability addressed.
4. MATURITY — a declared TRL with a maturation or sustainment plan if low.
5. VALUE — quantified, caveated outcomes that acknowledge sustainment cost, not adjectives.

Rate it as one of:
- "ready" — All collected dimensions are substantive. The approving authority could make an informed funding decision. Data readiness is credible, alignment names a specific priority and mission outcome with a mechanism, the responsible-AI gate is clean (human judgment where decisional, American-built/in-boundary model, classification/Impact Level declared), TRL is stated, and value is quantified.
- "needs_work" — The core idea has merit but 1-2 dimensions have significant gaps (partial data readiness, only nominal alignment, missing TRL, unquantified value, or one unresolved risk answer like model sourcing). Worth pursuing but needs strengthening before leadership review.
- "early_stage" — Too vague or underdeveloped: multiple weak dimensions, buzzword alignment with no mechanism, NO realistic data foundation, OR multiple unaddressed responsible-AI flags (foreign/unknown sourcing, decisional AI without human review, undeclared classification). The submitter should keep refining before submitting.

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
        "This idea has a strong problem statement and clear target users, but the feasibility assessment and success metrics need more specificity. The business value claims should be grounded in baseline data, and the strategic alignment should explicitly name a strategic priority before this goes to leadership.",
      executiveSummary: `"${formData.useCaseTitle || "Untitled Idea"}" proposes an AI-driven approach to improve operations for ${TENANT.shortName} staff. The idea targets a real operational pain point and connects to ${TENANT.shortName}'s published priorities, but requires additional detail on the specific priority it advances, implementation feasibility, and measurable success criteria before it's ready for executive decision-making.`,
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

You are Scout, an AI advisor helping ${TENANT.shortName} staff align AI ideas with published strategic priorities. You will receive a submitter's idea (problem, solution, value claims) and must return:

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
      rationale: "(Auto-suggested locally — Scout was unavailable. Verify these match your idea before submitting.)",
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
  const currentStepInfo = getFormSteps().find((s) => s.step === step)
  if (!currentStepInfo) throw new Error("Invalid step number")

  const currentField = getInputFieldForStep(step)
  const userInput = currentField ? (formData[currentField] as string) : ""
  const submissionContext = buildSubmissionContext(formData, step)
  const assistantTurns = conversationHistory.filter((m) => m.role === "assistant").length

  const stepFormattingGuidelines: Record<number, string> = {
    2: `When producing the scaffold: open with 2-3 sentences naming the problem (severity, mission impact, consequences of inaction), then 2-3 sentences describing the affected users (roles, workflow context, observable pain).`,
    3: `When producing the scaffold: a concise description of the AI/ML solution with 2-3 bullet points for core functionality.`,
    4: `When producing the scaffold: open with 2-3 sentences on user-level benefit (with a quantified time savings), then 2-3 sentences on agency-level business value tied to a named strategic priority.`,
    5: `When producing the scaffold: 2-3 sentences mapping the idea to named strategic priorities and the explicit mechanism by which each is advanced.`,
    6: `When producing the scaffold: bullet points covering Technical Feasibility, Security & Compliance, Dependencies, and Primary Risks with mitigation. Address AI risk management: PII use, decisional AI impact, American-built model sourcing.`,
    7: `When producing the scaffold: bullet points for Success Metrics, Leading Indicators, Lagging Indicators, and Timeline.`,
  }

  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: z.object({
        mode: z
          .enum(["question", "scaffold"])
          .describe(
            "'question' to ask another clarifying question; 'scaffold' to produce the final template. Prefer 'question' for the first 2-3 turns when input is sparse. Move to 'scaffold' after sufficient Q&A or when the user picks 'I have enough'.",
          ),
        questionText: z.string().describe("If mode=question: the single, specific clarifying question. If mode=scaffold: empty string."),
        rationale: z.string().describe("If mode=question: 1-sentence reason why this question matters in strategic terms. If mode=scaffold: empty string."),
        options: z
          .array(
            z.object({
              label: z.string().describe("Short clickable option label (3-12 words)."),
              isRecommended: z.boolean().describe("True only for the single most contextually likely option based on SUBMISSION CONTEXT, otherwise false."),
            }),
          )
          .describe(
            "If mode=question: 4-5 options. Use 2-3 specific likely answers FIRST, then 'Other (let me type my own)', then 'I have enough, give me the scaffold'. If mode=scaffold: empty array.",
          ),
        scaffoldText: z
          .string()
          .describe(
            "If mode=scaffold: a template that synthesizes the submitter's actual selections into a paste-ready response, with [BRACKETED PLACEHOLDERS] for any specific facts they still need to provide. Never invent specifics. If mode=question: empty string.",
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

— QUESTION MODE —
Ask ONE specific question that ONLY the submitter can answer from their own observation, role, or organization.

Provide a 1-sentence rationale explaining why this question matters in strategic terms.

Provide 4-5 options. Structure them like this:
- 2-3 specific likely answers (vary the user group based on what the submission actually says — examiners, IT staff, OGC attorneys, applicants, the public, contract admins, etc. — do NOT default to "examiners")
- Then: "Other (let me type my own)"
- Then: "I have enough, give me the scaffold"

Mark exactly ONE option as isRecommended=true if SUBMISSION CONTEXT suggests an obvious starting point. Otherwise mark none as recommended.

— SCAFFOLD MODE —
Synthesize the submitter's selections and draft text into a paste-ready template.

The 'summary' field should be 1-2 sentences acknowledging what the submitter clarified.

The 'scaffoldText' field should be the template itself. Format requirement for this step:
${stepFormattingGuidelines[step] || "Format clearly and concisely."}

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
    return {
      mode: "scaffold",
      scaffoldText: object.scaffoldText || userInput || "[Add your content here]",
      summary: object.summary || "",
    }
  } catch (error) {
    console.error("AI Gateway error, falling back to mock:", error)
    return getMockResponse(step, userInput)
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
        "Fill in the problem and solution first — Scout drafts the title and summary from your earlier answers.",
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
      error: "Scout was unavailable — drafted from your inputs locally. Edit to fit.",
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
        "Scout is temporarily unavailable. Review the submission against problem clarity, quantified value, strategic alignment, feasibility, and the AI risk answers.",
      strengths: [],
      gaps: ["Could not generate an AI read — assess manually."],
      suggestedDisposition: "request_info",
      draftRequestInfo:
        "Thanks for the submission. Could you add a measurable baseline for your success metric and confirm the AI model sourcing before we score this?",
    }
  }
}
