"use client"

// Cross-bureau "one Commerce" rationalization panel — lists each
// lib/rationalization.ts duplicate cluster with its members, bureaus, and
// similarity, and lets a department/OS reviewer decide the cluster: pick a
// lead use case and consolidate the rest into it, or mark it keep-separate.
// Until a cluster is decided, its member submissions are blocked from
// approval (see components/submissions/submission-detail.tsx's Approve gate).
//
// This is the duplicate-RATIONALIZATION axis (rationalizing duplicated
// effort across bureaus) — distinct from BureauRollup's "Consolidated (OMB)"
// column, which is lib/ombConsolidation.ts's OMB CATEGORY axis (how a single
// use case is reported once vs. per-bureau). A submission can sit in a
// rationalization cluster and independently be OMB-Consolidated or
// -Individual; the two controls never collapse into one.
//
// No-op for tenants without a bureau tier (USPTO/DoW): clusterDuplicates()
// always returns [] for them, so this renders nothing.

import { useState } from "react"
import Link from "next/link"
import { Users, Check } from "lucide-react"
import type { Submission } from "@/lib/submissions"
import { getBusinessUnit, businessUnitLabel } from "@/lib/reviewWorkflow"
import { getTenant } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import {
  clusterDuplicates,
  clusterHref,
  getRationalization,
  type RationalizationCluster,
  type RationalizationDecision,
} from "@/lib/rationalization"
import { applyRationalizationDecision } from "@/lib/rationalizationActions"
import { getSession } from "@/lib/auth"
import { formatKeystoneDate } from "@/lib/dateFormat"
import { useDataProvider } from "@/components/data-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SectionTitle } from "@/components/cockpit/section-title"
import { SquareTag } from "@/components/cockpit/square-tag"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  const clusters = clusterDuplicates(submissions)
  if (clusters.length === 0) return null

  const byId = new Map(submissions.map((s) => [s.id, s]))
  const decidedCount = clusters.filter((c) => decisionFor(c, byId)).length

  const decide = async (cluster: RationalizationCluster, decision: RationalizationDecision) => {
    const session = getSession()
    const leadSubmissionId = decision === "consolidated" ? leadChoice[cluster.id] || cluster.memberIds[0] : undefined
    setBusyClusterId(cluster.id)
    await applyRationalizationDecision(cluster, decision, {
      leadSubmissionId,
      decidedBy: session?.name || session?.email || "Reviewer",
      decidedAt: new Date().toISOString(),
    })
    await refetchSubmissions()
    setBusyClusterId(null)
  }

  if (getTenant().features.cockpitLook) {
    // NL-11 (#312), ES2 only: one plain table. Choosing a lead and deciding
    // happen on the cluster page's own controls, one click away.
    const th =
      "border-b border-[var(--ks-limestone-dark)] bg-white px-3 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)] whitespace-nowrap"
    const td = "border-b border-[var(--ks-limestone)] px-3 py-3 align-top text-sm text-[var(--ks-ink-900)]"
    const title = `Cross-${getTenant().tierLabels.unit.toLowerCase()} rationalization`
    return (
      <section id="rationalization" aria-label={title} className="flex flex-col gap-4">
        <SectionTitle
          title={title}
          context={`${clusters.length} duplicate cluster${clusters.length === 1 ? "" : "s"} · ${decidedCount} rationalized`}
        />
        <div className="overflow-x-auto border border-[var(--ks-limestone-dark)] bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Status</th>
                <th className={th}>Match</th>
                <th className={th}>Use cases</th>
                <th className={th}>Decision</th>
                <th className={th}>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((cluster) => {
                const decision = decisionFor(cluster, byId)
                const members = cluster.memberIds.map((id) => byId.get(id)).filter((s): s is Submission => !!s)
                const lead = decision?.leadSubmissionId ? byId.get(decision.leadSubmissionId) : undefined
                return (
                  <tr key={cluster.id}>
                    <td className={td}>
                      <SquareTag tone={decision ? "healthy" : "attention"}>
                        {decision
                          ? decision.decision === "consolidated"
                            ? "Consolidated"
                            : "Keep separate"
                          : tenantCopy(getTenant()).pendingDecisionLabel}
                      </SquareTag>
                    </td>
                    <td className={`${td} font-mono`}>{Math.round(cluster.maxSimilarity * 100)}%</td>
                    <td className={td}>
                      <ul className="m-0 list-none space-y-1 p-0">
                        {members.map((m) => (
                          <li key={m.id}>
                            <Link
                              href={`/submissions/${m.id}`}
                              className="font-semibold text-[var(--ks-active-blue-dark)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
                            >
                              {m.formData.useCaseTitle || "Untitled idea"}
                            </Link>{" "}
                            <span className="text-xs text-[var(--ks-ink-700)]">{businessUnitLabel(getBusinessUnit(m))}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className={`${td} text-xs text-[var(--ks-ink-700)]`}>
                      {decision
                        ? `${decision.decision === "consolidated" && lead ? `Lead: ${lead.formData.useCaseTitle || "Untitled idea"}. ` : ""}By ${decision.decidedBy} on ${formatKeystoneDate(decision.decidedAt)}`
                        : "–"}
                    </td>
                    <td className={td}>
                      <Link
                        href={clusterHref(cluster.id)}
                        className="whitespace-nowrap text-[13px] font-semibold text-[var(--ks-active-blue-dark)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
                      >
                        Open the cluster
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <div id="rationalization" className="rounded-lg border bg-white p-4 space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-uspto-gray-text flex items-center gap-2">
          <Users className="w-4 h-4" />
          Cross-{getTenant().tierLabels.unit.toLowerCase()} rationalization
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
                    {decision ? (decision.decision === "consolidated" ? "Consolidated" : "Keep separate") : tenantCopy(getTenant()).pendingDecisionLabel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{Math.round(cluster.maxSimilarity * 100)}% match</span>
                </div>
                {decision && (
                  <span className="text-xs text-muted-foreground">
                    {decision.decision === "consolidated" && lead ? `Lead: ${lead.formData.useCaseTitle || "Untitled idea"} · ` : ""}
                    by {decision.decidedBy} on {formatKeystoneDate(decision.decidedAt)}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
