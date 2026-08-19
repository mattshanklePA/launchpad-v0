"use server"

// Server action for RD-4's dedicated duplicate-cluster page: an advisory
// keep-separate/consolidate read on a rationalization cluster, same
// generateObject + fallback pattern as assessReadiness (app/actions.ts).
// Advisory only — the reviewer still makes the call via
// lib/rationalizationActions.ts; this never writes anything.

import { generateObject } from "ai"
import { getModel } from "@/lib/modelProvider"
import { z } from "zod"
import type { Submission } from "@/lib/submissions"
import { getTenant } from "@/lib/tenant"
import { businessUnitLabel } from "@/lib/reviewWorkflow"
import { clusterFallback, type ClusterAssessment } from "@/lib/clusterFallback"

function fmt(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "(not provided)"
  return v && v.trim() !== "" ? v : "(not provided)"
}

function summarizeMember(s: Submission, idx: number): string {
  const d = s.formData
  return `
=== USE CASE ${idx + 1}: ${d.useCaseTitle || "Untitled"} (id: ${s.id}) ===
Program office: ${fmt(d.submitterOffice ? businessUnitLabel(d.submitterOffice) : undefined)}
Problem: ${fmt(d.problemDefinition || d.coreProblem)}
Solution: ${fmt(d.solutionSummary || d.proposedSolution)}
Target audience: ${fmt(d.targetAudience)}
Users impacted: ${fmt(d.impactedUsersCount)}
Value to users: ${fmt(d.userValue)}
Value to the business: ${fmt(d.businessValue)}
`
}

// Cluster id (the smallest member id, per lib/rationalization.ts's
// RationalizationCluster.id) + member count — "so revisiting is instant"
// without threading the cluster id through this action's own signature.
const cache = new Map<string, ClusterAssessment>()

function cacheKey(members: Submission[]): string {
  const clusterId = [...members.map((s) => s.id)].sort()[0] || ""
  return `${clusterId}:${members.length}`
}

export async function assessCluster(members: Submission[]): Promise<ClusterAssessment> {
  const key = cacheKey(members)
  const cached = cache.get(key)
  if (cached) return cached

  const tenant = getTenant()
  const dossier = members.map((s, i) => summarizeMember(s, i)).join("\n")

  let result: ClusterAssessment
  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: z.object({
        recommendation: z
          .enum(["keep_separate", "consolidate"])
          .describe("Whether these use cases should stay separate governance records or be consolidated under one lead."),
        headline: z.string().describe("The recommendation in one short sentence, 12 words or fewer."),
        reasons: z
          .array(z.string())
          .length(3)
          .describe("Exactly three one-sentence reasons for the recommendation, grounded in what the use cases actually say."),
        tradeoff: z.string().describe("One sentence: what the other choice (the one not recommended) would cost."),
      }),
      messages: [
        {
          role: "system",
          content: `You are ${tenant.assistantName}, advising a ${tenant.shortName} reviewer who is deciding whether a cluster of ${members.length} flagged-as-duplicate AI use cases should be consolidated under one lead or kept as separate governance records. You are ADVISORY ONLY — the reviewer decides; never imply otherwise.

Base every claim strictly on the use cases given below. Never invent numbers, named systems, or evidence the text does not contain. Write in sentence case, with no exclamation marks. Keep every field short and concrete — no filler, no hedging.

Weigh: how much of the similarity is really the same problem vs. just a similar solution approach; whether the use cases serve the same users and approval chain or different ones; and what is lost by merging (each program office's own governance record) versus what is lost by keeping them apart (a shared piece of work tracked twice).`,
        },
        {
          role: "user",
          content: `Cluster of ${members.length} flagged-as-duplicate use cases:\n${dossier}\n\nRecommend keep_separate or consolidate.`,
        },
      ],
    })
    result = {
      recommendation: object.recommendation,
      headline: object.headline.trim(),
      reasons: object.reasons.map((r) => r.trim()),
      tradeoff: object.tradeoff.trim(),
    }
  } catch (error) {
    console.error("assessCluster: AI Gateway error, falling back to mock:", error)
    result = clusterFallback()
  }

  cache.set(key, result)
  return result
}
