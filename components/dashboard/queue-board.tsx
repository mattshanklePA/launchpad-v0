"use client"

// Command Center "queue by status" board (CC-7) — a compact Kanban-style
// list of the viewer's scoped submissions grouped by pipeline status, linking
// through to the submission detail page. The bureau/office-scoped analog of
// the department dashboard's pipeline-status chart, but showing the actual
// items rather than just counts: a bureau reviewer's dashboard needs to be
// able to act on "what's in my queue," not just see a total.
//
// Presentation only — takes an already-scoped submissions list (the caller's
// `scopedSubmissions(scope, submissions)`), so it never decides what's in
// scope itself, and renders through the shared Card/Badge primitives rather
// than the ad hoc bg-white divs the pre-Command-Center pipeline page uses.

import Link from "next/link"
import { User } from "lucide-react"
import type { Submission } from "@/lib/submissions"
import { getStatus, getAssigneeName, STATUS_ORDER, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { submissionStatusPillStatus } from "@/lib/submissionStatusPill"
import { StatusPill } from "@/components/ui/status-pill"
import type { KeystoneStatus } from "@/lib/statusTokens"
import { LifecycleBadge } from "@/components/ui/lifecycle-badge"

function readinessChip(score?: string): { status: KeystoneStatus; label: string } {
  switch (score) {
    case "ready":
      return { status: "healthy", label: "Ready" }
    case "needs_work":
      return { status: "attention", label: "Needs work" }
    case "early_stage":
      return { status: "neutral", label: "Early" }
    default:
      return { status: "neutral", label: "Not assessed" }
  }
}

function QueueCard({ s }: { s: Submission }) {
  const r = readinessChip((s.formData as Record<string, unknown>)?.readinessScore as string | undefined)
  const assignee = getAssigneeName(s)
  const title = String((s.formData as Record<string, unknown>)?.useCaseTitle || "Untitled idea")
  const submitter = String((s.formData as Record<string, unknown>)?.submitterName || "Anonymous")
  return (
    <Link
      href={`/submissions/${s.id}`}
      className="block rounded-md border bg-card p-3 text-card-foreground transition-colors hover:border-primary/50"
    >
      <div className="line-clamp-2 text-sm font-medium">{title}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{submitter}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <LifecycleBadge submission={s} />
        <StatusPill status={r.status}>{r.label}</StatusPill>
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-[13px] text-muted-foreground">
        <User className="h-3 w-3" />
        {assignee || "Unassigned"}
      </div>
    </Link>
  )
}

export function QueueBoard({ submissions }: { submissions: Submission[] }) {
  const inStatus = (st: (typeof STATUS_ORDER)[number]) => submissions.filter((s) => getStatus(s) === st)

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STATUS_ORDER.map((st) => {
        const items = inStatus(st)
        return (
          <div key={st} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <StatusPill status={submissionStatusPillStatus(st)}>{STATUS_LABEL[st]}</StatusPill>
              <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
            </div>
            <div className="min-h-[120px] space-y-2 rounded-lg bg-muted/40 p-2">
              {items.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">None</div>
              ) : (
                items.map((s) => <QueueCard key={s.id} s={s} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
