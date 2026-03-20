"use server"

import { generateObject } from "ai"
import { z } from "zod"
import { formSteps, type FormData } from "@/lib/steps"

type Message = {
  role: "user" | "assistant"
  content: string
}

// Helper to get the primary input field for a given step
function getInputFieldForStep(step: number): keyof FormData | null {
  switch (step) {
    case 3:
      return "targetUserContext" // Step 3: Target User
    case 4:
      return "coreProblem" // Step 4: Problem Statement
    case 5:
      return "proposedSolution" // Step 5: Proposed Solution
    case 6:
      return "userValue" // Step 6: User Value
    case 7:
      return "businessValue" // Step 7: Business Value
    case 8:
      return "relevantOkrs" // Step 8: Strategic Alignment
    case 9:
      return "dependencies" // Step 9: Feasibility & Security
    case 10:
      return "successMetrics" // Step 10: Outcome Measurements
    default:
      return null
  }
}

// Mock responses for when API key is not available - uses vetting/challenging tone
function getMockResponse(step: number, userInput: string): { feedback: string; suggestion: string } {
  const currentStepInfo = formSteps.find((s) => s.step === step)
  const stepTitle = currentStepInfo?.title || "this step"

  const mockResponses = {
    3: {
      feedback:
        "You've identified the right audience, but your description reads like a job title, not a user story. A reviewer will want to know: what does their day look like? Where does the current process break down for them? Without that, the 'pain' feels abstract.",
      suggestion: userInput
        ? `${userInput} These users typically spend 40-60% of their day on manual search tasks across disconnected systems. The biggest friction points are context-switching between databases, inconsistent search results across tools, and no way to track which references have already been reviewed — leading to duplicated effort and examiner frustration.`
        : "Patent examiners conducting prior art searches who currently spend 3-4 hours per case navigating disconnected search tools. Their core frustration: inconsistent results force repeated searches, with no systematic way to build on previous work — resulting in duplicated effort and variable examination quality.",
    },
    4: {
      feedback:
        "This captures the symptom, but not the root cause. A reviewer will ask: 'How big is this problem? What's the cost of doing nothing?' Quantify the impact — processing time, error rates, examiner attrition — to make the case undeniable.",
      suggestion: userInput
        ? `${userInput} This affects approximately [X] examiners across [Y] art units, resulting in an estimated [Z] hours of redundant work per week. Without intervention, the problem compounds as application volumes increase, directly impacting USPTO's ability to meet pendency targets and maintain examination quality standards.`
        : "Current prior art search processes require examiners to navigate 4+ disconnected systems per case, with no unified interface. This results in 2-3 hours of redundant work per examiner per week — roughly 50,000 lost hours annually across the corps. The cost of inaction: continued pendency growth and inconsistent examination quality as application volumes increase 8% year-over-year.",
    },
    5: {
      feedback:
        "The concept is solid, but it's too high-level to evaluate. A reviewer needs to understand: what specifically does the AI do? What's the user interaction model? What existing systems does it need to connect to? Without these, it reads as 'we'll use AI to fix it' — which isn't a proposal.",
      suggestion: userInput
        ? `${userInput}\n\n**Core Functionality:**\n- Unified search interface connecting [specific systems] via existing APIs\n- AI-powered query expansion using patent classification ontologies\n- Results ranking with confidence scores and relevance explanations\n\n**User Interaction:** Examiners enter natural language queries; system returns ranked results with one-click export to examination record.`
        : "An AI-powered search assistant that consolidates USPTO's existing search tools into a unified interface.\n\n**Core Functionality:**\n- Single search box connecting EAST, WEST, and NPL databases via existing APIs\n- AI query expansion using CPC/USPC classification ontologies to surface related terms\n- Results ranked by relevance with confidence scores and citation network visualization\n\n**User Interaction:** Examiner enters case-specific query; system returns deduplicated, ranked results with one-click export to PALM.",
    },
    6: {
      feedback:
        "Good instinct on the benefits, but the numbers feel aspirational rather than grounded. Where do the time savings estimates come from? A reviewer will challenge any metric that isn't tied to a baseline. Consider: what's the current state, and what specifically changes?",
      suggestion: userInput
        ? `${userInput}\n\n**Baseline:** Examiners currently spend [X] minutes per search across [Y] systems.\n**Expected Improvement:** Unified interface reduces context-switching by [Z]%, saving [N] minutes per case.\n**Confidence Level:** Based on [pilot data / comparable implementation / subject matter expert estimate].`
        : "**Baseline:** Examiners currently spend 45 minutes per prior art search, navigating 4 separate systems with significant context-switching overhead.\n\n**Expected Improvement:** Unified search reduces active search time by 30% (13.5 minutes per case) by eliminating redundant queries and system navigation. For an examiner handling 80 cases/year, this recovers 18 hours annually.\n\n**Confidence:** Estimate based on time-motion study of 12 examiners in Art Unit 2100 (Q3 2024).",
    },
    7: {
      feedback:
        "You've connected to strategic goals, which is strong. But the cost savings feel like a guess — and reviewers can tell. Ground the business case in observable data: current processing volumes, average time-per-task, and what a realistic improvement percentage would mean in hours and dollars.",
      suggestion: userInput
        ? `${userInput}\n\n**Quantified Impact:**\n- [X] examiners × [Y] hours saved/year = [Z] total hours recovered\n- At fully-loaded examiner cost of ~$85/hour, annual value = $[N]\n- Secondary benefits: [quality improvements, reduced rework, etc.]\n\n**Strategic Alignment:** Directly supports [specific USPTO goal/OKR].`
        : "**Quantified Impact:**\n- 8,500 examiners × 18 hours saved/year = 153,000 hours recovered annually\n- At fully-loaded examiner cost of $85/hour, annual value = $13M+ in examiner capacity\n- Secondary benefits: Reduced rework from missed prior art (estimated 5% quality improvement)\n\n**Strategic Alignment:** Directly supports USPTO Strategic Goal 1 (Optimize Patent Quality and Timeliness) and enables absorption of 8% YoY application growth without proportional headcount increase.",
    },
    8: {
      feedback:
        "You've named the OKRs, but naming isn't alignment. A reviewer will ask: 'How does this specifically move the needle on these objectives?' Connect the dots between your expected outcomes and the metrics USPTO actually tracks.",
      suggestion: userInput
        ? `${userInput}\n\n**Specific Alignment:**\n- OKR [X]: This initiative contributes by [specific mechanism] with expected impact of [quantified outcome]\n- OKR [Y]: Supports this objective through [specific connection]\n\n**Dependencies:** Requires alignment with [related initiatives] to avoid duplication.`
        : "**Specific Alignment:**\n- **OKR 1.2 (Reduce Patent Pendency):** 13.5 minutes saved per search × 650,000 annual disposals = potential to reduce average pendency by [X] days through increased examiner throughput\n- **OKR 1.4 (Improve First-Action Quality):** Unified search reduces missed prior art by surfacing cross-database results, directly supporting the 85% first-action allowance rate target\n\n**Dependencies:** Requires coordination with PE2E modernization to ensure API compatibility; complements (doesn't duplicate) the AI/ML Center of Excellence search initiatives.",
    },
    9: {
      feedback:
        "This reads like a checklist, not an assessment. A reviewer needs to know: what's the hardest part? What could kill this project? Be honest about the real risks — FedRAMP timeline, data access, union coordination — and show you've thought through mitigation.",
      suggestion: userInput
        ? `${userInput}\n\n**Critical Path Items:**\n- [Biggest technical risk]: Mitigation = [specific approach]\n- [Biggest organizational risk]: Mitigation = [specific approach]\n\n**FedRAMP/Security:** [Specific compliance requirements and timeline]\n\n**Honest Assessment:** The feasibility hinges on [X]. If that doesn't work, the fallback is [Y].`
        : "**Technical Feasibility:** Medium complexity. Core risk is API integration with legacy EAST system (COBOL backend). Mitigation: Wrapper service approach proven in Patent Center modernization.\n\n**Security/Compliance:** Requires ATO amendment (8-12 weeks). No new PII/CUI handling; uses existing search infrastructure. 508 compliance requires screen reader testing of new UI.\n\n**Organizational Dependencies:** IT Services API team capacity (currently constrained); Union notification required for workflow changes per CBA Article 37.\n\n**Honest Assessment:** Feasibility hinges on IT Services prioritization. If delayed, fallback is browser extension approach using existing authenticated sessions.",
    },
    10: {
      feedback:
        "You've listed metrics, but they're not connected to a measurement plan. A reviewer will ask: 'How will you actually collect this data? When will we know if it's working?' Define baselines, collection methods, and decision points.",
      suggestion: userInput
        ? `${userInput}\n\n**Measurement Plan:**\n- Baseline data source: [specific system/method]\n- Collection frequency: [timeline]\n- Decision point: At [X weeks], if [metric] hasn't reached [threshold], we will [action]\n\n**Leading vs. Lagging:** Leading indicators tell us if adoption is working; lagging indicators tell us if it's creating value.`
        : "**Success Metrics with Measurement Plan:**\n\n**Leading Indicators (Monthly):**\n- Adoption rate: Target 50% of pilot group within 4 weeks (measured via application telemetry)\n- Search volume per user: Baseline = 12 searches/day; target = 15+ (indicates tool is useful enough to use more)\n\n**Lagging Indicators (Quarterly):**\n- Time-per-search: Baseline = 45 min (from Q3 time study); target = 32 min (-30%)\n- First-action quality scores: Baseline = current art unit average; target = 5% improvement\n\n**Decision Point:** At Week 8, if adoption < 30% or user satisfaction < 3.5/5, pause rollout and conduct user research.",
    },
  }

  return (
    mockResponses[step as keyof typeof mockResponses] || {
      feedback: `A reviewer would push back on this: the input lacks specificity. What's the measurable impact? What's the risk if we don't do this? Add concrete details to make the case compelling.`,
      suggestion: userInput
        ? `${userInput}\n\n[Add specificity: quantify the impact, name the stakeholders, define success criteria, and address the obvious objections a reviewer would raise.]`
        : `[This section needs concrete details. A reviewer will ask: "So what?" Add metrics, baselines, and specific outcomes for ${stepTitle}.]`,
    }
  )
}

export async function validateAndRefineInput(
  formData: FormData,
  step: number,
  conversationHistory: Message[],
): Promise<{ feedback: string; suggestion: string }> {
  const currentStepInfo = formSteps.find((s) => s.step === step)
  if (!currentStepInfo) throw new Error("Invalid step number")

  const currentField = getInputFieldForStep(step)
  const userInput = currentField ? (formData[currentField] as string) : ""

  const stepFormattingGuidelines: Record<number, string> = {
    3: `Format your suggestion as 2-3 paragraphs describing the target users, their roles, workflows, and specific pain points they experience.`,
    4: `Format your suggestion as 2-3 clear sentences describing the specific problem with data about why it matters (severity, mission impact, consequences of inaction).`,
    5: `Format your suggestion as a concise description of the proposed AI/ML solution with 2-3 bullet points for core functionality.`,
    6: `Format your suggestion as 2-3 sentences with specific, measurable user benefits. Include quantified improvements where possible.`,
    7: `Format your suggestion as 2-3 sentences with quantified efficiency gains, quality impact, and strategic alignment.`,
    8: `Format your suggestion as 2-3 sentences describing alignment with USPTO strategic focus areas and specific OKRs this initiative supports.`,
    9: `Format your suggestion with bullet points covering: **Technical Feasibility** (complexity, resources needed), **Security & Compliance** (FedRAMP, accessibility, data privacy), **Dependencies** (technical, organizational), and **Primary Risks** with mitigation strategies.`,
    10: `Format your suggestion with bullet points for: **Success Metrics** (specific, measurable KPIs), **Leading Indicators** (early signals), **Lagging Indicators** (long-term outcomes), and **Timeline** (when results will be visible).`,
  }

  try {
    const { object } = await generateObject({
      model: "anthropic/claude-sonnet-4.5",
      schema: z.object({
        feedback: z.string().describe("Honest assessment: what's strong, what's the biggest gap, and what would a reviewer challenge"),
        suggestion: z
          .string()
          .describe("Strengthened version that addresses identified gaps, in markdown format following step-specific guidelines"),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior AI strategist at USPTO who vets AI ideas before they reach leadership. Your job is to pressure-test this idea — not just polish the language, but challenge whether it holds up under scrutiny.

TONE & STYLE:
- Supportive but rigorous — you want this idea to succeed, which means being honest about gaps
- Lead with what's strong, then challenge what's weak or vague
- Ask yourself: "Would a CIO or CAIO find this convincing?" If not, say so.
- Be specific — "this needs more detail" is not helpful; "you haven't addressed how this handles CUI data" is

CURRENT CONTEXT:
- Step: ${currentStepInfo.title}
- This is an AI idea being vetted, not a finished proposal

FORMATTING REQUIREMENTS:
${stepFormattingGuidelines[step] || "Format your suggestion clearly and concisely."}

Use markdown formatting:
- Use **bold** for emphasis on key terms
- Use bullet points (- or *) for lists
- Use proper line breaks for readability

YOUR TASK:
1. Assess the idea honestly — what's strong? What would a reviewer push back on?
2. Provide direct feedback (2-3 sentences) that identifies the biggest gap or weakness and explains why it matters
3. Create an enhanced version that:
   - Addresses the gaps you identified
   - Adds specificity, metrics, and concrete details
   - Pressure-tests against USPTO realities (federal constraints, FedRAMP, 508, union considerations, procurement)
   - Preserves the submitter's core idea and voice
   - Is ready to paste into their submission

Remember: A weak idea that gets polished is still a weak idea. Your job is to make it genuinely stronger — or flag that it isn't ready.`,
        },
        ...conversationHistory,
        {
          role: "user",
          content: `User input for "${currentStepInfo.title}": ${userInput || "[No input provided yet]"}`,
        },
      ],
    })

    return {
      feedback: object.feedback || "Input received",
      suggestion: object.suggestion || userInput,
    }
  } catch (error) {
    console.error("AI Gateway error, falling back to mock:", error)
    return getMockResponse(step, userInput)
  }
}
