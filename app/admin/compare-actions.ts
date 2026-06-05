"use server"

// Server action: generate an executive comparative briefing across
// 2-4 submissions for funding-decision support.
// Same anti-fabrication ethic as the per-step coach: synthesizes
// only what the submissions actually contain, names gaps honestly.

import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import type { Submission } from "@/lib/submissions"
import { getTenant } from "@/lib/tenant"

export type CompareBriefing = {
  narrative: string
  portfolioTake: string
  unaddressedGaps: string
  perSubmission: Array<{
    id: string
    title: string
    oneLine: string
    whatItDoesNotAddress: string
  }>
}

const STRATEGIC_CONTEXT = getTenant().strategicContext

function fmt(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "(none)"
  return v && v.trim() !== "" ? v : "(not provided)"
}

function summarizeSubmission(s: Submission, idx: number): string {
  const d = s.formData
  return `
=== CANDIDATE ${idx + 1}: ${d.useCaseTitle || "Untitled"} (id: ${s.id}) ===
Submitted by: ${fmt(d.submitterName)} (${fmt(d.submitterRole)} in ${fmt(d.submitterOffice)})
Submitted: ${s.submittedAt}
Readiness verdict: ${fmt(d.readinessScore)}
Readiness summary: ${fmt(d.readinessSummary)}
Executive summary: ${fmt(d.executiveSummary)}

Description: ${fmt(d.useCaseDescription)}
Public/Excluded: ${fmt(d.publicIndicator)}

Target users:
  - Audience: ${fmt(d.targetAudience)}
  - Impacted count: ${fmt(d.impactedUsersCount)}
  - Pain points: ${fmt(d.painPoints)}
  - User profile: ${fmt(d.targetUserContext)}
  - Refined summary: ${fmt(d.targetUserSummary)}

Problem:
  - Core: ${fmt(d.coreProblem)}
  - Impact: ${fmt(d.problemImpact)}
  - System affected: ${fmt(d.affectedSystem)}
  - Type tags: ${fmt(d.problemType)}
  - Severity: ${fmt(d.severity)}
  - Definition: ${fmt(d.problemDefinition)}

Solution:
  - Proposed: ${fmt(d.proposedSolution)}
  - Key functionality: ${fmt(d.keyFunctionality)}
  - Summary: ${fmt(d.solutionSummary)}

User value:
  - Statement: ${fmt(d.userValue)}
  - Time savings range: ${fmt(d.userTimeSavings)}
  - Other improvements: ${fmt(d.otherUserImprovements)}
  - Summary: ${fmt(d.userValueSummary)}

Business value:
  - Statement: ${fmt(d.businessValue)}
  - Cost savings range: ${fmt(d.costSavings)}
  - Strategic benefit tags: ${fmt(d.strategicBenefit)}
  - Summary: ${fmt(d.businessValueSummary)}

Strategic alignment:
  - Focus areas: ${fmt(d.usptoFocusArea)}
  - Relevant OKRs: ${fmt(d.relevantOkrs)}
  - Summary: ${fmt(d.alignmentSummary)}

Feasibility & security:
  - Complexity: ${fmt(d.implementationComplexity)}
  - Resources needed: ${fmt(d.resourcesNeeded)}
  - Dependencies: ${fmt(d.dependencies)}
  - Sensitive data: ${fmt(d.involvesSensitiveData)}
  - Security classification: ${fmt(d.securityClassification)}
  - Access control: ${fmt(d.accessControlRequirements)}
  - Summary: ${fmt(d.feasibilitySummary)}

Success metrics:
  - Statement: ${fmt(d.successMetrics)}
  - Key metrics tags: ${fmt(d.keyMetrics)}
  - Timeline: ${fmt(d.timelineForResults)}
  - Summary: ${fmt(d.metricsSummary)}

Routing intent: ${fmt(d.routeTo)}
Reviewer notes: ${fmt(d.reviewerNotes)}
`
}

export async function compareSubmissions(submissions: Submission[]): Promise<CompareBriefing> {
  if (!Array.isArray(submissions) || submissions.length < 2) {
    throw new Error("Need at least 2 submissions to compare.")
  }
  if (submissions.length > 4) {
    submissions = submissions.slice(0, 4)
  }

  const dossier = submissions.map((s, i) => summarizeSubmission(s, i)).join("\n")

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5-20250929"),
      schema: z.object({
        narrative: z
          .string()
          .describe(
            "A comparative narrative (3-5 sentences). How do these candidates differ in approach, target users, expected impact, and strategic priorities? Where do they overlap or compete? Reference DoW priorities by name.",
          ),
        portfolioTake: z
          .string()
          .describe(
            "A funding take: if budget supported only one, which has the clearest case and why? If two or three, which combination is complementary (advances different priorities, hits different user groups)? Be specific about which candidate by title. If none are ready to fund yet, say so honestly.",
          ),
        unaddressedGaps: z
          .string()
          .describe(
            "What's NOT in the portfolio. Which DoW strategic priorities are these candidates collectively missing? What common gaps appear across multiple submissions (e.g., 'none of these address FedRAMP/ATO timing', 'none have baseline data')?",
          ),
        perSubmission: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              oneLine: z.string().describe("One sentence: what this is and the named DoW priority it advances most directly."),
              whatItDoesNotAddress: z
                .string()
                .describe(
                  "1-2 sentences: what THIS submission specifically does not address that a reviewer would want before funding. Be honest. Use the submission's actual gaps — do not invent.",
                ),
            }),
          )
          .describe("One entry per submission, in the same order as the dossier."),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior AI strategist at DoW supporting a CIO/CAIO funding decision. You are NOT here to pitch the submissions — you are here to help the exec make a clear-eyed comparison.

${STRATEGIC_CONTEXT}

═══ ABSOLUTE ANTI-FABRICATION RULES ═══
- NEVER invent specific numbers, named organizational units, evidence sources, or timelines a submission did not include
- NEVER assert strategic alignment a submission did not explicitly claim
- If a submission's claims are vague or unsupported, say so honestly — that's decision-useful information
- Reference DoW priorities by name (e.g., "efficient delivery of reliable IP rights"), not by number
- Submissions may come from any part of DoW and target any user group (examiners, IT, OGC, applicants, the public, etc.) — do not default to "examiners"

═══ EVALUATION LENSES (apply implicitly, do not call out by name) ═══
For each submission, the comparison should help the exec understand:
- Is the user demand real and observable? (or speculative?)
- Will the target users actually be able to use it? (workflow fit, training overhead)
- Can DoW actually build and integrate it? (FedRAMP/ATO, data access, vendor dependencies, technical complexity)
- Can DoW sustain it operationally? (procurement, ops, change management, ROI under federal cost realities)

Surface these dimensions through your narrative and per-submission gaps — do not label them with technical terms.

═══ YOUR TASK ═══
Read the dossier of ${submissions.length} submissions below. Then produce:
1. A comparative NARRATIVE — how do they differ, where do they overlap, which advances which DoW priority most directly
2. A PORTFOLIO TAKE — funding recommendation grounded in what the submissions actually show (or honest acknowledgment that more work is needed)
3. UNADDRESSED GAPS — what DoW priorities aren't represented; what common weaknesses appear across multiple candidates
4. PER-SUBMISSION snapshot — one-liner + specific gaps not addressed in that submission

Tone: rigorous, honest, decision-useful. An exec should be able to read this and confidently make a funding call (or confidently say "not yet, here's what I need first").`,
        },
        {
          role: "user",
          content: `Compare the following ${submissions.length} DoW AI use case submissions:\n${dossier}`,
        },
      ],
    })

    return {
      narrative: object.narrative,
      portfolioTake: object.portfolioTake,
      unaddressedGaps: object.unaddressedGaps,
      perSubmission: object.perSubmission,
    }
  } catch (error) {
    console.error("compareSubmissions AI error, falling back to mock briefing:", error)
    return {
      narrative:
        "(AI briefing temporarily unavailable.) These submissions span different parts of the DoW portfolio. A comparative analysis requires review of each candidate's target users, strategic priority advanced, and feasibility posture. Manual review recommended in the interim.",
      portfolioTake:
        "Unable to generate a portfolio take without AI synthesis. Recommend deferring funding decision until briefing service is available, or conducting manual side-by-side review using the candidate detail cards.",
      unaddressedGaps:
        "(Briefing unavailable.) Review each candidate manually for: FedRAMP/ATO timing, named DoW priority alignment, observable evidence of user demand, and quantified expected impact.",
      perSubmission: submissions.map((s) => ({
        id: s.id,
        title: s.formData.useCaseTitle || "Untitled idea",
        oneLine: "AI briefing unavailable — review submission detail.",
        whatItDoesNotAddress: "AI briefing unavailable — review submission detail for specific gaps.",
      })),
    }
  }
}
