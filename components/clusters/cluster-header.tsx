"use client"

// RD-4 header card (mock A2 Cluster, "What 'open the cluster' actually
// opens"): basalt-600 hero-style card stating the decision the whole page
// exists to support. Exported so RD-6 (issue #206, the reviewer-path "step 1
// = this cluster's decision") can reuse the same header.

import type { Submission } from "@/lib/submissions"
import type { RationalizationCluster, Rationalization } from "@/lib/rationalization"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { spellCount, formatKeystoneDate } from "@/components/dashboard/command-center-data"

/**
 * The affected-area chip label every member shares, if any — the first value
 * (in the tenant's own `affectedSystems` order) present on every member's
 * `affectedBusinessUnits`, so the pick is deterministic across renders.
 */
function sharedAffectedAreaLabel(members: Submission[], tenant: TenantConfig): string | null {
  if (members.length === 0) return null
  const memberSets = members.map((m) => new Set(m.formData.affectedBusinessUnits || []))
  const shared = tenant.affectedSystems.find((option) => memberSets.every((set) => set.has(option.value)))
  return shared?.label ?? null
}

function shortDescription(members: Submission[], tenant: TenantConfig): string {
  const shared = sharedAffectedAreaLabel(members, tenant)
  return shared ? `touch ${shared.toLowerCase()}` : "were flagged as the same effort by the duplicate detector"
}

export function ClusterHeader({
  cluster,
  members,
  decision,
  tenant = getTenant(),
}: {
  cluster: RationalizationCluster
  members: Submission[]
  decision: Rationalization | undefined
  tenant?: TenantConfig
}) {
  const count = cluster.memberIds.length
  const matchPct = Math.round(cluster.maxSimilarity * 100)

  const eyebrow = decision
    ? `Decided · ${decision.decision === "consolidated" ? "consolidated" : "kept separate"} by ${decision.decidedBy} on ${formatKeystoneDate(decision.decidedAt)}`
    : `Rationalization pending · ${matchPct}% match`

  const title = `${spellCount(count)} use cases, one problem`
  const explanation = `All ${count} ${shortDescription(members, tenant)}. Decide whether they are one effort with a lead, or ${count} efforts that stay separate. Neither choice touches the submissions themselves.`

  return (
    <div className="space-y-2.5 rounded-lg bg-keystone-basalt600 p-6 text-keystone-chalk shadow-sm">
      <p className="ks-microlabel text-keystone-amberLight">{eyebrow}</p>
      <h1 className="font-heading text-[31px] font-black leading-[1.1] tracking-[-0.024em] text-white">{title}</h1>
      <p className="max-w-[68ch] text-[15px] leading-relaxed text-white/75">{explanation}</p>
    </div>
  )
}
