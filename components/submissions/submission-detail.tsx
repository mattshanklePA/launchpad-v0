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
import { getTenant, type TenantConfig } from "@/lib/tenant"
import {
  rmfBadgeClass,
  rmfFunctionStatusBadgeClass,
  RMF_FUNCTION_LABELS,
  RMF_FUNCTION_ORDER,
  RMF_FUNCTION_STATUS_LABELS,
  RMF_OVERALL_LABELS,
  type RmfRiskLevel,
} from "@/lib/nistRmf"
import { resolveRmfProfile, buildRmfProfileReviewPatch } from "@/lib/rmfProfileReview"
import { applicableGovernanceFields } from "@/lib/governanceCapture"
import { GovernanceCapturePanel } from "@/components/submissions/governance-capture-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LifecycleBadge } from "@/components/ui/lifecycle-badge"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { GlossaryTerm } from "@/components/launchpad/glossary-term"
import { RationalizationPanel } from "@/components/admin/rationalization-panel"
import { DecisionHeader } from "@/components/submissions/decision-header"
import { ChecklistItem } from "@/components/submissions/checklist-item"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { cn } from "@/lib/utils"
import { STATUS_BADGE_CLASS } from "@/lib/statusTokens"
import {
  ArrowLeft, ArrowRight, Check, X, MessageSquare, ShieldCheck, AlertTriangle, Copy, ChevronDown,
} from "lucide-react"

type Assist = Awaited<ReturnType<typeof assistReviewer>>

const HIGH_IMPACT_BADGE_LABELS: Record<string, string> = {
  high_impact: "High-impact",
  presumed_not_high_impact: "Presumed, but not high-impact",
  not_high_impact: "Not high-impact",
}

const HIGH_IMPACT_BADGE_CLASS: Record<string, string> = {
  high_impact: STATUS_BADGE_CLASS.alert,
  presumed_not_high_impact: STATUS_BADGE_CLASS.attention,
  not_high_impact: STATUS_BADGE_CLASS.neutral,
}

function newCommentId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function reportabilityLabels(tenant: TenantConfig): Record<ReportabilityStatus, string> {
  const short = tenant.inventoryShortLabel
  return {
    reportable: `Reportable to ${short}`,
    excluded: `Excluded from ${tenant.inventoryLabel}`,
    review: `Needs review (${short})`,
  }
}

// Active blue is reserved for interactive elements (guardrail), so a purely
// informational compliance fact like "reportable" reads neutral ink, not
// blue — only "review" (needs a reviewer decision) earns the amber
// attention color.
const REPORTABILITY_CLASSES: Record<ReportabilityStatus, string> = {
  reportable: STATUS_BADGE_CLASS.neutral,
  excluded: STATUS_BADGE_CLASS.neutral,
  review: STATUS_BADGE_CLASS.attention,
}

function RiskRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", ok ? STATUS_BADGE_CLASS.healthy : STATUS_BADGE_CLASS.alert)}>
      {ok ? <ShieldCheck className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  )
}

export function SubmissionDetail({ id }: { id: string }) {
  const tenant = getTenant()
  const tiers = tenant.tierLabels
  const { loaded, refetchSubmissions } = useDataProvider()
  const [sub, setSub] = useState<Submission | null>(null)
  const [ready, setReady] = useState(false)
  const [assist, setAssist] = useState<Assist | null>(null)
  const [assisting, setAssisting] = useState(false)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [rmfOverrideNote, setRmfOverrideNote] = useState("")
  const [rmfOverriding, setRmfOverriding] = useState(false)
  const [complianceOpen, setComplianceOpen] = useState(false)
  const [highlightedItem, setHighlightedItem] = useState<"dispose" | "rationalization" | null>(null)
  const ranRef = useRef(false)
  const disposeRef = useRef<HTMLLIElement>(null)
  const rationalizationRef = useRef<HTMLLIElement>(null)

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

  // NIST AI RMF profile (lib/nistRmf.ts + lib/rmfProfileReview.ts) — computed
  // at submission and shown to reviewers as a proposal they confirm or
  // override, gated on the tenant's `rmf` feature flag so non-RMF tenants
  // (USPTO/DoW) are unaffected.
  const rmfEnabled = !!tenant.features.rmf
  const resolvedRmf = rmfEnabled ? resolveRmfProfile(sub, tenant) : null

  // Unlike similarMatches above (deliberately scoped to the viewer), the
  // rationalization gate must see the true cross-bureau cluster regardless of
  // who's approving — a bureau-scoped reviewer approving their half of a
  // cross-bureau duplicate still needs to be blocked even though they can't
  // see the other bureau's submission from their own roll-down view.
  const allSubmissions = getSubmissions()
  const clusters = clusterDuplicates(allSubmissions)
  const cluster = clusterForSubmission(sub, clusters)
  const rationalizationDecision = getRationalization(sub)
  const blockReason = rationalizationBlockReason(sub, clusters, tenant)
  const clusterMembers = cluster
    ? cluster.memberIds
        .map((cid) => allSubmissions.find((s) => s.id === cid))
        .filter((s): s is Submission => !!s && s.id !== sub.id)
    : []
  const clusterSubmissionsForPanel = cluster
    ? cluster.memberIds.map((cid) => allSubmissions.find((s) => s.id === cid)).filter((s): s is Submission => !!s)
    : []
  const leadSubmission = rationalizationDecision?.leadSubmissionId
    ? allSubmissions.find((s) => s.id === rationalizationDecision.leadSubmissionId)
    : undefined

  // Zone 1 (Decision header): "what's blocking approval" is either the hard
  // rationalization gate (the only thing that actually disables Approve
  // below), or — when nothing hard-blocks it — the assistant not recommending
  // approval, which routes the reviewer to the checklist instead of a
  // one-click approve. Advisory only: neither branch changes any
  // determination, it only decides which existing action is primary.
  const aiWantsReview = !!assist && assist.suggestedDisposition !== "approve"
  const blockingText = blockReason
    ? blockReason
    : aiWantsReview
      ? `${tenant.assistantName} flagged gaps to probe before approving — see the decision checklist below.`
      : null

  // Governance-field capture (issue #161) — the OMB 34-field inventory,
  // M-25-21 minimum-practice block, and RMF inputs that issue #160 moved out
  // of idea intake into a vetting-stage checklist item here.
  const governanceApplicable = applicableGovernanceFields(fd)
  const governanceAnswered = governanceApplicable.filter((k) => {
    const v = fd[k] as string | string[] | undefined
    return Array.isArray(v) ? v.length > 0 : !!v
  }).length
  const governanceComplete = governanceApplicable.length > 0 && governanceAnswered === governanceApplicable.length
  const governanceStatusLabel = governanceApplicable.length === 0
    ? "Nothing applicable yet"
    : governanceComplete
      ? "Complete"
      : `${governanceAnswered}/${governanceApplicable.length} fields answered`
  const governanceStatusClass = governanceApplicable.length === 0 || governanceComplete
    ? STATUS_BADGE_CLASS.healthy
    : STATUS_BADGE_CLASS.attention

  let checklistIndex = 0
  const disposeIndex = ++checklistIndex
  const highImpactIndex = ++checklistIndex
  const governanceIndex = ++checklistIndex
  const rmfIndex = resolvedRmf ? ++checklistIndex : null
  const rationalizationIndex = cluster ? ++checklistIndex : null

  const focusChecklistItem = (key: "dispose" | "rationalization") => {
    const target = key === "dispose" ? disposeRef.current : rationalizationRef.current
    target?.scrollIntoView({ behavior: "smooth", block: "center" })
    target?.focus()
    setHighlightedItem(key)
    window.setTimeout(() => {
      setHighlightedItem((cur) => (cur === key ? null : cur))
    }, 2000)
  }

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

  const confirmRmfProfile = async () => {
    if (!resolvedRmf) return
    setBusy(true)
    await patchSubmissionFormData(
      sub.id,
      buildRmfProfileReviewPatch("confirmed", resolvedRmf.profile, {
        byName: session?.name || session?.email || "Reviewer",
        byEmail: session?.email || "",
        at: new Date().toISOString(),
      }),
    )
    setRmfOverriding(false)
    await reload()
    setBusy(false)
  }

  const overrideRmfProfile = async (overriddenOverall: RmfRiskLevel) => {
    if (!resolvedRmf) return
    setBusy(true)
    await patchSubmissionFormData(
      sub.id,
      buildRmfProfileReviewPatch("overridden", resolvedRmf.profile, {
        byName: session?.name || session?.email || "Reviewer",
        byEmail: session?.email || "",
        at: new Date().toISOString(),
        overriddenOverall,
        notes: rmfOverrideNote.trim() || undefined,
      }),
    )
    setRmfOverriding(false)
    setRmfOverrideNote("")
    await reload()
    setBusy(false)
  }

  const rmfStatusLabel = resolvedRmf
    ? resolvedRmf.review
      ? resolvedRmf.review.decision === "overridden"
        ? "Overridden"
        : "Confirmed"
      : "Proposed — awaiting reviewer"
    : ""
  const rmfStatusClass = resolvedRmf ? (resolvedRmf.review ? STATUS_BADGE_CLASS.healthy : STATUS_BADGE_CLASS.attention) : ""

  const rationalizationStatusLabel = blockReason
    ? "Rationalization pending"
    : rationalizationDecision?.decision === "consolidated"
      ? "Consolidated"
      : "Keep separate"
  const rationalizationStatusClass = blockReason ? STATUS_BADGE_CLASS.attention : STATUS_BADGE_CLASS.healthy

  return (
    <div className="space-y-5 max-w-3xl">
      <Link href="/home" className="text-sm text-uspto-blue-primary hover:underline"><ArrowLeft className="w-4 h-4 inline mr-1" />Back</Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{fd.useCaseTitle || "Untitled idea"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {businessUnitLabel(getBusinessUnit(sub))} · {fd.submitterName || "Anonymous"} · submitted {new Date(sub.submittedAt).toLocaleDateString()}
            {getAssigneeName(sub) ? ` · assigned to ${getAssigneeName(sub)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <LifecycleBadge submission={sub} />
          <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", statusBadgeClasses(status))}>{STATUS_LABEL[status]}</Badge>
        </div>
      </div>

      {showBureauTier && bureauSignoff && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          {bureauSignoff.decision === "rejected" ? "Rejected" : "Signed off"} by {bureauSignoff.signedOffByName}, {businessUnitLabel(bureauSignoff.bureau)}, {new Date(bureauSignoff.signedOffAt).toLocaleDateString()}
        </p>
      )}

      {/* Zone 1: the assistant's rolled-up recommendation, what's blocking approval, one primary action. */}
      {isReviewer && (
        <DecisionHeader
          assistantName={tenant.assistantName}
          assisting={assisting}
          assist={assist}
          blockingText={blockingText}
          busy={busy}
          onApprove={() => setStatus("approved")}
          onResolveBlocker={() => focusChecklistItem(blockReason ? "rationalization" : "dispose")}
        />
      )}

      {/* OS/department final-approval confirmation — a distinct persona's decision, kept as-is (follow-up UX work tracked separately). */}
      {showBureauTier && deptTierEnabled && isDeptViewer && bureauSignoff && (
        <div className={cn("rounded-lg border border-l-4 bg-card p-4 space-y-2", departmentApproval ? "border-l-healthy" : "border-l-attention")}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{tiers.department} final approval</span>
            <Badge
              variant="outline"
              className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", departmentApproval ? STATUS_BADGE_CLASS.healthy : STATUS_BADGE_CLASS.attention)}
            >
              {departmentApproval
                ? departmentApproval.decision === "approved"
                  ? "Confirmed"
                  : "Confirmed rejection"
                : `Awaiting ${tiers.department.toLowerCase()} confirmation`}
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

      {/* Zone 2: guided decision checklist — only the items that need the reviewer, in order. */}
      {isReviewer && (
        <section aria-labelledby="checklist-heading" className="space-y-3">
          <h2 id="checklist-heading" className="text-sm font-semibold text-foreground">
            Decision checklist
          </h2>
          <ol className="space-y-3">
            <ChecklistItem
              ref={disposeRef}
              index={disposeIndex}
              title="Disposition"
              statusLabel={STATUS_LABEL[status]}
              statusClassName={statusBadgeClasses(status)}
              highlighted={highlightedItem === "dispose"}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setStatus("approved")} disabled={busy || !!blockReason} title={blockReason}>
                  <Check className="w-4 h-4 mr-1.5" />Approve
                </Button>
                <Button variant="outline" onClick={() => document.getElementById("comment-box")?.focus()} disabled={busy}>
                  <MessageSquare className="w-4 h-4 mr-1.5" />Request info
                </Button>
                <Button variant="outline" onClick={() => setStatus("rejected")} disabled={busy}>
                  <X className="w-4 h-4 mr-1.5" />Reject
                </Button>
              </div>
              {blockReason && (
                <p className="flex items-center gap-1.5 text-xs text-attention-foreground">
                  <AlertTriangle className="w-3.5 h-3.5 flex-none" />
                  {blockReason}
                </p>
              )}
            </ChecklistItem>

            <ChecklistItem
              index={highImpactIndex}
              title={<GlossaryTerm term="highImpactDetermination">High-impact determination</GlossaryTerm>}
              statusLabel={fd.highImpact ? HIGH_IMPACT_BADGE_LABELS[fd.highImpact] || "Not yet set" : "Not yet set"}
              statusClassName={fd.highImpact ? HIGH_IMPACT_BADGE_CLASS[fd.highImpact] : STATUS_BADGE_CLASS.attention}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Recommended:</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.06em]",
                    highImpactRec.recommendation === "yes" ? STATUS_BADGE_CLASS.alert : STATUS_BADGE_CLASS.neutral,
                  )}
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
              </div>
            </ChecklistItem>

            <ChecklistItem
              index={governanceIndex}
              title="Complete the use case"
              statusLabel={governanceStatusLabel}
              statusClassName={governanceStatusClass}
            >
              <GovernanceCapturePanel
                submission={sub}
                assistantName={tenant.assistantName}
                byName={session?.name || session?.email || "Reviewer"}
                byEmail={session?.email || ""}
                busy={busy}
                setBusy={setBusy}
                onSaved={reload}
              />
            </ChecklistItem>

            {resolvedRmf && rmfIndex && (
              <ChecklistItem
                index={rmfIndex}
                title={<GlossaryTerm term="nistAiRmf">NIST AI RMF</GlossaryTerm>}
                statusLabel={rmfStatusLabel}
                statusClassName={rmfStatusClass}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", rmfBadgeClass(resolvedRmf.effectiveOverall))} title={resolvedRmf.profile.rationale}>
                    {RMF_OVERALL_LABELS[resolvedRmf.effectiveOverall]}
                  </Badge>
                  {resolvedRmf.isProposal && (
                    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">proposed · awaiting reviewer</Badge>
                  )}
                </div>
                {resolvedRmf.review && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {resolvedRmf.review.decision === "overridden"
                      ? `Overridden to "${RMF_OVERALL_LABELS[resolvedRmf.review.overriddenOverall || resolvedRmf.review.proposedOverall]}" (proposed "${RMF_OVERALL_LABELS[resolvedRmf.review.proposedOverall]}")`
                      : "Confirmed as proposed"}
                    {" "}by {resolvedRmf.review.byName}, {new Date(resolvedRmf.review.at).toLocaleDateString()}
                    {resolvedRmf.review.notes ? ` — "${resolvedRmf.review.notes}"` : ""}
                  </p>
                )}
                {!rmfOverriding ? (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      {resolvedRmf.review ? "Reviewer decision:" : "Proposed — confirm or override:"}
                    </span>
                    <Button size="sm" disabled={busy} onClick={confirmRmfProfile}>
                      <Check className="w-3.5 h-3.5 mr-1.5" />Confirm
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => setRmfOverriding(true)}>
                      Override
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Set the overall RMF level:</span>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(RMF_OVERALL_LABELS) as RmfRiskLevel[]).map((level) => (
                        <Button
                          key={level}
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => overrideRmfProfile(level)}
                        >
                          {RMF_OVERALL_LABELS[level]}
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      value={rmfOverrideNote}
                      onChange={(e) => setRmfOverrideNote(e.target.value)}
                      placeholder="Reason for override (optional)..."
                      rows={2}
                    />
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => setRmfOverriding(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </ChecklistItem>
            )}

            {cluster && rationalizationIndex && (
              <ChecklistItem
                ref={rationalizationRef}
                index={rationalizationIndex}
                title={
                  <GlossaryTerm term="crossBureauRationalization">
                    Cross-{tiers.unit.toLowerCase()} rationalization
                  </GlossaryTerm>
                }
                statusLabel={rationalizationStatusLabel}
                statusClassName={rationalizationStatusClass}
                highlighted={highlightedItem === "rationalization"}
              >
                <p className="text-sm text-muted-foreground">
                  {blockReason
                    ? `This use case closely matches work filed under another ${tiers.unit.toLowerCase()}.`
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
                {blockReason && (
                  isDeptViewer ? (
                    <div className="pt-2 border-t">
                      <RationalizationPanel submissions={clusterSubmissionsForPanel} />
                    </div>
                  ) : (
                    <Link
                      href="/home"
                      className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-uspto-blue-primary hover:underline"
                    >
                      Resolve in the Rationalization panel
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )
                )}
              </ChecklistItem>
            )}
          </ol>
        </section>
      )}

      {/* Zone 3: compliance details, collapsed — verdict badges visible, reasoning on expand. */}
      <Collapsible open={complianceOpen} onOpenChange={setComplianceOpen} className="rounded-lg border bg-card text-card-foreground">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
            aria-expanded={complianceOpen}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ChevronDown className={cn("h-4 w-4 transition-transform", complianceOpen && "rotate-180")} aria-hidden="true" />
              Compliance details
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", REPORTABILITY_CLASSES[reportability.status])}>
                {reportabilityLabels(tenant)[reportability.status]}
              </Badge>
              <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", STATUS_BADGE_CLASS.neutral)}>
                {consolidation.status}
              </Badge>
              {resolvedRmf && (
                <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", rmfBadgeClass(resolvedRmf.effectiveOverall))}>
                  {RMF_OVERALL_LABELS[resolvedRmf.effectiveOverall]}
                </Badge>
              )}
              {isReviewer && similarMatches.length > 0 && (
                <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", STATUS_BADGE_CLASS.attention)}>
                  {similarMatches.length} similar
                </Badge>
              )}
            </span>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 border-t p-4">
          <div className="space-y-2">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <GlossaryTerm term="ombReportability">{tenant.inventoryShortLabel} reportability</GlossaryTerm>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", REPORTABILITY_CLASSES[reportability.status])}>
                {reportabilityLabels(tenant)[reportability.status]}
              </Badge>
              <span className="text-sm text-muted-foreground">{reportability.reason}</span>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <GlossaryTerm term="consolidatedIndividualReporting">{tenant.inventoryShortLabel} reporting mode</GlossaryTerm>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", STATUS_BADGE_CLASS.neutral)}>
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

          <div className="space-y-2 border-t pt-4">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Risk profile</div>
            <div className="flex flex-wrap gap-2">
              <RiskRow ok={fd.involvesSensitiveData !== "yes"} label={fd.involvesSensitiveData === "yes" ? "Uses PII" : "No PII"} />
              <RiskRow ok={fd.aiModelSourcing === "american_built" || fd.aiModelSourcing === "open_source_us"} label={fd.aiModelSourcing === "foreign" ? "Foreign model" : fd.aiModelSourcing === "unknown" || !fd.aiModelSourcing ? "Sourcing unknown" : "American-built"} />
              <RiskRow ok={fd.aiHumanReview === "yes"} label={fd.aiHumanReview === "yes" ? "Human review: yes" : "No human review"} />
              <RiskRow ok={fd.aiDecisionalImpact !== "yes"} label={fd.aiDecisionalImpact === "yes" ? "Decisional AI" : "Non-decisional"} />
            </div>
          </div>

          {fd.highImpact === "high_impact" && (
            <div className="space-y-2 border-t pt-4">
              <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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

          {!isReviewer && (
            <div className="space-y-2 border-t pt-4">
              <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <GlossaryTerm term="highImpactDetermination">High-impact determination</GlossaryTerm>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Recommended:</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.06em]",
                    highImpactRec.recommendation === "yes" ? STATUS_BADGE_CLASS.alert : STATUS_BADGE_CLASS.neutral,
                  )}
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
                <Badge variant="outline">{HIGH_IMPACT_BADGE_LABELS[fd.highImpact] || "Not yet set"}</Badge>
              </div>
            </div>
          )}

          {resolvedRmf && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <GlossaryTerm term="nistAiRmf">NIST AI RMF</GlossaryTerm> breakdown
                </div>
                <GlossaryTerm term="coveredPartialGap" className="text-[11px] text-muted-foreground">
                  covered / partial / gap
                </GlossaryTerm>
              </div>
              <div className="space-y-2">
                {RMF_FUNCTION_ORDER.map((key) => {
                  const result = resolvedRmf.profile.functions[key]
                  return (
                    <div key={key} className="flex flex-wrap items-start gap-2">
                      <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", rmfFunctionStatusBadgeClass(result.status))}>
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

          {isReviewer && similarMatches.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-attention-foreground" />
                <span className="font-medium text-sm">Similar use cases</span>
                <GlossaryTerm term="tokenOverlapMatch" className="text-[10px] text-muted-foreground">
                  token-overlap match
                </GlossaryTerm>
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
        </CollapsibleContent>
      </Collapsible>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Submission</div>
        {([
          [
            "Affected business units",
            (fd.affectedBusinessUnits || [])
              .map((v) => tenant.affectedSystems.find((o) => o.value === v)?.label || v)
              .join(", "),
          ],
          [
            "Client sponsor",
            fd.sponsorName ? `${fd.sponsorName}${fd.sponsorRole ? ` (${fd.sponsorRole})` : ""}` : "",
          ],
          ["Internal or external", fd.deliveryAudience === "internal" ? "Internal" : fd.deliveryAudience === "external" ? "External" : ""],
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

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Conversation with submitter</div>
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
                  <PlumbMark className="w-3.5 h-3.5 mr-1.5" />Draft with {tenant.assistantName}
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
