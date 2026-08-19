"use client"

// RD-4 "Plumb recommends" card (mock A2 Cluster) — an advisory
// keep-separate/consolidate read on the cluster, drawn from app/cluster-actions.ts's
// assessCluster. Exported so RD-6 (issue #206) can reuse it as the reviewer
// path's step-1 recommendation. Loading state is a two-line skeleton, never a
// spinner — the RD-6 staged-progress pattern isn't built yet (see the issue).

import { useEffect, useRef, useState } from "react"
import { KindTag } from "@/components/ui/kind-tag"
import { GlossaryTerm } from "@/components/launchpad/glossary-term"
import { PlumbMark } from "@/components/branding/plumb-mark"
import type { Submission } from "@/lib/submissions"
import { assessCluster } from "@/app/cluster-actions"
import type { ClusterAssessment } from "@/lib/clusterFallback"

function ClusterRecommendationSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-md border border-border-subtle border-l-[3px] border-l-primary bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <PlumbMark className="h-4 w-4" />
        <p className="ks-microlabel">Plumb is reading the cluster…</p>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

export function PlumbClusterRecommendation({ members, className }: { members: Submission[]; className?: string }) {
  const [assessment, setAssessment] = useState<ClusterAssessment | null>(null)
  const ranRef = useRef<string | null>(null)

  // Keyed by member ids, not just a mount-once ref — a different cluster
  // navigated to client-side (Link, no full reload) must re-fetch instead of
  // showing the previous cluster's stale recommendation. assessCluster's own
  // module-level cache (app/cluster-actions.ts) makes a revisit instant.
  const membersKey = members.map((m) => m.id).sort().join(",")

  useEffect(() => {
    if (ranRef.current === membersKey || members.length === 0) return
    ranRef.current = membersKey
    setAssessment(null)
    assessCluster(members).then(setAssessment)
  }, [membersKey, members])

  if (!assessment) {
    return <ClusterRecommendationSkeleton />
  }

  return (
    <div className={`flex flex-1 flex-col gap-3.5 rounded-md border border-border-subtle border-l-[3px] border-l-primary bg-card p-6 shadow-sm ${className || ""}`}>
      <div className="flex items-center gap-2">
        <PlumbMark className="h-4 w-4" />
        <p className="ks-microlabel">Plumb recommends</p>
        <KindTag>
          <GlossaryTerm term="advisory">Advisory</GlossaryTerm>
        </KindTag>
      </div>

      <h2 className="font-heading text-[20px] font-bold leading-[1.2] tracking-[-0.018em] text-foreground">{assessment.headline}</h2>

      <div className="flex flex-col gap-2.5 text-[14px] leading-[1.55] text-foreground">
        {assessment.reasons.map((reason, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="shrink-0 font-mono text-[12px] text-foreground-faint">{String(i + 1).padStart(2, "0")}</span>
            <span>{reason}</span>
          </div>
        ))}
      </div>

      <p className="mt-auto border-t border-border-subtle pt-3 text-[13px] leading-relaxed text-muted-foreground">
        {assessment.tradeoff}
      </p>
    </div>
  )
}
