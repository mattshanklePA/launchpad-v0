"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { getSession } from "@/lib/auth"
import { useDataProvider } from "@/components/data-provider"
import {
  getSubmissions,
  setSubmissionStatus,
  addSubmissionComment,
  patchSubmissionFormData,
  type Submission,
} from "@/lib/submissions"
import {
  getStatus,
  getComments,
  getBusinessUnit,
  getAssigneeName,
  businessUnitLabel,
  visibleSubmissions,
  STATUS_LABEL,
  statusBadgeClasses,
} from "@/lib/reviewWorkflow"
import { findSimilar } from "@/lib/similarity"
import { determineReportability, type ReportabilityStatus } from "@/lib/ombReportability"
import { determineHighImpact } from "@/lib/highImpactDetermination"
import { determineConsolidation } from "@/lib/ombConsolidation"
import {
  clusterDuplicates,
  clusterForSubmission,
  getRationalization,
  rationalizationBlockReason,
  tenantHasBureauTier,
} from "@/lib/rationalization"
import {
  getBureauSignoff,
  getDepartmentApproval,
  buildBureauSignoffPatch,
  buildDepartmentApprovalPatch,
  hasDepartmentTransparency,
  departmentFinalApprovalEnabled,
  type SignoffDecision,
} from "@/lib/bureauSignoff"
import { assistReviewer } from "@/app/actions"
import { pushApprovedSubmission } from "@/app/systemConnector-actions"
import { getTenant } from "@/lib/tenant"
import {
  computeRmfProfile,
  rmfBadgeClass,
  rmfFunctionStatusBadgeClass,
  RMF_FUNCTION_LABELS,
  RMF_FUNCTION_ORDER,
  RMF_FUNCTION_STATUS_LABELS,
  RMF_OVERALL_LABELS,
} from "@/lib/nistRmf"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, Check, X, MessageSquare, Sparkles, ShieldCheck, AlertTriangle, Loader2, Copy, Users,
} from "lucide-react"

type Assist = Awaited<ReturnType<typeof assistReviewer>>

const DISPOSITION_LABEL: Record<Assist["suggestedDisposition"], string> = {
  approve: "Approve",
  request_info: "Request info",
  reject: "Reject",
}

const HIGH_IMPACT_BADGE_LABELS: Record<string, string> = {
  high_impact: "High-impact",
  presumed_not_high_impact: "Presumed, but not high-impact",
  not_high_impact: "Not high-impact",
}

function newCommentId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const REPORTABILITY_LABEL: Record<ReportabilityStatus, string> = {
  reportable: "Reportable to OMB",
  excluded: "Excluded from OMB inventory",
  review: "Needs review (OMB)",
}

const REPORTABILITY_CLASSES: Record<ReportabilityStatus, string> = {
  reportable: "bg-blue-100 text-blue-800 border-blue-300",
  excluded: "bg-gray-100 text-gray-600 border-gray-300",
  review: "bg-amber-100 text-amber-800 border-amber-300",
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
  const tenant = getTenant()
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

  // Same scope as every other list view (lib/reviewWorkflow's
  // visibleSubmissions): a submitter only their own, a bureau-scoped
  // reviewer/admin only their bureau — so a direct link to another bureau's
  // submission doesn't bypass the roll-down.
  const viewer = { role, email: session?.email, businessUnit: session?.businessUnit, office: session?.office }
  const hasAccess = visibleSubmissions([sub], viewer).length > 0
  if (!hasAccess) {
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
  // Scoped to the viewer's visible set too — a bureau-scoped reviewer/admin
  // should only see "similar use case" matches within their own bureau; the
  // cross-bureau duplicate surface is for OS/department-level viewers only.
  const similarMatches = isReviewer ? findSimilar(sub, visibleSubmissions(getSubmissions(), viewer)) : []
  const reportability = determineReportability(fd)
  const highImpactRec = determineHighImpact(fd)
  const consolidation = determineConsolidation(fd)

  // Dispersed bureau sign-off + department approval transparency (lib/bureauSignoff.ts).
  const showBureauTier = tenantHasBureauTier()
  const bureauSignoff = getBureauSignoff(sub)
  const departmentApproval = getDepartmentApproval(sub)
  const isDeptViewer = hasDepartmentTransparency(viewer)
  const deptTierEnabled = departmentFinalApprovalEnabled(tenant)

  // NIST AI RMF profile (lib/nistRmf.ts) — read-only lens, gated on the
  // tenant's `rmf` feature flag so non-RMF tenants (USPTO/DoW) are unaffected.
  const rmfEnabled = !!tenant.features.rmf
  const rmfProfile = rmfEnabled ? computeRmfProfile({ ...fd, bureauSignoff, departmentApproval }, tenant) : null

  // Unlike similarMatches above (deliberately scoped to the viewer), the
  // rationalization gate must see the true cross-bureau cluster regardless of
  // who's approving — a bureau-scoped reviewer approving their half of a
  // cross-bureau duplicate still needs to be blocked even though they can't
  // see the other bureau's submission from their own roll-down view.
  const allSubmissions = getSubmissions()
  const clusters = clusterDuplicates(allSubmissions)
  const cluster = clusterForSubmission(sub, clusters)
  const rationalizationDecision = getRationalization(sub)
  const blockReason = rationalizationBlockReason(sub, clusters)
  const clusterMembers = cluster
    ? cluster.memberIds
        .map((cid) => allSubmissions.find((s) => s.id === cid))
        .filter((s): s is Submission => !!s && s.id !== sub.id)
    : []
  const leadSubmission = rationalizationDecision?.leadSubmissionId
    ? allSubmissions.find((s) => s.id === rationalizationDecision.leadSubmissionId)
    : undefined

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
    // Defense-in-depth: the Approve button is already disabled while blocked,
    // but re-check here so no other caller of setStatus can bypass the gate.
    if (next === "approved" && blockReason) return
    setBusy(true)
    if ((next === "approved" || next === "rejected") && tenantHasBureauTier()) {
      // Record the bureau sign-off in the same patch as the status flip (see
      // lib/bureauSignoff.ts) — "each bureau signs its own" now leaves a record
      // of who and when instead of just moving the status.
      await patchSubmissionFormData(sub.id, {
        reviewStatus: next,
        ...buildBureauSignoffPatch(sub, next, {
          signedOffByName: session?.name || session?.email || "Reviewer",
          signedOffByEmail: session?.email || "",
          signedOffAt: new Date().toISOString(),
        }),
      })
    } else {
      await setSubmissionStatus(sub.id, next)
    }
    // Sync an approved use case out to the agency system of record / AI use
    // case inventory (lib/systemConnector.ts) — a no-op on tenants/deployments
    // with no connector configured, see lib/adapters/aiHub/aiHubConnector.ts.
    if (next === "approved") {
      await pushApprovedSubmission(sub)
    }
    await reload()
    setBusy(false)
  }

  const setDepartmentApproval = async (decision: SignoffDecision) => {
    setBusy(true)
    await patchSubmissionFormData(
      sub.id,
      buildDepartmentApprovalPatch(decision, {
        byName: session?.name || session?.email || "Department admin",
        byEmail: session?.email || "",
        at: new Date().toISOString(),
      }),
    )
    await reload()
    setBusy(false)
  }

  const setHighImpact = async (next: "high_impact" | "presumed_not_high_impact" | "not_high_impact") => {
    setBusy(true)
    await patchSubmissionFormData(sub.id, { highImpact: next })
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

      {showBureauTier && bureauSignoff && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          {bureauSignoff.decision === "rejected" ? "Rejected" : "Signed off"} by {bureauSignoff.signedOffByName}, {businessUnitLabel(bureauSignoff.bureau)}, {new Date(bureauSignoff.signedOffAt).toLocaleDateString()}
        </p>
      )}

      {isReviewer && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setStatus("approved")} disabled={busy || !!blockReason} title={blockReason}>
            <Check className="w-4 h-4 mr-1.5" />Approve
          </Button>
          <Button variant="outline" onClick={() => document.getElementById("comment-box")?.focus()} disabled={busy}><MessageSquare className="w-4 h-4 mr-1.5" />Request info</Button>
          <Button variant="outline" onClick={() => setStatus("rejected")} disabled={busy}><X className="w-4 h-4 mr-1.5" />Reject</Button>
          {blockReason && (
            <span className="text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />Rationalization pending
            </span>
          )}
        </div>
      )}

      {showBureauTier && deptTierEnabled && isDeptViewer && bureauSignoff && (
        <div className={`rounded-lg border p-4 space-y-2 ${departmentApproval ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-uspto-blue-primary" />
            <span className="font-medium text-sm">Department final approval</span>
            <Badge
              variant="outline"
              className={departmentApproval ? "bg-green-100 text-green-800 border-green-300" : "bg-amber-100 text-amber-800 border-amber-300"}
            >
              {departmentApproval ? (departmentApproval.decision === "approved" ? "Confirmed" : "Confirmed rejection") : "Awaiting department confirmation"}
            </Badge>
          </div>
          {departmentApproval ? (
            <p className="text-sm text-muted-foreground">
              {departmentApproval.decision === "approved" ? "Approved" : "Rejected"} by {departmentApproval.byName} on {new Date(departmentApproval.at).toLocaleDateString()}.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" disabled={busy} onClick={() => setDepartmentApproval("approved")}>
                <Check className="w-3.5 h-3.5 mr-1.5" />Confirm department approval
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setDepartmentApproval("rejected")}>
                <X className="w-3.5 h-3.5 mr-1.5" />Confirm department rejection
              </Button>
            </div>
          )}
        </div>
      )}

      {isReviewer && cluster && (
        <div className={`rounded-lg border p-4 space-y-2 ${blockReason ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50"}`}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-700" />
            <span className="font-medium text-sm">Cross-bureau rationalization</span>
            <Badge
              variant="outline"
              className={blockReason ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-green-100 text-green-800 border-green-300"}
            >
              {blockReason
                ? "Rationalization pending"
                : rationalizationDecision?.decision === "consolidated"
                  ? "Consolidated"
                  : "Keep separate"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {blockReason
              ? "This use case closely matches work filed under another bureau. A department/OS reviewer must mark this cluster consolidated or keep-separate — see the Rationalization panel on the Pipeline page — before it can be approved."
              : rationalizationDecision?.decision === "consolidated"
                ? `Consolidated into "${leadSubmission?.formData.useCaseTitle || "the lead use case"}" by ${rationalizationDecision.decidedBy} on ${new Date(rationalizationDecision.decidedAt).toLocaleDateString()}.`
                : `Marked keep-separate by ${rationalizationDecision?.decidedBy}${rationalizationDecision ? ` on ${new Date(rationalizationDecision.decidedAt).toLocaleDateString()}` : ""}.`}
          </p>
          <ul className="space-y-1.5">
            {clusterMembers.map((m) => (
              <li key={m.id} className="text-sm flex items-center justify-between gap-3">
                <Link href={`/submissions/${m.id}`} className="text-uspto-blue-primary hover:underline truncate">
                  {m.formData.useCaseTitle || "Untitled idea"}
                </Link>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{businessUnitLabel(getBusinessUnit(m))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isReviewer && (
        <div className="rounded-lg border border-uspto-blue-primary/40 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-uspto-blue-primary" />
            <span className="font-medium text-sm">{tenant.assistantName}&apos;s read</span>
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
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          OMB reportability
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={REPORTABILITY_CLASSES[reportability.status]}>
            {REPORTABILITY_LABEL[reportability.status]}
          </Badge>
          <span className="text-sm text-muted-foreground">{reportability.reason}</span>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          OMB reporting mode
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={
              consolidation.status === "Consolidated"
                ? "bg-purple-100 text-purple-800 border-purple-300"
                : "bg-gray-100 text-gray-600 border-gray-300"
            }
          >
            {consolidation.status}
          </Badge>
          {consolidation.categoryLabel && (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              {consolidation.categoryLabel}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">{consolidation.reason}</span>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            High-impact determination
          </div>
          <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">advisory · you decide</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Recommended:</span>
          <Badge
            variant="outline"
            className={
              highImpactRec.recommendation === "yes"
                ? "bg-red-100 text-red-800 border-red-300"
                : "bg-gray-100 text-gray-600 border-gray-300"
            }
          >
            {highImpactRec.recommendation === "yes" ? "High-impact" : "Not high-impact"}
          </Badge>
        </div>
        <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
          {highImpactRec.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <span className="text-sm text-muted-foreground">Reviewer determination:</span>
          {isReviewer ? (
            <>
              <Button
                size="sm"
                variant={fd.highImpact === "high_impact" ? "default" : "outline"}
                disabled={busy}
                onClick={() => setHighImpact("high_impact")}
              >
                High-impact
              </Button>
              <Button
                size="sm"
                variant={fd.highImpact === "presumed_not_high_impact" ? "default" : "outline"}
                disabled={busy}
                onClick={() => setHighImpact("presumed_not_high_impact")}
              >
                Presumed, but not high-impact
              </Button>
              <Button
                size="sm"
                variant={fd.highImpact === "not_high_impact" ? "default" : "outline"}
                disabled={busy}
                onClick={() => setHighImpact("not_high_impact")}
              >
                Not high-impact
              </Button>
            </>
          ) : (
            <Badge variant="outline">{HIGH_IMPACT_BADGE_LABELS[fd.highImpact] || "Not yet set"}</Badge>
          )}
        </div>
      </div>

      {fd.highImpact === "high_impact" && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            High-impact risk management
          </div>
          {fd.aiImpactAssessment && (
            <div>
              <div className="text-sm font-medium">AI impact assessment</div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fd.aiImpactAssessment}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <RiskRow ok={fd.preDeploymentTesting === "yes"} label={`Pre-deployment testing: ${fd.preDeploymentTesting || "not set"}`} />
            <RiskRow ok={fd.ongoingMonitoringPlan === "yes"} label={`Ongoing monitoring: ${fd.ongoingMonitoringPlan || "not set"}`} />
            <RiskRow ok={fd.humanOversightAppeal === "yes"} label={`Appeal process: ${fd.humanOversightAppeal || "not set"}`} />
          </div>
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

      {rmfProfile && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">NIST AI RMF</div>
            <Badge variant="outline" className={rmfBadgeClass(rmfProfile.overall)} title={rmfProfile.rationale}>
              {RMF_OVERALL_LABELS[rmfProfile.overall]}
            </Badge>
          </div>
          <div className="space-y-2">
            {RMF_FUNCTION_ORDER.map((key) => {
              const result = rmfProfile.functions[key]
              return (
                <div key={key} className="flex flex-wrap items-start gap-2">
                  <Badge variant="outline" className={rmfFunctionStatusBadgeClass(result.status)}>
                    {RMF_FUNCTION_LABELS[key]}: {RMF_FUNCTION_STATUS_LABELS[result.status]}
                  </Badge>
                  <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
                    {result.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />Draft with {tenant.assistantName}
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
