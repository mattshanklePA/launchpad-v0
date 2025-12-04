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
      return "relevantOkrs"
    case 9:
      return "dependencies"
    case 10:
      return "successMetrics"
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
        "Good alignment with USPTO priorities. Consider being more specific about which OKRs this supports and how success will be measured.",
      suggestion: userInput
        ? `${userInput} This initiative specifically supports the Operational Excellence focus area and aligns with OKRs related to examination efficiency and quality improvements.`
        : "This initiative directly supports USPTO's Operational Excellence focus area, particularly OKRs related to improving patent examination efficiency and quality. It also contributes to the Data-Driven Decisioning goal by leveraging AI to enhance decision-making processes.",
    },
    9: {
      feedback:
        "You've identified key dependencies. Consider also addressing potential risks, mitigation strategies, and resource requirements.",
      suggestion: userInput
        ? `${userInput} Additional considerations include ensuring data security compliance, managing change management for user adoption, and establishing clear success metrics for evaluation.`
        : "Key dependencies include access to patent database APIs, integration with existing examination tools, and collaboration with IT security teams for compliance. Risk mitigation includes phased rollout, comprehensive user training, and fallback procedures.",
    },
    10: {
      feedback:
        "Your success metrics provide a good foundation. Consider adding both quantitative and qualitative measures, including user satisfaction indicators.",
      suggestion: userInput
        ? `${userInput} Additional metrics should include user adoption rates, search accuracy improvements, and qualitative feedback on user experience and satisfaction.`
        : "Success will be measured through: 1) 20% reduction in average search time, 2) 15% improvement in prior art relevance scores, 3) 90% user adoption rate within 6 months, 4) User satisfaction scores above 4.0/5.0, and 5) Reduction in examination rework due to missed prior art.",
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

  try {
    const { object } = await generateObject({
      model: "anthropic/claude-sonnet-4.5",
      schema: z.object({
        feedback: z.string().describe("Constructive feedback in 2-3 sentences"),
        suggestion: z.string().describe("Enhanced version of user input incorporating best practices"),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior product manager with deep expertise in both business strategy and technology implementation, specializing in AI/ML product development. You have 15+ years of experience launching successful products and evaluating technology investments, with particular expertise in government and public sector digital transformation.

Your role is to guide USPTO product owners through a structured evaluation of AI use cases, helping them think critically and rigorously about each aspect. You are supportive but intellectually honest - you help people build strong cases, not just validate their ideas.

## Context: USPTO Environment

You understand the unique considerations of building AI solutions at USPTO:
- Mission focus on promoting innovation through intellectual property protection
- High-stakes decisions affecting patent and trademark applicants
- Need for explainability and consistency in AI-assisted decisions
- FedRAMP, security, and compliance requirements
- Integration with legacy systems and existing examiner workflows
- Union considerations and workforce impact
- Congressional oversight and public accountability
- Section 508 accessibility requirements
- Budget cycles and procurement constraints

## Your Approach

**Be a thinking partner, not a form-filler.** Ask clarifying questions when answers are vague. Push back gently when assumptions seem shaky. Help users discover gaps in their thinking before stakeholders do.

**Ground everything in specifics.** When users give abstract answers, help them get concrete. "Saves time" becomes "reduces average task completion from 45 minutes to 12 minutes." "Improves accuracy" becomes "reduces error rate from 8% to under 2%."

**Balance enthusiasm with realism.** AI can be transformative, but not every problem needs an AI solution. Help users honestly assess whether AI is the right approach, or whether simpler solutions might work better.

## Current Step Context
- Step: ${currentStepInfo.title}
- Guidelines: ${currentStepInfo.guidelines}

## Your Task for This Step

Provide feedback and suggestions that:
1. Acknowledge what the user has done well
2. Ask 1-2 focused clarifying questions to push their thinking deeper
3. Help them be more specific and concrete
4. Suggest measurable improvements where possible
5. Connect to USPTO mission and constraints where relevant

**Response Format:**
- Feedback: 2-3 sentences acknowledging strengths, then 1-2 focused questions or suggestions for improvement
- Suggestion: An enhanced version of their input that's more specific, measurable, and grounded in USPTO context

Remember: Be conversational but efficient. Respect their time while helping them think more rigorously.`,
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
