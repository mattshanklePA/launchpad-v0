"use server"

// Server action for RD-4's dedicated duplicate-cluster page: an advisory
// keep-separate/consolidate read on a rationalization cluster, same
// generateObject + fallback pattern as assessReadiness (app/actions.ts).
// Advisory only — the reviewer still makes the call via
// lib/rationalizationActions.ts; this never writes anything.

import { generateObjectResilient } from "@/lib/aiResilience"
import { getModel } from "@/lib/modelProvider"
import { REVIEWER_UP, requireActionSession } from "@/lib/session/guard"
import { createHash } from "node:crypto"
import { z } from "zod"
import { getSupabaseAdmin, type DbSubmissionRow } from "@/lib/supabaseClient"
import { submissionFromRow } from "@/lib/submissionFromRow"
import { visibleToSession } from "@/lib/serverAccess"
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

// Answers are kept by every member id plus a fingerprint of the content the
// prompt is built from (FIX-5, #352) — so revisiting is instant, but a different
// group, or an idea edited since, never gets another group's answer.
const cache = new Map<string, ClusterAssessment>()

function cacheKey(members: Submission[], dossier: string): string {
  const ids = members.map((s) => s.id).sort().join(",")
  return `${ids}:${createHash("sha256").update(dossier).digest("hex")}`
}

// Loads the ideas by id on the server. Returns null unless every id is a known
// idea in the caller's scope, and there are at least two of them.
async function loadScopedMembers(ids: unknown, session: Parameters<typeof visibleToSession>[1]): Promise<Submission[] | null> {
  if (!Array.isArray(ids) || ids.length < 2 || ids.some((id) => typeof id !== "string" || !id)) return null
  const unique = [...new Set(ids as string[])].sort() // one order, so the prompt and the key do not depend on call order
  if (unique.length < 2) return null
  try {
    const { data, error } = await getSupabaseAdmin().from("submissions").select("*").in("id", unique)
    if (error) throw error
    const loaded = ((data || []) as DbSubmissionRow[]).map(submissionFromRow)
    const inScope = visibleToSession(loaded, session)
    if (inScope.length !== unique.length) return null
    const byId = new Map(inScope.map((s) => [s.id, s]))
    return unique.map((id) => byId.get(id)).filter((s): s is Submission => !!s)
  } catch (error) {
    console.error("assessCluster: could not load the ideas:", error)
    return null
  }
}

export async function assessCluster(memberIds: string[]): Promise<ClusterAssessment> {
  const session = requireActionSession({ role: REVIEWER_UP }) // before the cache: a cached result must not leak
  const members = await loadScopedMembers(memberIds, session)
  if (!members) return clusterFallback()

  const dossier = members.map((s, i) => summarizeMember(s, i)).join("\n")
  const key = cacheKey(members, dossier)
  const cached = cache.get(key)
  if (cached) return cached

  const tenant = getTenant()

  let result: ClusterAssessment
  try {
    const { object } = await generateObjectResilient("assessCluster", {
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
    return clusterFallback() // never cached: the next call tries again
  }

  cache.set(key, result)
  return result
}
