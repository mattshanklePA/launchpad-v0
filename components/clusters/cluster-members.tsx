"use client"

// RD-4 member cards (mock A2 Cluster) — one card per cluster member, current
// lead first. Exported so RD-6 (issue #206, reviewer-path step 1) can reuse
// it alongside ClusterDecision.

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { KindTag } from "@/components/ui/kind-tag"
import { StatusPill } from "@/components/ui/status-pill"
import type { Submission } from "@/lib/submissions"
import { getStatus, getBusinessUnit, businessUnitLabel, STATUS_ORDER, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { formatKeystoneDate, submissionStatusKeystone } from "@/components/dashboard/command-center-data"

function firstSentence(s: string | undefined): string {
  const t = (s || "").trim()
  if (!t) return ""
  const m = t.match(/^.*?[.!?](\s|$)/)
  return (m ? m[0] : t).trim()
}

function scopeLine(s: Submission): string {
  return firstSentence(s.formData.useCaseDescription) || s.formData.solutionSummary || "—"
}

/** The single earliest-submitted member's id, ties broken by id for determinism. */
function oldestMemberId(members: Submission[]): string | null {
  if (members.length === 0) return null
  return members.reduce((oldest, m) =>
    m.submittedAt < oldest.submittedAt || (m.submittedAt === oldest.submittedAt && m.id < oldest.id) ? m : oldest,
  ).id
}

/** The single member furthest along STATUS_ORDER, ties broken by id for determinism. */
function furthestAlongMemberId(members: Submission[]): string | null {
  if (members.length === 0) return null
  return members.reduce((furthest, m) => {
    const mi = STATUS_ORDER.indexOf(getStatus(m))
    const fi = STATUS_ORDER.indexOf(getStatus(furthest))
    return mi > fi || (mi === fi && m.id < furthest.id) ? m : furthest
  }).id
}

/** A member gets at most one derived tag — "This one" (RD-6, issue #207: the submission the reviewer is currently on) outranks "Furthest along", which outranks "Oldest". */
function derivedTag(id: string, oldestId: string | null, furthestId: string | null, currentSubmissionId?: string): string | null {
  if (id === currentSubmissionId) return "This one"
  if (id === furthestId) return "Furthest along"
  if (id === oldestId) return "Oldest"
  return null
}

function MemberCard({
  member,
  isLead,
  decided,
  tag,
  onSelectLead,
}: {
  member: Submission
  isLead: boolean
  decided: boolean
  tag: string | null
  onSelectLead: (id: string) => void
}) {
  const submitterName = String(member.formData.submitterName || "").trim() || "Unknown submitter"

  return (
    <div className="flex flex-col rounded-md border border-border-subtle bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-2.5">
        {isLead ? (
          <KindTag>Lead if consolidated</KindTag>
        ) : decided ? (
          <span />
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-auto px-0 py-0 font-semibold" onClick={() => onSelectLead(member.id)}>
            Make lead
          </Button>
        )}
        <StatusPill status={submissionStatusKeystone(getStatus(member))}>{STATUS_LABEL[getStatus(member)]}</StatusPill>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <p className="font-heading text-[17px] font-bold leading-[1.25] text-foreground">
          {member.formData.useCaseTitle || "Untitled idea"}
        </p>

        <div className="flex flex-col gap-2.5 text-[13px]">
          <div>
            <p className="ks-microlabel mb-0.5">Program office</p>
            <p className="text-foreground">{businessUnitLabel(getBusinessUnit(member))}</p>
          </div>
          <div>
            <p className="ks-microlabel mb-0.5">Submitted by</p>
            <p className="text-foreground">
              {submitterName} · {formatKeystoneDate(member.submittedAt)}
            </p>
          </div>
          <div>
            <p className="ks-microlabel mb-0.5">Scope</p>
            <p className="text-foreground">{scopeLine(member)}</p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-border-subtle pt-3">
          {tag ? <span className="text-[12px] text-muted-foreground">{tag}</span> : <span />}
          <Link href={`/submissions/${member.id}`} className="text-[13px] font-semibold text-primary hover:underline">
            Open
          </Link>
        </div>
      </div>
    </div>
  )
}

export function ClusterMembers({
  members,
  currentLeadId,
  decided,
  onSelectLead,
  currentSubmissionId,
}: {
  members: Submission[]
  currentLeadId: string
  decided: boolean
  onSelectLead: (id: string) => void
  /** The submission the reviewer is currently viewing (RD-6, issue #207 step 1) — tagged "This one" instead of "Oldest"/"Furthest along". Omit outside the reviewer-detail process; the dedicated cluster page doesn't set it. */
  currentSubmissionId?: string
}) {
  const oldestId = oldestMemberId(members)
  const furthestId = furthestAlongMemberId(members)
  const ordered = [...members].sort((a, b) => {
    if (a.id === currentLeadId) return -1
    if (b.id === currentLeadId) return 1
    return 0
  })

  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {ordered.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          isLead={member.id === currentLeadId}
          decided={decided}
          tag={derivedTag(member.id, oldestId, furthestId, currentSubmissionId)}
          onSelectLead={onSelectLead}
        />
      ))}
    </div>
  )
}
