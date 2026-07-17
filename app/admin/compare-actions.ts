"use server"

// Server action: generate an executive comparative briefing across 2-4
// submissions for a funding decision. Decision-first (a recommendation + a
// verdict and the one gap that matters per candidate), not a wall of text.
// Tenant-neutral: all org-specific framing comes from getTenant(), so this
// reads correctly for USPTO, DoC, DoW, or any future tenant.

import { generateObject } from "ai"
import { getModel } from "@/lib/modelProvider"
import { z } from "zod"
import type { Submission } from "@/lib/submissions"
import { getTenant } from "@/lib/tenant"

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

function fmt(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "(none)"
  return v && v.trim() !== "" ? v : "(not provided)"
}

function clip(s: string | undefined, n: number): string {
  const t = (s || "").trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}

function firstSentence(s: string | undefined): string {
  const t = (s || "").trim()
  if (!t) return ""
  const m = t.match(/^.*?[.!?](\s|$)/)
  return (m ? m[0] : t).trim()
}

// Coerce a loosely-phrased model verdict ("Fund now", "fund-with-conditions",
// "HOLD") into our enum so a minor wording wobble doesn't blank the briefing.
function normalizeVerdict(v: string | undefined): Verdict {
  const s = (v || "").toLowerCase().replace(/[^a-z]/g, "_")
  if (s.includes("condition")) return "fund_with_conditions"
  if (s.startsWith("fund")) return "fund_now"
  return "hold"
}

function verdictFromReadiness(score: string | undefined): Verdict {
  if (score === "ready") return "fund_now"
  if (score === "needs_work") return "fund_with_conditions"
  return "hold"
}

// Synthesize a populated, sensible briefing from each submission's own readiness
// verdict + executive summary. Used as the fallback when the AI call fails or
// returns an unparseable object, so the Decision Center always shows a real
// recommendation instead of an error/empty state.
function heuristicBriefing(subs: Submission[]): CompareBriefing {
  const rank: Record<string, number> = { ready: 3, needs_work: 2, early_stage: 1 }
  const perSubmission = subs.map((s) => {
    const d = s.formData
    const oneLine =
      clip(firstSentence(d.executiveSummary) || d.solutionSummary || d.businessValueSummary || d.useCaseDescription, 170) ||
      "Review the submission detail."
    const gap =
      d.readinessScore === "ready"
        ? "No blocking gap noted; confirm a measured baseline before scaling."
        : clip(firstSentence(d.readinessSummary), 170) || "Needs a measured baseline before funding."
    return {
      id: s.id,
      title: d.useCaseTitle || "Untitled idea",
      verdict: verdictFromReadiness(d.readinessScore),
      oneLine,
      gap,
    }
  })
  const sorted = [...subs].sort(
    (a, b) => (rank[b.formData.readinessScore || ""] || 0) - (rank[a.formData.readinessScore || ""] || 0),
  )
  const best = sorted[0]
  const fundId = (rank[best?.formData.readinessScore || ""] || 0) >= 2 ? best.id : ""
  const fundTitle = subs.find((s) => s.id === fundId)?.formData.useCaseTitle
  return {
    recommendation: {
      fundId,
      headline: fundId
        ? `Fund ${fundTitle} first — it is the most decision-ready of the set.`
        : "None are clearly ready to fund yet — tighten the gaps below before committing.",
    },
    differ: "The candidates target different users or different points in the same workflow.",
    portfolioGap: "Confirm a measured baseline and named priority alignment for each before final funding.",
    perSubmission,
  }
}

function summarizeSubmission(s: Submission, idx: number): string {
  const d = s.formData
  return `
=== CANDIDATE ${idx + 1}: ${d.useCaseTitle || "Untitled"} (id: ${s.id}) ===
Submitted by: ${fmt(d.submitterName)} (${fmt(d.submitterRole)} in ${fmt(d.submitterOffice)})
Client sponsor: ${fmt(d.sponsorName)} (${fmt(d.sponsorRole)})
Submitted: ${s.submittedAt}
Readiness verdict: ${fmt(d.readinessScore)}
Readiness summary: ${fmt(d.readinessSummary)}
Executive summary: ${fmt(d.executiveSummary)}

Description: ${fmt(d.useCaseDescription)}
Withheld from public reporting: ${fmt(d.isWithheld)}

Target users:
  - Audience: ${fmt(d.targetAudience)}
  - Impacted count: ${fmt(d.impactedUsersCount)}
  - Pain points: ${fmt(d.painPoints)}
  - User profile: ${fmt(d.targetUserContext)}
  - Refined summary: ${fmt(d.targetUserSummary)}

Problem:
  - Core: ${fmt(d.coreProblem)}
  - Impact: ${fmt(d.problemImpact)}
  - Business units affected: ${fmt(d.affectedBusinessUnits)}
  - Type tags: ${fmt(d.problemType)}
  - Severity: ${fmt(d.severity)}
  - Definition: ${fmt(d.problemDefinition)}

Solution:
  - Proposed: ${fmt(d.proposedSolution)}
  - Key functionality: ${fmt(d.keyFunctionality)}
  - Summary: ${fmt(d.solutionSummary)}
  - Internal or external: ${fmt(d.deliveryAudience)}

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
  - Data readiness: ${fmt(d.dataReadiness)}
  - Data classification / Impact Level: ${fmt(d.impactLevel)}
  - Technology Readiness Level (1-9): ${fmt(d.trl)}
  - AI decisional impact on people: ${fmt(d.aiDecisionalImpact)}
  - Model sourcing: ${fmt(d.aiModelSourcing)}
  - Mandatory human review: ${fmt(d.aiHumanReview)}
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

  const tenant = getTenant()
  const dossier = submissions.map((s, i) => summarizeSubmission(s, i)).join("\n")

  try {
    const { object } = await generateObject({
      model: getModel(),
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
              verdict: z.string().describe("Exactly one of these tokens: \"fund_now\" (clear, ready case), \"fund_with_conditions\" (worth funding but only after specific fixes), or \"hold\" (not ready to fund yet)."),
              oneLine: z.string().describe("About 15 words: what it is and the priority it advances most directly."),
              gap: z.string().describe("About 15 words: the single most important thing it does not address before funding. Be honest; do not invent."),
            }),
          )
          .describe("One entry per submission, in the same order as the dossier."),
      }),
      messages: [
        {
          role: "system",
          content: `You are a senior AI strategist at ${tenant.shortName} supporting a CIO/CAIO funding decision. You are NOT here to pitch the submissions — you are here to help the exec make a clear-eyed comparison.

${tenant.strategicContext}

═══ ABSOLUTE ANTI-FABRICATION RULES ═══
- NEVER invent specific numbers, named organizational units, evidence sources, or timelines a submission did not include
- NEVER assert strategic alignment a submission did not explicitly claim
- If a submission's claims are vague or unsupported, say so honestly — that's decision-useful information
- Reference ${tenant.shortName}'s published priorities by name, not by number
- Submissions may come from any part of ${tenant.shortName} and target any user group — do not default to one group

═══ EVALUATION LENSES (apply implicitly, do not call out by name) ═══
For each submission, the comparison should help the exec understand:
- Is the user demand real and observable, or speculative?
- Will the target users actually be able to use it? (workflow fit, training overhead)
- Can it actually be built and integrated? (authorization/ATO, data access, vendor dependencies, technical complexity)
- Can it be sustained operationally? (procurement, ops, change management, ROI under federal cost realities)
- Risk posture, per ${tenant.riskFramework.label}: ${tenant.riskFramework.description}

Surface these dimensions through the recommendation and per-submission gaps — do not label them with technical terms.

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
          content: `Compare the following ${submissions.length} ${tenant.shortName} AI use case submissions:\n${dossier}`,
        },
      ],
    })

    // Normalize the model output: align one entry per submission (by id), coerce
    // the verdict to our enum even if the model phrased it loosely, and drop a
    // fundId that doesn't point at a real candidate. Keeps a minor schema wobble
    // from blanking the whole briefing.
    const byId = new Map(object.perSubmission.map((p) => [p.id, p]))
    const perSubmission = submissions.map((s) => {
      const p = byId.get(s.id)
      return {
        id: s.id,
        title: s.formData.useCaseTitle || p?.title || "Untitled idea",
        verdict: normalizeVerdict(p?.verdict),
        oneLine: (p?.oneLine || "").trim() || firstSentence(s.formData.executiveSummary) || "Review the submission detail.",
        gap: (p?.gap || "").trim() || "Confirm a measured baseline before funding.",
      }
    })
    const fundIdValid = perSubmission.some((p) => p.id === object.recommendation?.fundId)
    return {
      recommendation: {
        fundId: fundIdValid ? object.recommendation.fundId : "",
        headline:
          (object.recommendation?.headline || "").trim() ||
          "See each candidate's verdict and the gap that matters most below.",
      },
      differ: (object.differ || "").trim() || "The candidates target different users or points in the same workflow.",
      portfolioGap:
        (object.portfolioGap || "").trim() ||
        "Confirm a measured baseline and named priority alignment for each before final funding.",
      perSubmission,
    }
  } catch (error) {
    // Don't blank the briefing on an AI/schema hiccup — synthesize a populated,
    // sensible briefing from each submission's own readiness verdict and summary.
    console.error("compareSubmissions AI error, using heuristic briefing:", error)
    return heuristicBriefing(submissions)
  }
}
