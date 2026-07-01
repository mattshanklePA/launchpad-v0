"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { getSession } from "@/lib/auth"
import { useDataProvider } from "@/components/data-provider"
import {
  getSubmissions,
  setSubmissionStatus,
  addSubmissionComment,
  type Submission,
} from "@/lib/submissions"
import {
  getStatus,
  getComments,
  getOwnerEmail,
  getBusinessUnit,
  getAssigneeName,
  businessUnitLabel,
  STATUS_LABEL,
  statusBadgeClasses,
} from "@/lib/reviewWorkflow"
import { findSimilar } from "@/lib/similarity"
import { assistReviewer } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, Check, X, MessageSquare, Sparkles, ShieldCheck, AlertTriangle, Loader2, Copy,
} from "lucide-react"

type Assist = Awaited<ReturnType<typeof assistReviewer>>

const DISPOSITION_LABEL: Record<Assist["suggestedDisposition"], string> = {
  approve: "Approve",
  request_info: "Request info",
  reject: "Reject",
}

function newCommentId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function RiskRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={ok ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}
    >
      {ok ? <ShieldCheck className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  )
}

export function SubmissionDetail({ id }: { id: string }) {
  const { loaded, refetchSubmissions } = useDataProvider()
  const [sub, setSub] = useState<Submission | null>(null)
  const [ready, setReady] = useState(false)
  const [assist, setAssist] = useState<Assist | null>(null)
  const [assisting, setAssisting] = useState(false)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const ranRef = useRef(false)

  const session = typeof window !== "undefined" ? getSession() : null
  const role = session?.role || "submitter"
  const isReviewer = role === "reviewer" || role === "admin"

  useEffect(() => {
    if (!loaded) return
    setSub(getSubmissions().find((s) => s.id === id) || null)
    setReady(true)
  }, [loaded, id])

  useEffect(() => {
    if (!sub || ranRef.current || !isReviewer) return
    ranRef.current = true
    setAssisting(true)
    assistReviewer(sub.formData)
      .then(setAssist)
      .finally(() => setAssisting(false))
  }, [sub, isReviewer])

  // When a reviewer opens a still-"submitted" idea, move it into review.
  const movedRef = useRef(false)
  useEffect(() => {
    if (!sub || movedRef.current || !isReviewer) return
    if (getStatus(sub) !== "submitted") return
    movedRef.current = true
    ;(async () => {
      await setSubmissionStatus(sub.id, "in_review")
      await refetchSubmissions()
      setSub(getSubmissions().find((s) => s.id === id) || null)
    })()
  }, [sub, isReviewer, id, refetchSubmissions])

  const reload = async () => {
    await refetchSubmissions()
    setSub(getSubmissions().find((s) => s.id === id) || null)
  }

  if (!ready) return <div className="text-sm text-muted-foreground">Loading…</div>
  if (!sub) {
    return (
      <div className="space-y-4">
        <Link href="/home" className="text-sm text-uspto-blue-primary hover:underline"><ArrowLeft className="w-4 h-4 inline mr-1" />Back</Link>
        <p className="text-sm text-muted-foreground">Submission not found.</p>
      </div>
    )
  }

  const me = (session?.email || "").toLowerCase()
  const isOwner = getOwnerEmail(sub) === me
  if (role === "submitter" && !isOwner) {
    return (
      <div className="space-y-4">
        <Link href="/home" className="text-sm text-uspto-blue-primary hover:underline"><ArrowLeft className="w-4 h-4 inline mr-1" />Back</Link>
        <p className="text-sm text-muted-foreground">You don&apos;t have access to this submission.</p>
      </div>
    )
  }

  const fd = sub.formData
  const status = getStatus(sub)
  const comments = getComments(sub)
  const similarMatches = isReviewer ? findSimilar(sub, getSubmissions()) : []

  const postComment = async (nextStatus?: Parameters<typeof setSubmissionStatus>[1]) => {
    if (!comment.trim()) return
    setBusy(true)
    await addSubmissionComment(
      sub.id,
      {
        id: newCommentId(),
        authorName: session?.name || "You",
        authorRole: (role as "submitter" | "reviewer" | "admin"),
        body: comment.trim(),
        createdAt: new Date().toISOString(),
      },
      nextStatus,
    )
    setComment("")
    await reload()
    setBusy(false)
  }

  const setStatus = async (next: Parameters<typeof setSubmissionStatus>[1]) => {
    setBusy(true)
    await setSubmissionStatus(sub.id, next)
    await reload()
    setBusy(false)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/home" className="text-sm text-uspto-blue-primary hover:underline"><ArrowLeft className="w-4 h-4 inline mr-1" />Back</Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-uspto-gray-text">{fd.useCaseTitle || "Untitled idea"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {businessUnitLabel(getBusinessUnit(sub))} · {fd.submitterName || "Anonymous"} · submitted {new Date(sub.submittedAt).toLocaleDateString()}
            {getAssigneeName(sub) ? ` · assigned to ${getAssigneeName(sub)}` : ""}
          </p>
        </div>
        <Badge variant="outline" className={statusBadgeClasses(status)}>{STATUS_LABEL[status]}</Badge>
      </div>

      {isReviewer && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setStatus("approved")} disabled={busy}><Check className="w-4 h-4 mr-1.5" />Approve</Button>
          <Button variant="outline" onClick={() => document.getElementById("comment-box")?.focus()} disabled={busy}><MessageSquare className="w-4 h-4 mr-1.5" />Request info</Button>
          <Button variant="outline" onClick={() => setStatus("rejected")} disabled={busy}><X className="w-4 h-4 mr-1.5" />Reject</Button>
        </div>
      )}

      {isReviewer && (
        <div className="rounded-lg border border-uspto-blue-primary/40 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-uspto-blue-primary" />
            <span className="font-medium text-sm">Scout&apos;s read</span>
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">advisory · you decide</Badge>
          </div>
          {assisting && <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Reading the submission…</div>}
          {assist && (
            <>
              <p className="text-sm leading-relaxed">{assist.verdict}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-green-700 mb-1">Strengths</div>
                  <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">{assist.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
                <div>
                  <div className="text-xs font-medium text-red-700 mb-1">Gaps to probe</div>
                  <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">{assist.gaps.map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t text-sm">
                <span className="text-muted-foreground">Suggested:</span>
                <Badge variant="outline" className={assist.suggestedDisposition === "approve" ? "bg-green-100 text-green-800 border-green-300" : assist.suggestedDisposition === "reject" ? "bg-gray-100 text-gray-600 border-gray-300" : "bg-red-100 text-red-800 border-red-300"}>{DISPOSITION_LABEL[assist.suggestedDisposition]}</Badge>
              </div>
            </>
          )}
        </div>
      )}

      {isReviewer && similarMatches.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-amber-700" />
            <span className="font-medium text-sm">Similar use cases</span>
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">token-overlap match · confirm before assuming duplicate</Badge>
          </div>
          <ul className="space-y-1.5">
            {similarMatches.map((m) => (
              <li key={m.submission.id} className="text-sm flex items-center justify-between gap-3">
                <Link
                  href={`/submissions/${m.submission.id}`}
                  className="text-uspto-blue-primary hover:underline truncate"
                >
                  {m.submission.formData.useCaseTitle || "Untitled idea"}
                </Link>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {businessUnitLabel(m.bureau)} · {Math.round(m.score * 100)}% match
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Risk profile</div>
        <div className="flex flex-wrap gap-2">
          <RiskRow ok={fd.involvesSensitiveData !== "yes"} label={fd.involvesSensitiveData === "yes" ? "Uses PII" : "No PII"} />
          <RiskRow ok={fd.aiModelSourcing === "american_built" || fd.aiModelSourcing === "open_source_us"} label={fd.aiModelSourcing === "foreign" ? "Foreign model" : fd.aiModelSourcing === "unknown" || !fd.aiModelSourcing ? "Sourcing unknown" : "American-built"} />
          <RiskRow ok={fd.aiHumanReview === "yes"} label={fd.aiHumanReview === "yes" ? "Human review: yes" : "No human review"} />
          <RiskRow ok={fd.aiDecisionalImpact !== "yes"} label={fd.aiDecisionalImpact === "yes" ? "Decisional AI" : "Non-decisional"} />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submission</div>
        {([
          ["Problem", fd.problemDefinition || fd.coreProblem],
          ["Proposed solution", fd.solutionSummary || fd.proposedSolution],
          ["Business value", fd.businessValueSummary || fd.businessValue],
          ["Strategic alignment", fd.alignmentSummary || fd.relevantOkrs],
          ["Success metrics", fd.metricsSummary || fd.successMetrics],
          ["Executive summary", fd.executiveSummary],
        ] as [string, string][]).filter(([, v]) => v && v.trim()).map(([label, v]) => (
          <div key={label}>
            <div className="text-sm font-medium">{label}</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversation with submitter</div>
        {comments.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-medium flex-shrink-0">
              {(c.authorName || "?").split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div className="text-sm"><span className="font-medium">{c.authorName}</span> <span className="text-xs text-muted-foreground capitalize">· {c.authorRole} · {new Date(c.createdAt).toLocaleDateString()}</span></div>
              <div className="text-sm text-muted-foreground">{c.body}</div>
            </div>
          </div>
        ))}

        <div className="pt-2 border-t space-y-2">
          <Textarea
            id="comment-box"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isReviewer ? "Write feedback to the submitter…" : "Reply to the reviewer…"}
            rows={2}
          />
          <div className="flex items-center gap-2">
            {isReviewer ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy || assisting}
                  onClick={() => assist?.draftRequestInfo && setComment(assist.draftRequestInfo)}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />Draft with Scout
                </Button>
                <Button size="sm" disabled={busy || !comment.trim()} onClick={() => postComment("needs_info")}>
                  Send &amp; request info
                </Button>
              </>
            ) : (
              <Button size="sm" disabled={busy || !comment.trim()} onClick={() => postComment(status === "needs_info" ? "submitted" : undefined)}>
                {status === "needs_info" ? "Reply & resubmit" : "Reply"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
