"use server"

// LaunchPad Co-Pilot server actions for AI vetting + readiness assessment
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { formSteps, type FormData } from "@/lib/steps"

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
const USPTO_STRATEGIC_CONTEXT = `
USPTO operates under two published strategic frameworks. Every AI idea pursued by USPTO should clearly advance at least one priority from these:

**USPTO 2022-2026 Strategic Plan goals:**
- Drive inclusive U.S. innovation and global competitiveness
- Promote the efficient delivery of reliable IP rights
- Promote the protection of IP against new and persistent threats
- Bring innovation to impact for the public good
- Generate impactful employee and customer experiences by maximizing agency operations

**USPTO AI Strategy (January 2025) priorities:**
- Advance IP policies for inclusive AI innovation
- Enhance AI capabilities through infrastructure and resources
- Promote responsible AI use (bias mitigation, explainability, human oversight)
- Develop AI expertise within the workforce
- Collaborate with governmental and international partners on AI

A serious AI idea names the specific priorities it advances, describes the mechanism by which it does so, and acknowledges what it does not prioritize. Vague gestures like "modernization," "efficiency," or "improving outcomes" are not alignment — they are buzzwords.
`

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
  if (currentStep > 3 && (formData.targetUserSummary || formData.targetUserContext)) {
    lines.push(`- Target users (from Step 3): ${formData.targetUserSummary || formData.targetUserContext}`)
  }
  if (currentStep > 4 && (formData.problemDefinition || formData.coreProblem)) {
    lines.push(`- Problem (from Step 4): ${formData.problemDefinition || formData.coreProblem}`)
  }
  if (currentStep > 5 && (formData.solutionSummary || formData.proposedSolution)) {
    lines.push(`- Proposed solution (from Step 5): ${formData.solutionSummary || formData.proposedSolution}`)
  }
  if (currentStep > 6 && (formData.userValueSummary || formData.userValue)) {
    lines.push(`- User value (from Step 6): ${formData.userValueSummary || formData.userValue}`)
  }
  if (currentStep > 7 && (formData.businessValueSummary || formData.businessValue)) {
    lines.push(`- Business value (from Step 7): ${formData.businessValueSummary || formData.businessValue}`)
  }
  if (currentStep > 8 && (formData.alignmentSummary || formData.relevantOkrs)) {
    lines.push(`- Strategic alignment (from Step 8): ${formData.alignmentSummary || formData.relevantOkrs}`)
  }
  if (currentStep > 9 && (formData.feasibilitySummary || formData.dependencies)) {
    lines.push(`- Feasibility (from Step 9): ${formData.feasibilitySummary || formData.dependencies}`)
  }
  if (currentStep > 10 && (formData.metricsSummary || formData.successMetrics)) {
    lines.push(`- Success metrics (from Step 10): ${formData.metricsSummary || formData.successMetrics}`)
  }

  if (lines.length === 0) {
    return "(No prior context — this is the submitter's first co-pilot interaction.)"
  }
  return lines.join("\n")
}

// ============================================================
// STEP-SPECIFIC RUBRICS
// Each step has a rubric describing what "strong" looks like
// and what a USPTO reviewer would push back on.
// ============================================================
const stepRubrics: Record<number, string> = {
  3: `For TARGET USERS, evaluate whether:
- The user role is named with specific workflow context (not just a job title)
- The estimated number of users impacted is realistic and tied to USPTO scale
- Pain points are observable, frequent, and have a clear severity
- The user experience aligns with USPTO's goal of impactful employee and customer experiences`,

  4: `For PROBLEM STATEMENT, evaluate whether:
- The root cause is named, not just symptoms
- The cost of inaction is quantified (hours, dollars, errors, pendency days)
- The problem connects to a real USPTO operational priority — most often efficient delivery of reliable IP rights
- The magnitude is established (how many examiners, how many cases, how often)`,

  5: `For PROPOSED SOLUTION, evaluate whether:
- The AI/ML mechanism is specific (NLP query expansion, classification model, RAG, etc.) — not just "we'll use AI"
- The user interaction model is defined (what does the user do, what does the system return)
- Existing USPTO systems/APIs that must be touched are named
- The approach aligns with USPTO's priority of enhancing AI capabilities through infrastructure and resources`,

  6: `For USER VALUE, evaluate whether:
- The current-state baseline is quantified (how long does the user spend today)
- The expected improvement is grounded in data (pilot, benchmark, comparable system) — not a guess
- The confidence level is acknowledged (high/medium/low and why)
- The benefit is specific to USPTO users, not abstract`,

  7: `For BUSINESS VALUE, evaluate whether:
- Labor-hour savings, dollar savings, throughput gains, or public-facing improvements are quantified with a defensible baseline (whoever the users are — examiners, IT staff, attorneys, applicants, the public)
- The strategic link to a named USPTO priority is explicit
- Secondary benefits (quality, consistency, reduced rework, public access) are identified
- The ROI claim is realistic — overly aggressive estimates undermine credibility`,

  8: `For STRATEGIC ALIGNMENT, evaluate whether:
- The submitter names 1-2 specific USPTO priorities — not vague gestures like "modernization" or "efficiency"
- The mechanism connecting the idea to each priority is explicit (how, exactly, does this advance it?)
- Expected contribution is quantified where possible
- Responsible AI considerations are addressed — bias mitigation, human oversight, explainability
- The submitter shows focus by naming what this idea does NOT prioritize`,

  9: `For FEASIBILITY & SECURITY, evaluate whether:
- The hardest technical risk is named honestly (not buried)
- FedRAMP/ATO timeline implications are realistic (typically 8-12+ weeks for amendments)
- Data sensitivity and 508 accessibility are addressed
- Union/CBA considerations are flagged where workflows change
- Critical-path dependencies (other systems, teams, procurement) are identified
- A fallback plan exists if the biggest risk materializes`,

  10: `For SUCCESS METRICS, evaluate whether:
- Baseline data source is named (current system telemetry, time-motion study, etc.)
- Leading indicators (adoption, usage frequency) are distinguished from lagging indicators (time saved, quality)
- A decision point is defined (at week X, if metric < threshold, we will Y)
- The collection method is realistic (not "we'll figure out how to measure later")
- Metrics tie back to the USPTO priority the idea is meant to advance`,
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

function buildStepInputs(formData: FormData, step: number): string {
  switch (step) {
    case 3:
      return [
        `- Target audience: ${fmt(formData.targetAudience)}`,
        `- Impacted users count: ${fmt(formData.impactedUsersCount)}`,
        `- Key pain points (textarea): ${fmt(formData.painPoints)}`,
        `- User profile / context (textarea): ${fmt(formData.targetUserContext)}`,
      ].join("\n")
    case 4:
      return [
        `- Core problem (textarea): ${fmt(formData.coreProblem)}`,
        `- Problem impact (textarea): ${fmt(formData.problemImpact)}`,
        `- Affected system: ${fmt(formData.affectedSystem)}`,
        `- Problem type tags: ${fmt(formData.problemType)}`,
        `- Severity: ${fmt(formData.severity)}`,
      ].join("\n")
    case 5:
      return [
        `- Proposed solution (textarea): ${fmt(formData.proposedSolution)}`,
        `- Key functionality tags: ${fmt(formData.keyFunctionality)}`,
      ].join("\n")
    case 6:
      return [
        `- User value (textarea): ${fmt(formData.userValue)}`,
        `- User time savings range: ${fmt(formData.userTimeSavings)}`,
        `- Other user improvements: ${fmt(formData.otherUserImprovements)}`,
      ].join("\n")
    case 7:
      return [
        `- Business value (textarea): ${fmt(formData.businessValue)}`,
        `- Cost savings range: ${fmt(formData.costSavings)}`,
        `- Strategic benefit tags: ${fmt(formData.strategicBenefit)}`,
      ].join("\n")
    case 8:
      return [
        `- USPTO focus areas selected: ${fmt(formData.usptoFocusArea)}`,
        `- Relevant OKRs / alignment text: ${fmt(formData.relevantOkrs)}`,
      ].join("\n")
    case 9:
      return [
        `- Implementation complexity: ${fmt(formData.implementationComplexity)}`,
        `- Resources needed: ${fmt(formData.resourcesNeeded)}`,
        `- Dependencies (textarea): ${fmt(formData.dependencies)}`,
        `- Involves sensitive data: ${fmt(formData.involvesSensitiveData)}`,
        `- Security classification: ${fmt(formData.securityClassification)}`,
        `- Access control requirements: ${fmt(formData.accessControlRequirements)}`,
      ].join("\n")
    case 10:
      return [
        `- Success metrics description (textarea): ${fmt(formData.successMetrics)}`,
        `- Key metrics tags: ${fmt(formData.keyMetrics)}`,
        `- Timeline for results: ${fmt(formData.timelineForResults)}`,
      ].join("\n")
    default:
      return "(no inputs for this step)"
  }
}

// Helper to get the primary input field for a given step
function getInputFieldForStep(step: number): keyof FormData | null {
  switch (step) {
    case 3:
      return "targetUserContext"
    case 4:
      return "coreProblem"
    case 5:
      return "proposedSolution"
    case 6:
      return "userValue"
    case 7:
      return "businessValue"
    case 8:
      return "relevantOkrs"
    case 9:
      return "dependencies"
    case 10:
      return "successMetrics"
    default:
      return null
  }
}

// ============================================================
// Co-pilot response shape (discriminated by mode)
// ============================================================
export type CoPilotOption = {
  label: string
  isRecommended: boolean
}

export type CoPilotResponse =
  | {
      mode: "question"
      questionText: string
      rationale: string
      options: CoPilotOption[]
    }
  | {
      mode: "scaffold"
      scaffoldText: string
      summary: string
    }

// Mock fallback for when the API is unavailable. Always returns a scaffold
// (never a question) so the UI doesn't get stuck in a Q&A loop with no AI.
function getMockResponse(step: number, userInput: string): CoPilotResponse {
  const currentStepInfo = formSteps.find((s) => s.step === step)
  const stepTitle = currentStepInfo?.title || "this step"
  return {
    mode: "scaffold",
    summary:
      "(The AI co-pilot is temporarily unavailable. Here's a generic scaffold — please fill in the bracketed sections with your specific details.)",
    scaffoldText: userInput
      ? `${userInput}\n\n[Add the following specifics:\n- WHO specifically (which group of examiners, what unit)\n- WHAT evidence you've observed\n- HOW OFTEN this occurs\n- WHICH USPTO priority this advances by name\n- WHAT measurable outcome you expect]`
      : `[Describe ${stepTitle} with:\n- Specific user group (not just "examiners")\n- Observable evidence you've seen\n- Frequency and severity\n- Connection to a named USPTO priority\n- Measurable expected outcome]`,
  }
}

// ============================================================
// Assess readiness for leadership review (final step assessment)
// ============================================================
export async function assessReadiness(
  formData: FormData,
): Promise<{ readinessScore: "ready" | "needs_work" | "early_stage"; readinessSummary: string; executiveSummary: string }> {
  const targetUser = formData.targetUserSummary || formData.targetUserContext || "[Not provided]"
  const problem = formData.problemDefinition || formData.coreProblem || "[Not provided]"
  const solution = formData.solutionSummary || formData.proposedSolution || "[Not provided]"
  const userValue = formData.userValueSummary || formData.userValue || "[Not provided]"
  const businessValue = formData.businessValueSummary || formData.businessValue || "[Not provided]"
  const alignment = formData.alignmentSummary || formData.relevantOkrs || "[Not provided]"
  const feasibility = formData.feasibilitySummary || formData.dependencies || "[Not provided]"
  const metrics = formData.metricsSummary || formData.successMetrics || "[Not provided]"

  const submissionSummary = `
## Idea: ${formData.useCaseTitle || "Untitled"}

### Description
${formData.useCaseDescription || "[Not provided]"}

### Target Users
${targetUser}

### Problem Statement
${problem}

### Proposed Solution
${solution}

### User Value
${userValue}

### Business Value
${businessValue}

### Strategic Alignment
${alignment}

### Feasibility & Security
${feasibility}

### Success Metrics
${metrics}
`

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5-20250929"),
      schema: z.object({
        readinessScore: z.enum(["ready", "needs_work", "early_stage"]).describe("Overall readiness rating for leadership review"),
        readinessSummary: z.string().describe("2-3 sentences explaining the rating and key gaps if any"),
        executiveSummary: z.string().describe("One paragraph executive brief of the idea for a 30-second review"),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior AI strategist at USPTO evaluating whether an AI idea is ready for leadership review.

${USPTO_STRATEGIC_CONTEXT}

You are given the complete submission across all dimensions: target users, problem, solution, user value, business value, strategic alignment, feasibility, and success metrics.

EVALUATE THE IDEA HONESTLY:

Rate it as one of:
- "ready" — All dimensions are substantive and well-supported. A CAIO or CIO could make an informed decision based on this submission. Strategic alignment to a specific, named USPTO priority is clear, feasibility is realistic with FedRAMP/security considerations addressed, and success metrics are measurable with named baselines.
- "needs_work" — The core idea has merit, but 1-2 dimensions have significant gaps (vague value proposition, unaddressed feasibility concerns, missing metrics, or only nominal strategic alignment). Worth pursuing but needs strengthening before leadership review.
- "early_stage" — The idea is too vague or underdeveloped for leadership review. Multiple dimensions lack substance, or alignment is only nominal (buzzwords like "modernization" without explicit mechanism). The submitter should continue refining before submitting.

ANTI-FABRICATION RULE FOR THE EXECUTIVE SUMMARY:
The executive summary must SYNTHESIZE only what the submitter actually wrote — do NOT invent specific numbers, named units (Tech Centers, art units, programs), evidence sources, or impact figures the submitter did not include. If their input is too vague to produce a substantive summary, the summary should honestly reflect that (e.g., "Proposes [X] for [Y] users; specifics on impact and feasibility are not yet defined").

When the submission is substantive, the summary should crisply state: what the idea is, who it helps, what specific USPTO priority it advances, and whether it's operationally ready. Reference USPTO priorities by name. Write as if briefing a CIO in 30 seconds.

The readinessSummary should similarly be honest about gaps — name them specifically rather than smoothing over.`,
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
        "This idea has a strong problem statement and clear target users, but the feasibility assessment and success metrics need more specificity. The business value claims should be grounded in baseline data, and the strategic alignment should explicitly name a USPTO priority (e.g., efficient delivery of IP rights, impactful employee experiences) before this goes to leadership.",
      executiveSummary: `"${formData.useCaseTitle || "Untitled Idea"}" proposes an AI-driven approach to improve operations for USPTO staff. The idea targets a real operational pain point and connects to USPTO's published priorities, but requires additional detail on the specific priority it advances, implementation feasibility, and measurable success criteria before it's ready for executive decision-making.`,
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
): Promise<CoPilotResponse> {
  const currentStepInfo = formSteps.find((s) => s.step === step)
  if (!currentStepInfo) throw new Error("Invalid step number")

  const currentField = getInputFieldForStep(step)
  const userInput = currentField ? (formData[currentField] as string) : ""
  const submissionContext = buildSubmissionContext(formData, step)
  const assistantTurns = conversationHistory.filter((m) => m.role === "assistant").length

  const stepFormattingGuidelines: Record<number, string> = {
    3: `When producing the scaffold: 2-3 paragraphs describing the target users, their roles, workflows, and specific pain points.`,
    4: `When producing the scaffold: 2-3 clear sentences naming the problem and what makes it worth solving (severity, mission impact, consequences of inaction).`,
    5: `When producing the scaffold: a concise description of the AI/ML solution with 2-3 bullet points for core functionality.`,
    6: `When producing the scaffold: 2-3 sentences with specific, measurable user benefits.`,
    7: `When producing the scaffold: 2-3 sentences with quantified efficiency gains, quality impact, and strategic alignment.`,
    8: `When producing the scaffold: 2-3 sentences mapping the idea to named USPTO priorities and the explicit mechanism by which each is advanced.`,
    9: `When producing the scaffold: bullet points covering Technical Feasibility, Security & Compliance, Dependencies, and Primary Risks with mitigation.`,
    10: `When producing the scaffold: bullet points for Success Metrics, Leading Indicators, Lagging Indicators, and Timeline.`,
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5-20250929"),
      schema: z.object({
        mode: z
          .enum(["question", "scaffold"])
          .describe(
            "'question' to ask another clarifying question; 'scaffold' to produce the final template. Prefer 'question' for the first 2-3 turns when input is sparse. Move to 'scaffold' after sufficient Q&A or when the user picks 'I have enough'.",
          ),
        questionText: z.string().describe("If mode=question: the single, specific clarifying question. If mode=scaffold: empty string."),
        rationale: z.string().describe("If mode=question: 1-sentence reason why this question matters in USPTO terms. If mode=scaffold: empty string."),
        options: z
          .array(
            z.object({
              label: z.string().describe("Short clickable option label (3-12 words)."),
              isRecommended: z.boolean().describe("True only for the single most contextually likely option based on SUBMISSION CONTEXT, otherwise false."),
            }),
          )
          .describe(
            "If mode=question: 4-5 options. Use 2-3 specific likely answers FIRST, then 'Other — let me type my own', then 'I have enough — give me the scaffold'. If mode=scaffold: empty array.",
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
          content: `You are a senior AI strategist at USPTO who pressure-tests AI ideas. You COACH submitters one question at a time — you NEVER ghostwrite answers.

${USPTO_STRATEGIC_CONTEXT}

═══ SUBMISSION CONTEXT (carry these through every coaching turn) ═══
${submissionContext}

CURRENT STEP: ${currentStepInfo.title}

EVALUATION CRITERIA (what "strong" looks like for this step):
${stepRubrics[step] || "Apply general rigor: specificity, quantification, and explicit alignment with a named USPTO priority."}

═══ THE SUBMITTER'S CURRENT INPUTS FOR THIS STEP (every field) ═══
${buildStepInputs(formData, step)}

When coaching: consider ALL inputs above, not just the textarea. Dropdowns and tag selections are real signal — if the submitter selected "Severity: high" but wrote a vague textarea, that mismatch is worth surfacing. If they tagged "Strategic Benefit: efficiency" and the textarea says nothing measurable, that's a gap to question.

Q&A turns completed so far in this session: ${assistantTurns}

═══ INTERACTION MODEL ═══

EACH RESPONSE IS EITHER mode="question" OR mode="scaffold". You decide based on:
- If turns so far is 0-2 AND the submitter has not selected "I have enough — give me the scaffold" → prefer mode="question"
- If turns so far is ≥3 OR the most recent user message in history is "I have enough — give me the scaffold" → produce mode="scaffold"
- If the submitter's draft text is already substantive and well-grounded → you may skip directly to mode="scaffold"

— QUESTION MODE —
Ask ONE specific question that ONLY the submitter can answer from their own observation, role, or organization.

Provide a 1-sentence rationale explaining why this question matters in USPTO terms.

Provide 4-5 options. Structure them like this:
- 2-3 specific likely answers (vary the user group based on what the submission actually says — examiners, IT staff, OGC attorneys, applicants, the public, contract admins, etc. — do NOT default to "examiners")
- Then: "Other — let me type my own"
- Then: "I have enough — give me the scaffold"

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
Supportive but Socratic. Reference USPTO priorities by name. Be specific to the submitter's actual words and the SUBMISSION CONTEXT above — never generic-affirm.

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
                { label: "Other — let me type my own", isRecommended: false },
                { label: "I have enough — give me the scaffold", isRecommended: false },
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

.scaffoldText || userInput || "[Add your content here]",
      summary: object.summary || "",
    }
  } catch (error) {
    console.error("AI Gateway error, falling back to mock:", error)
    return getMockResponse(step, userInput)
  }
}
