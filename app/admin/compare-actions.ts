"use server"

// Server action: generate an executive comparative briefing across
// 2-4 submissions for funding-decision support.
// Same anti-fabrication ethic as the per-step coach: synthesizes
// only what the submissions actually contain, names gaps honestly.

import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import type { Submission } from "@/lib/submissions"

export type Verdict = "fund_now" | "fund_with_conditions" | "hold"

export type CompareBriefing = {
  recommendation: { fundId: string; headline: string }
  differ: string
  portfolioGap: string
  perSubmission: Array<{
    id: string
    title: string
    verdict: Verdict
    oneLine: string
    gap: string
  }>
}

const USPTO_STRATEGIC_CONTEXT = `
USPTO operates under two published strategic frameworks. Funding decisions should advance at least one priority from these:

**2022-2026 Strategic Plan goals:**
- Drive inclusive U.S. innovation and global competitiveness
- Promote the efficient delivery of reliable IP rights
- Promote the protection of IP against new and persistent threats
- Bring innovation to impact for the public good
- Generate impactful employee and customer experiences by maximizing agency operations

**AI Strategy (January 2025) priorities:**
- Advance IP policies for inclusive AI innovation
- Enhance AI capabilities through infrastructure and resources
- Promote responsible AI use (bias mitigation, explainability, human oversight)
- Develop AI expertise within the workforce
- Collaborate with governmental and international partners on AI
`

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
        recommendation: z.object({
          fundId: z.string().describe("The id of the single best candidate to fund first. Empty string if none are ready to fund yet."),
          headline: z.string().describe("One short sentence (about 20 words): who to fund first and the single biggest reason. If none are ready, say so plainly."),
        }),
        differ: z.string().describe("ONE short sentence on how the candidates differ (e.g., different user groups, or different points in the same workflow)."),
        portfolioGap: z.string().describe("ONE short sentence naming the most important thing missing across all of them (e.g., 'none provide baseline data to verify ROI')."),
        perSubmission: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              verdict: z.enum(["fund_now", "fund_with_conditions", "hold"]).describe("fund_now = clear, ready case; fund_with_conditions = worth funding but only after specific fixes; hold = not ready to fund yet"),
              oneLine: z.string().describe("About 15 words: what it is and the priority it advances most directly."),
              gap: z.string().describe("About 15 words: the single most important thing it does not address before funding. Be honest; do not invent."),
            }),
          )
          .describe("One entry per submission, in the same order as the dossier."),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior AI strategist at USPTO supporting a CIO/CAIO funding decision. You are NOT here to pitch the submissions — you are here to help the exec make a clear-eyed comparison.

${USPTO_STRATEGIC_CONTEXT}

═══ ABSOLUTE ANTI-FABRICATION RULES ═══
- NEVER invent specific numbers, named organizational units, evidence sources, or timelines a submission did not include
- NEVER assert strategic alignment a submission did not explicitly claim
- If a submission's claims are vague or unsupported, say so honestly — that's decision-useful information
- Reference USPTO priorities by name (e.g., "efficient delivery of reliable IP rights"), not by number
- Submissions may come from any part of USPTO and target any user group (examiners, IT, OGC, applicants, the public, etc.) — do not default to "examiners"

═══ EVALUATION LENSES (apply implicitly, do not call out by name) ═══
For each submission, the comparison should help the exec understand:
- Is the user demand real and observable? (or speculative?)
- Will the target users actually be able to use it? (workflow fit, training overhead)
- Can USPTO actually build and integrate it? (FedRAMP/ATO, data access, vendor dependencies, technical complexity)
- Can USPTO sustain it operationally? (procurement, ops, change management, ROI under federal cost realities)

Surface these dimensions through your narrative and per-submission gaps — do not label them with technical terms.

═══ YOUR TASK ═══
Read the dossier of ${submissions.length} submissions below. Be brief and decision-first — an exec should grasp the call in five seconds, then skim the rest. Produce:
1. RECOMMENDATION — the single best candidate to fund first (by id) and one short sentence on why. If none are ready, say so plainly.
2. PER-SUBMISSION verdict — for each: fund_now / fund_with_conditions / hold, a tight one-liner, and the single most important gap before funding.
3. DIFFER — one sentence on how the candidates differ.
4. PORTFOLIO GAP — one sentence on the most important thing missing across all of them.

Keep every field short and concrete. Do not write paragraphs. Use the submissions' own facts; name gaps honestly.`,
        },
        {
          role: "user",
          content: `Compare the following ${submissions.length} USPTO AI use case submissions:\n${dossier}`,
        },
      ],
    })

    return {
      recommendation: object.recommendation,
      differ: object.differ,
      portfolioGap: object.portfolioGap,
      perSubmission: object.perSubmission,
    }
  } catch (error) {
    console.error("compareSubmissions AI error, falling back to mock briefing:", error)
    return {
      recommendation: { fundId: "", headline: "Briefing service unavailable. Use the side-by-side comparison below to decide manually." },
      differ: "(Briefing unavailable.)",
      portfolioGap: "Review each candidate for baseline data, FedRAMP/ATO timing, and named priority alignment.",
      perSubmission: submissions.map((s) => ({
        id: s.id,
        title: s.formData.useCaseTitle || "Untitled idea",
        verdict: "hold" as const,
        oneLine: "AI briefing unavailable — review the submission detail.",
        gap: "AI synthesis unavailable.",
      })),
    }
  }
}
