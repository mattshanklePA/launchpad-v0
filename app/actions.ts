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
      return "dependencies" // Changed from relevantOkrs to dependencies for feasibility
    case 9:
      return "successMetrics"
    case 10:
      return "relevantOkrs" // OKRs moved to step 10 where they belong
    default:
      return null
  }
}

// Mock responses for when API key is not available
function getMockResponse(step: number, userInput: string): { feedback: string; suggestion: string } {
  const currentStepInfo = formSteps.find((s) => s.step === step)
  const stepTitle = currentStepInfo?.title || "this step"

  const mockResponses = {
    3: {
      feedback:
        "Your target user description provides a good foundation. Consider adding more specific details about their daily workflow and the specific challenges they face in their role.",
      suggestion: userInput
        ? `${userInput} Additionally, these users typically work with multiple systems daily and would benefit from streamlined processes that reduce context switching and manual data entry.`
        : "Patent examiners who conduct prior art searches and need more efficient tools to identify relevant references while maintaining high accuracy standards.",
    },
    4: {
      feedback:
        "Your problem statement captures the core issue well. To strengthen it, consider quantifying the impact and being more specific about the root causes.",
      suggestion: userInput
        ? `${userInput} This results in increased processing time, potential inconsistencies in examination quality, and examiner frustration due to inefficient workflows.`
        : "Current prior art search processes are time-consuming and often yield inconsistent results, leading to longer examination times and potential quality issues.",
    },
    5: {
      feedback:
        "Your proposed solution shows promise. Consider breaking it down into more specific, actionable components and addressing potential implementation challenges.",
      suggestion: userInput
        ? `${userInput} The solution would include an intuitive user interface, integration with existing USPTO systems, and comprehensive training materials for smooth adoption.`
        : "Implement an AI-powered search enhancement tool that uses natural language processing to improve search query accuracy and provides ranked, relevant results with confidence scores.",
    },
    6: {
      feedback:
        "You've identified good user benefits. Try to be more specific about measurable outcomes and how users' daily work will improve.",
      suggestion: userInput
        ? `${userInput} Users will experience reduced search time, improved accuracy in finding relevant prior art, and less frustration with manual processes, ultimately leading to higher job satisfaction.`
        : "Users will save 2-3 hours per week on search activities, achieve 25% better accuracy in identifying relevant prior art, and experience reduced cognitive load from manual search processes.",
    },
    7: {
      feedback:
        "Your business value proposition is solid. Consider adding more specific metrics and connecting to USPTO's strategic objectives.",
      suggestion: userInput
        ? `${userInput} This directly supports USPTO's goal of improving examination quality and timeliness while reducing operational costs through increased efficiency.`
        : "The solution will reduce average examination time by 15-20%, improve consistency in prior art identification, and support USPTO's strategic goal of enhancing patent quality while managing increasing application volumes.",
    },
    8: {
      feedback:
        "You've identified important considerations. Consider being more specific about technical requirements, security compliance needs, and realistic resource estimates.",
      suggestion: userInput
        ? `${userInput} Additional considerations include FedRAMP compliance requirements, accessibility standards (508 compliance), data privacy protections, and the need for specialized AI/ML expertise on the team.`
        : "**Technical Feasibility:** Requires access to patent examination data APIs and integration with existing search tools. **Security & Compliance:** Must meet FedRAMP Moderate standards, Section 508 accessibility requirements, and USPTO data handling policies. **Resources:** Needs AI/ML engineers, security specialists, and 6-8 months development time. **Primary Risks:** Data quality issues and user adoption challenges can be mitigated through phased rollout and comprehensive training.",
    },
    9: {
      feedback:
        "Your success metrics provide a good foundation. Consider adding both leading and lagging indicators, with clear baseline measurements and realistic timelines.",
      suggestion: userInput
        ? `${userInput} Include both early adoption metrics and long-term quality improvements, with quarterly measurement checkpoints.`
        : "**Leading Indicators:** Weekly active users, search queries per user, feature adoption rate (target: 80% within 3 months). **Lagging Indicators:** 20% reduction in average search time, 15% improvement in prior art relevance, examination quality scores. **Baseline:** Current average search time is 45 minutes per case. **Timeline:** Measure leading indicators monthly, lagging indicators quarterly over 12 months.",
    },
    10: {
      feedback:
        "Good identification of key factors. Consider being more specific about organizational dependencies, OKR alignment, and proactive risk mitigation strategies.",
      suggestion: userInput
        ? `${userInput} Ensure clear alignment with USPTO's strategic OKRs around operational excellence and examination quality.`
        : "**Dependencies:** Requires IT Security approval (3-4 weeks), integration with Patent Center APIs, and coordination with Training & Development team for user onboarding. **Alignment:** Directly supports USPTO OKR 2.1 (Improve examination efficiency) and OKR 3.2 (Enhance data-driven decision making). **Risks:** Mitigate potential user resistance through early stakeholder engagement and pilot program with volunteer examiners.",
    },
  }

  return (
    mockResponses[step as keyof typeof mockResponses] || {
      feedback: `Your input for ${stepTitle} looks good. Consider adding more specific details and measurable outcomes to strengthen your response.`,
      suggestion: userInput
        ? `${userInput} [Enhanced with additional context and specificity]`
        : `[Mock suggestion for ${stepTitle}]`,
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
    3: `Format your suggestion as 2-3 clear sentences describing the specific problem with data about why it matters (severity, mission impact, consequences of inaction).`,
    4: `Format your suggestion as a concise description of the proposed AI/ML solution with 2-3 bullet points for core functionality.`,
    5: `Format your suggestion as 2-3 sentences with specific, measurable user benefits. Include quantified improvements where possible.`,
    6: `Format your suggestion as 2-3 sentences with quantified efficiency gains, quality impact, and strategic alignment.`,
    7: `Format your suggestion as 2-3 sentences describing alignment with USPTO OKRs and strategic priorities.`,
    8: `Format your suggestion with bullet points covering: **Technical Feasibility** (data availability, technical complexity), **Security & Compliance** (FedRAMP, accessibility, privacy), **Resources** (team skills, infrastructure needs), and **Primary Risks** with mitigation strategies.`,
    9: `Format your suggestion with bullet points for: **Leading Indicators** (early success signals), **Lagging Indicators** (long-term outcomes), **Baseline Measurements** (current state), and **Timeline** (realistic measurement periods).`,
    10: `Format your suggestion as 2-3 sentences describing key **dependencies** (technical, organizational, approval), **alignment** with USPTO OKRs, and **risks** with mitigation strategies.`,
  }

  try {
    const { object } = await generateObject({
      model: "anthropic/claude-sonnet-4.5",
      schema: z.object({
        feedback: z.string().describe("Constructive feedback in 2-3 sentences"),
        suggestion: z
          .string()
          .describe("Enhanced version of user input in markdown format, following step-specific formatting guidelines"),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior product manager with deep expertise in both business strategy and technology implementation, specializing in AI/ML product development at USPTO.

TONE & STYLE:
- Be professional yet friendly and approachable
- Focus on what's working well before suggesting improvements
- Provide actionable, specific feedback rather than vague suggestions
- Use clear, concise language with proper markdown formatting
- Encourage innovation while maintaining practicality

CURRENT CONTEXT:
- Step: ${currentStepInfo.title}
- Guidelines: ${currentStepInfo.guidelines}

FORMATTING REQUIREMENTS:
${stepFormattingGuidelines[step] || "Format your suggestion clearly and concisely."}

Use markdown formatting:
- Use **bold** for emphasis on key terms
- Use bullet points (- or *) for lists
- Use proper line breaks for readability
- Keep formatting clean and professional

YOUR TASK:
1. Analyze the user's input thoughtfully
2. Provide constructive feedback (2-3 sentences) that:
   - Acknowledges what they've done well
   - Identifies specific areas for improvement
   - Explains WHY improvements matter
3. Create an enhanced version of their input that:
   - Follows the step-specific formatting guidelines above
   - Uses markdown formatting for clarity
   - Preserves their core ideas and voice
   - Adds specificity, metrics, and concrete details
   - Aligns with USPTO priorities and best practices
   - Is ready to paste into their submission

Remember: Your goal is to help them succeed while teaching them what makes a strong business case.`,
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
