"use client"

// RD-4 "Why these matched" card (mock A2 Cluster) — the deterministic,
// per-field breakdown behind the cluster's blended similarity score
// (lib/similarity.ts's clusterSignals, additive to similarity() — never a
// replacement). Exported so RD-6 (issue #206) can reuse it.

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { Submission } from "@/lib/submissions"
import { clusterSignals } from "@/lib/similarity"

const LITTLE_OVERLAP_THRESHOLD = 20

function sharedTermsLine(topTerms: string[], score: number): string {
  if (score < LITTLE_OVERLAP_THRESHOLD || topTerms.length === 0) return "Little overlap"
  return `Shared terms: ${topTerms.join(", ")}`
}

function CompareFullTextDialog({ members }: { members: Submission[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-[13px] font-semibold text-primary hover:underline">
          Compare full text
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare full text</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` }}>
          {members.map((m) => (
            <p key={m.id} className="text-[13.5px] font-semibold text-foreground">
              {m.formData.useCaseTitle || "Untitled idea"}
            </p>
          ))}
          {members.map((m) => (
            <div key={`${m.id}-problem`} className="space-y-1">
              <p className="ks-microlabel">Problem</p>
              <p className="text-[13.5px] leading-relaxed text-foreground">
                {m.formData.problemDefinition || m.formData.coreProblem || "—"}
              </p>
            </div>
          ))}
          {members.map((m) => (
            <div key={`${m.id}-solution`} className="space-y-1">
              <p className="ks-microlabel">Solution</p>
              <p className="text-[13.5px] leading-relaxed text-foreground">
                {m.formData.solutionSummary || m.formData.proposedSolution || "—"}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ClusterSignals({
  members,
  maxSimilarity,
  className,
}: {
  members: Submission[]
  maxSimilarity: number
  className?: string
}) {
  const rows = clusterSignals(members)
  const matchPct = Math.round(maxSimilarity * 100)

  return (
    <div className={`flex flex-1 flex-col gap-4 rounded-md border border-border-subtle bg-card p-6 shadow-sm ${className || ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="ks-microlabel">Why these matched · {matchPct}% overall</p>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-foreground">{row.label}</span>
              <span className="font-mono text-[12px] text-muted-foreground">{row.score}%</span>
            </div>
            <div className="h-[3px] rounded bg-muted">
              <div className="h-[3px] rounded bg-keystone-basalt600" style={{ width: `${row.score}%` }} />
            </div>
            <p className="text-[12px] leading-[1.45] text-muted-foreground">{sharedTermsLine(row.topTerms, row.score)}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <p className="text-[12px] text-foreground-faint">Overall is the detector&apos;s score; the rows show where the overlap sits.</p>
        <CompareFullTextDialog members={members} />
      </div>
    </div>
  )
}
