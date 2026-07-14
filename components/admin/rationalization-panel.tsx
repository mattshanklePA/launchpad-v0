"use client"

// "One Commerce" rationalization panel — lists each lib/rationalization.ts
// duplicate cluster visible to the viewer (members, bureaus, similarity) and
// lets whoever has decision authority over a cluster (canRationalizeCluster)
// decide it: pick a lead use case and consolidate the rest into it, or mark
// it keep-separate. Until a cluster is decided, its member submissions are
// blocked from approval (see components/submissions/submission-detail.tsx's
// Approve gate).
//
// Detection scope follows the viewer (issue #68): the `submissions` prop is
// already the viewer's visible set (`visibleSubmissions`, passed by the
// caller), so a bureau reviewer only ever sees `intra_bureau` clusters within
// their own bureau, while a department-level viewer sees both `intra_bureau`
// and `cross_bureau` clusters. `canRationalizeCluster` is still enforced here
// (hiding/disabling the decision control) and in `decide()` as defense in
// depth — a bureau reviewer must never be able to consolidate away another
// bureau's use case even via a cluster they can otherwise see.
//
// This is the duplicate-RATIONALIZATION axis (rationalizing duplicated
// effort) — distinct from BureauRollup's "Consolidated (OMB)" column, which
// is lib/ombConsolidation.ts's OMB CATEGORY axis (how a single use case is
// reported once vs. per-bureau). A submission can sit in a rationalization
// cluster and independently be OMB-Consolidated or -Individual; the two
// controls never collapse into one.
//
// No-op for tenants without a bureau tier (USPTO/DoW): clusterDuplicates()
// always returns [] for them, so this renders nothing.

import { useState } from "react"
import Link from "next/link"
import { Users, Check } from "lucide-react"
import { patchSubmissionFormData, type Submission } from "@/lib/submissions"
import { getBusinessUnit, businessUnitLabel } from "@/lib/reviewWorkflow"
import {
  clusterDuplicates,
  getRationalization,
  buildRationalizationPatch,
  canRationalizeCluster,
  type RationalizationCluster,
  type RationalizationDecision,
} from "@/lib/rationalization"
import { getSession } from "@/lib/auth"
import { useDataProvider } from "@/components/data-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const SCOPE_LABEL: Record<RationalizationCluster["scope"], string> = {
  intra_bureau: "Intra-bureau",
  cross_bureau: "Cross-bureau",
}

/** The decision recorded on this cluster's members, if any (every member carries the same record). */
function decisionFor(cluster: RationalizationCluster, byId: Map<string, Submission>) {
  const member = cluster.memberIds.map((id) => byId.get(id)).find((s): s is Submission => !!s)
  const decision = member ? getRationalization(member) : undefined
  return decision && decision.clusterId === cluster.id ? decision : undefined
}

export function RationalizationPanel({ submissions }: { submissions: Submission[] }) {
  const { refetchSubmissions } = useDataProvider()
  const [busyClusterId, setBusyClusterId] = useState<string | null>(null)
  const [leadChoice, setLeadChoice] = useState<Record<string, string>>({})

  const session = getSession()
  const viewer = session ? { role: session.role, businessUnit: session.businessUnit } : null

  const clusters = clusterDuplicates(submissions)
  if (clusters.length === 0) return null

  const byId = new Map(submissions.map((s) => [s.id, s]))
  const decidedCount = clusters.filter((c) => decisionFor(c, byId)).length

  const decide = async (cluster: RationalizationCluster, decision: RationalizationDecision) => {
    if (!canRationalizeCluster(cluster, viewer)) return
    const leadSubmissionId = decision === "consolidated" ? leadChoice[cluster.id] || cluster.memberIds[0] : undefined
    setBusyClusterId(cluster.id)
    const patch = buildRationalizationPatch(cluster, decision, {
      leadSubmissionId,
      decidedBy: session?.name || session?.email || "Reviewer",
      decidedAt: new Date().toISOString(),
    })
    await Promise.all(cluster.memberIds.map((id) => patchSubmissionFormData(id, patch)))
    await refetchSubmissions()
    setBusyClusterId(null)
  }

  return (
    <div id="rationalization" className="rounded-lg border bg-white p-4 space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-uspto-gray-text flex items-center gap-2">
          <Users className="w-4 h-4" />
          Duplicate rationalization
        </h2>
        <span className="text-xs text-muted-foreground">
          {clusters.length} duplicate cluster{clusters.length === 1 ? "" : "s"} · {decidedCount} rationalized
        </span>
      </div>

      <div className="space-y-3">
        {clusters.map((cluster) => {
          const decision = decisionFor(cluster, byId)
          const members = cluster.memberIds.map((id) => byId.get(id)).filter((s): s is Submission => !!s)
          const lead = decision?.leadSubmissionId ? byId.get(decision.leadSubmissionId) : undefined
          const selectedLead = leadChoice[cluster.id] || cluster.memberIds[0]
          const busy = busyClusterId === cluster.id
          const canDecide = canRationalizeCluster(cluster, viewer)

          return (
            <div
              key={cluster.id}
              className={`rounded-md border p-3 space-y-2 ${decision ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={decision ? "bg-green-100 text-green-800 border-green-300" : "bg-amber-100 text-amber-800 border-amber-300"}
                  >
                    {decision ? (decision.decision === "consolidated" ? "Consolidated" : "Keep separate") : "Rationalization pending"}
                  </Badge>
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent">
                    {SCOPE_LABEL[cluster.scope]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{Math.round(cluster.maxSimilarity * 100)}% match</span>
                </div>
                {decision && (
                  <span className="text-xs text-muted-foreground">
                    {decision.decision === "consolidated" && lead ? `Lead: ${lead.formData.useCaseTitle || "Untitled idea"} · ` : ""}
                    by {decision.decidedBy} on {new Date(decision.decidedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <ul className="space-y-1">
                {members.map((m) => (
                  <li key={m.id} className="text-sm flex items-center justify-between gap-3">
                    <Link href={`/submissions/${m.id}`} className="text-uspto-blue-primary hover:underline truncate">
                      {m.formData.useCaseTitle || "Untitled idea"}
                    </Link>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{businessUnitLabel(getBusinessUnit(m))}</span>
                  </li>
                ))}
              </ul>

              {canDecide ? (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                  <Select value={selectedLead} onValueChange={(v) => setLeadChoice((prev) => ({ ...prev, [cluster.id]: v }))}>
                    <SelectTrigger className="h-8 w-56 text-xs">
                      <SelectValue placeholder="Pick lead use case" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.formData.useCaseTitle || "Untitled idea"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" disabled={busy} onClick={() => decide(cluster, "consolidated")}>
                    <Check className="w-3.5 h-3.5 mr-1" />Consolidate into lead
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(cluster, "keep_separate")}>
                    Keep separate
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  Only a department-level reviewer can decide this cross-bureau cluster.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
