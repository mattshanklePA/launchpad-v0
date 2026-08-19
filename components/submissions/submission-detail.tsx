"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
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
  getLifecycleStage,
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
import { assistReviewer, draftGovernanceFields } from "@/app/actions"
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
import { applicableGovernanceFields, getGovernanceCaptureReview, governanceCaptureCounts, governanceFieldValueLabel } from "@/lib/governanceCapture"
import { FIELD_REGISTRY_BY_KEY } from "@/lib/fieldRegistry"
import { buildActivity } from "@/lib/activity"
import { GovernanceCapturePanel } from "@/components/submissions/governance-capture-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlossaryTerm } from "@/components/launchpad/glossary-term"
import { RationalizationPanel } from "@/components/admin/rationalization-panel"
import { ChecklistItem } from "@/components/submissions/checklist-item"
import { DecisionTab } from "@/components/submissions/decision-tab"
import { ComplianceGrid, type ComplianceGridItem } from "@/components/submissions/compliance-grid"
import { ReviewerHeader } from "@/components/submissions/reviewer-header"
import { ReviewerRail } from "@/components/submissions/reviewer-rail"
import { ReviewProcess } from "@/components/submissions/review-process"
import { ReviewProcessRail } from "@/components/submissions/review-process-rail"
import { ReviewProcessLoading } from "@/components/submissions/review-process-loading"
import { buildReviewSteps, defaultReviewStep, type ReviewStepKey } from "@/lib/reviewSteps"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { cn } from "@/lib/utils"
import { STATUS_BADGE_CLASS } from "@/lib/statusTokens"
import { PRIMARY_COLUMN_CLASS } from "@/lib/layoutTokens"
import { formatKeystoneDate, shortBusinessUnitLabel } from "@/components/dashboard/command-center-data"
import {
  ArrowLeft, ArrowRight, Check, X, ShieldCheck, AlertTriangle, Copy, ChevronDown,
} from "lucide-react"

type Assist = Awaited<ReturnType<typeof assistReviewer>>

const HIGH_IMPACT_BADGE_LABELS: Record<string, string> = {
  high_impact: "High-impact",
  presumed_not_high_impact: "Presumed, but not high-impact",
  not_high_impact: "Not high-impact",
}

// Underline-tab styling (mock 07 Reviewer Detail - Decided.dc.html, DIVERGENCES.md
// item 5): overrides components/ui/tabs.tsx's default pill/bg-muted look for
// this page only — every other Tabs usage (app/admin/page.tsx) keeps the
// shared default, so the base component itself isn't touched.
const TABS_LIST_CLASS = "h-auto w-full items-center justify-start gap-1 rounded-none border-b border-border bg-transparent p-0"
const TAB_TRIGGER_CLASS = "h-auto shrink-0 rounded-none border-b-2 border-transparent px-4 py-2.5 font-heading text-[14px] font-semibold text-muted-foreground shadow-none data-[state=active]:border-keystone-activeBlue data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"

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

/**
 * The reviewer's own words for why a decided record landed where it did: the
 * most recent reviewer/admin comment at or after the decision. Falls back to
 * "No reason was recorded." — there is no separate department-approval or
 * sign-off "note" field in the data model (`lib/bureauSignoff.ts`'s
 * `BureauSignoff`/`DepartmentApproval` carry a decision + who/when, not a
 * reason), so that middle fallback the issue describes never has a source to
 * read from today.
 */
function decisionReasonText(sub: Submission, decidedAt: string | undefined): string {
  const reviewerComments = getComments(sub).filter((c) => {
    if (c.authorRole !== "reviewer" && c.authorRole !== "admin") return false
    if (!decidedAt) return true
    return new Date(c.createdAt).getTime() >= new Date(decidedAt).getTime()
  })
  return reviewerComments[reviewerComments.length - 1]?.body || "No reason was recorded."
}

export function SubmissionDetail({ id }: { id: string }) {
  const tenant = getTenant()
  const tiers = tenant.tierLabels
  const router = useRouter()
  const pathname = usePathname()
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
  const [governanceExpanded, setGovernanceExpanded] = useState(false)
  const [highlightedItem, setHighlightedItem] = useState<"dispose" | "rationalization" | null>(null)
  const [tab, setTab] = useState("decision")
  // RD-6 (issue #207): the guided review process's current step + escape
  // hatch out of the pre-resolution loading page. `currentStepKey` stays
  // null until the reviewer navigates — the render path falls back to
  // `defaultReviewStep` (the first unsettled step) rather than syncing it
  // via an effect, so there's nothing to keep in sync.
  const [currentStepKey, setCurrentStepKey] = useState<ReviewStepKey | null>(null)
  const [forceShowSteps, setForceShowSteps] = useState(false)
  const [governanceDraftReady, setGovernanceDraftReady] = useState(false)
  const ranRef = useRef(false)
  const govDraftRanRef = useRef(false)
  const rationalizationRef = useRef<HTMLLIElement>(null)

  const session = typeof window !== "undefined" ? getSession() : null
  const role = session?.role || "submitter"
  const isReviewer = role === "reviewer" || role === "admin"

  // Deep-linkable tabs (`?tab=decision|governance|conversation`, issue #206)
  // — read once on mount, same pattern as app/admin/page.tsx, so no Suspense
  // boundary is needed for a plain query read.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab")
    if (t === "decision" || t === "governance" || t === "conversation") setTab(t)
  }, [])

  const changeTab = (next: string) => {
    setTab(next)
    const params = new URLSearchParams(window.location.search)
    params.set("tab", next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

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

  // RD-6 (issue #207): drives PlumbProgress's "drafting governance fields"
  // stage on the pre-resolution loading page independently of
  // GovernanceCapturePanel's own draft call (step 4 hasn't mounted yet while
  // loading) — read-only, the draft itself is discarded here and re-fetched
  // by the panel once the reviewer actually reaches step 4.
  useEffect(() => {
    if (!sub || govDraftRanRef.current || !isReviewer) return
    govDraftRanRef.current = true
    draftGovernanceFields(sub.formData).finally(() => setGovernanceDraftReady(true))
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
  const decided = status === "approved" || status === "rejected"
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
  const governanceReview = getGovernanceCaptureReview(sub)
  const { draftedByPlumb, confirmedByReviewer } = governanceCaptureCounts(governanceReview)
  const governanceExamples = (governanceReview?.entries || []).filter((e) => e.rationale).slice(0, 2)

  // Only the rationalization item still needs a running index — it's the
  // sole survivor of the old checklist's dynamic numbering now that RD-6
  // (issue #207) replaced the rest with the guided process below; the
  // governance tab's other items (still shown for decided records) use
  // literal numbers (1 · high-impact, 2 · complete the use case, 3 · RMF).
  // Same numbers the old running counter produced: dispose(1) + highImpact(2)
  // + governance(3) + rmf(4, if present) precede this one.
  const rationalizationIndex = cluster ? (resolvedRmf ? 5 : 4) : null

  // RD-6 (issue #207): "review is a process" — the guided in-review process
  // that replaces this branch's body for a reviewer viewing an undecided
  // record (below). Step applicability/settledness reuses exactly the same
  // values the checklist above reads — no new determinations, no change to
  // canApprove/blockReason/the RMF review logic.
  const reviewSteps = buildReviewSteps({
    hasCluster: !!cluster,
    clusterSettled: !blockReason,
    highImpactSettled: !!fd.highImpact,
    rmfEnabled,
    rmfSettled: !!resolvedRmf?.review,
    governanceSettled: governanceComplete,
    dispositionSettled: status === "needs_info",
  })
  const currentReviewStepKey = currentStepKey ?? defaultReviewStep(reviewSteps)
  const navigateToStep = (key: ReviewStepKey) => {
    setForceShowSteps(true)
    setCurrentStepKey(key)
  }
  // Gated on `assisting` alone (mock 09's "the process page mounts before
  // the read resolves") — everything the steps themselves need (cluster,
  // determinations, governance fields) is derived from the record, not from
  // Plumb's advisory read, so there's nothing else to block on. The escape
  // hatch (`forceShowSteps`, wired to "Read the submission" in
  // ReviewProcessLoading and to the rail's step rows) lets a reviewer start
  // working the steps immediately, per "you don't have to wait."
  const awaitingPlumb = isReviewer && !decided && assisting && !forceShowSteps

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

  // Header/rail (issue #206) — decision attribution + reversibility. The
  // decision and the bureau sign-off are the same recorded action (setStatus
  // above patches both together for bureau-tier tenants), so they share one
  // "by/when" source. Tenants without a bureau tier never record who decided
  // or when at all — the header/rail fall back to omitting that clause
  // rather than fabricating a name or a date.
  const decision: "approved" | "rejected" | undefined = decided ? (status as "approved" | "rejected") : undefined
  const signedOff = showBureauTier ? bureauSignoff : undefined
  const decidedAt = signedOff?.signedOffAt
  const decidedByName = signedOff?.signedOffByName
  const decidedByUnitShort = signedOff ? shortBusinessUnitLabel(signedOff.bureau) : undefined
  const reasonText = decided ? decisionReasonText(sub, decidedAt) : ""
  const reversibilityText = signedOff
    ? `Signed off ${formatKeystoneDate(signedOff.signedOffAt)}; contact the office to reopen.`
    : `Reversible until ${tiers.unit.toLowerCase()} sign-off.`
  const showDispositionButtons = !signedOff
  const activity = buildActivity(sub)

  const complianceItems: ComplianceGridItem[] = [
    {
      eyebrow: `${tiers.department} reporting mode`,
      value: consolidation.status === "Individual"
        ? "Individual use case"
        : `Consolidated${consolidation.categoryLabel ? ` · ${consolidation.categoryLabel}` : ""}`,
    },
    {
      eyebrow: `${tenant.inventoryShortLabel} reportability`,
      value: reportabilityLabels(tenant)[reportability.status],
    },
    ...(resolvedRmf
      ? [{
          eyebrow: "NIST AI RMF",
          value: resolvedRmf.review ? rmfStatusLabel : `${RMF_OVERALL_LABELS[resolvedRmf.effectiveOverall]} · proposed`,
        }]
      : []),
    {
      eyebrow: "Similar use cases",
      value: similarMatches.length > 0 ? `${similarMatches.length} similar on record` : "None on record",
      onClick: similarMatches.length > 0 ? () => setComplianceOpen(true) : undefined,
    },
  ]

  return (
    <div className="flex flex-col items-stretch gap-[18px] lg:flex-row lg:items-start">
      <div className={cn(PRIMARY_COLUMN_CLASS, "min-w-0 flex-1 space-y-[18px]")}>
        <Link href="/home" className="text-sm text-uspto-blue-primary hover:underline"><ArrowLeft className="w-4 h-4 inline mr-1" />Back</Link>

        {isReviewer && !decided ? (
          awaitingPlumb ? (
            <ReviewProcessLoading
              submissionId={sub.id}
              totalSteps={reviewSteps.length}
              reviewerName={session?.name || "Reviewer"}
              assistantName={tenant.assistantName}
              governanceDone={governanceDraftReady}
              recommendationDone={!assisting}
              onSkipToSteps={() => setForceShowSteps(true)}
            />
          ) : (
            <ReviewProcess
              submission={sub}
              tenant={tenant}
              status={status}
              reviewerName={session?.name || "Reviewer"}
              busy={busy}
              setBusy={setBusy}
              assistantName={tenant.assistantName}
              steps={reviewSteps}
              currentStepKey={currentReviewStepKey}
              onNavigateStep={navigateToStep}
              cluster={cluster}
              clusterAllMembers={clusterSubmissionsForPanel}
              rationalizationDecision={rationalizationDecision}
              onClusterDecided={reload}
              fd={fd}
              highImpactRec={highImpactRec}
              onSetHighImpact={setHighImpact}
              resolvedRmf={resolvedRmf}
              rmfOverriding={rmfOverriding}
              setRmfOverriding={setRmfOverriding}
              rmfOverrideNote={rmfOverrideNote}
              setRmfOverrideNote={setRmfOverrideNote}
              onConfirmRmf={confirmRmfProfile}
              onOverrideRmf={overrideRmfProfile}
              governanceApplicableCount={governanceApplicable.length}
              draftedByPlumb={draftedByPlumb}
              confirmedByReviewer={confirmedByReviewer}
              byName={session?.name || session?.email || "Reviewer"}
              byEmail={session?.email || ""}
              onGovernanceSaved={reload}
              blockReason={blockReason}
              onApprove={() => setStatus("approved")}
              onRequestInfo={() => document.getElementById("comment-box")?.focus()}
              onReject={() => setStatus("rejected")}
              comment={comment}
              onCommentChange={setComment}
              onSend={() => postComment("needs_info")}
              sendDisabled={busy || !comment.trim()}
              onDraftWithPlumb={() => assist?.draftRequestInfo && setComment(assist.draftRequestInfo)}
              draftDisabled={busy || assisting}
            />
          )
        ) : (
          <>
        <ReviewerHeader
          slugTail={sub.id.slice(0, 8)}
          lifecycleStage={getLifecycleStage(sub)}
          title={fd.useCaseTitle || "Untitled idea"}
          unitLabel={businessUnitLabel(getBusinessUnit(sub))}
          submitterName={fd.submitterName || "Anonymous"}
          submittedAt={sub.submittedAt}
          status={status}
          decision={decision}
          decidedAt={decidedAt}
          decidedByName={decidedByName}
          decidedByUnitShort={decidedByUnitShort}
        />

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

        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList className={TABS_LIST_CLASS}>
            <TabsTrigger value="decision" className={TAB_TRIGGER_CLASS}>{decided ? "The decision" : "Review"}</TabsTrigger>
            <TabsTrigger value="governance" className={TAB_TRIGGER_CLASS}>Governance record</TabsTrigger>
            <TabsTrigger value="conversation" className={TAB_TRIGGER_CLASS}>
              Conversation <span className="ml-1 font-mono text-[11px] text-muted-foreground">({comments.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="decision" className="space-y-[18px] pt-[18px]">
            {decided ? (
              <DecisionTab
                reasonText={reasonText}
                decision={decision!}
                status={status}
                busy={busy}
                onApprove={() => setStatus("approved")}
                onReject={() => setStatus("rejected")}
                onRequestInfo={() => document.getElementById("comment-box")?.focus()}
                reversibilityText={reversibilityText}
                showDispositionButtons={showDispositionButtons}
                assistantName={tenant.assistantName}
                assisting={assisting}
                assist={assist}
                comments={comments}
                submitterFirstName={(fd.submitterName || "the submitter").split(" ")[0]}
                comment={comment}
                onCommentChange={setComment}
                onSend={() => postComment("needs_info")}
                sendDisabled={busy || !comment.trim()}
                onDraftWithPlumb={() => assist?.draftRequestInfo && setComment(assist.draftRequestInfo)}
                draftDisabled={busy || assisting}
                onSeeAllConversation={() => changeTab("conversation")}
              />
            ) : (
              // Undecided ("in review") records keep today's whole page —
              // Zone 1 recommendation, the full decision checklist, the
              // compliance collapsible, the submission recap, and the
              // conversation thread — unchanged, just relabeled "Review" and
              // moved under this tab (issue #206 section 8: RD-6 replaces
              // this body with the guided in-review process; until then
              // nothing here is lost or duplicative-by-omission).
              <>
                {/* This branch only ever renders for a submitter viewing their own undecided submission — a reviewer takes the `isReviewer && !decided` branch above (RD-6, issue #207's guided process) instead, so nothing reviewer-only belongs here. */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Submission</div>
                  {([
                    [
                      `Affected ${tenant.tierLabels.unitPlural}`,
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
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[13px] font-medium flex-shrink-0">
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
              </>
            )}
          </TabsContent>

          <TabsContent value="governance" className="space-y-[18px] pt-[18px]">
            {isReviewer && (
              <div className="space-y-[18px]">
                <div className="space-y-3 rounded-lg border border-border-subtle bg-card p-5">
                  <div className="font-heading text-[18px] font-bold text-foreground">Decision checklist</div>

                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="ks-microlabel"><GlossaryTerm term="highImpactDetermination">1 · High-impact determination</GlossaryTerm></span>
                      {fd.highImpact && <span className="ks-microlabel text-healthy-foreground">Settled</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Recommended:</span>
                      <Badge
                        variant="outline"
                        className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", highImpactRec.recommendation === "yes" ? STATUS_BADGE_CLASS.alert : STATUS_BADGE_CLASS.neutral)}
                      >
                        {highImpactRec.recommendation === "yes" ? "High-impact" : "Not high-impact"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-sm text-muted-foreground">Reviewer determination:</span>
                      <Button size="sm" variant={fd.highImpact === "high_impact" ? "default" : "outline"} disabled={busy} onClick={() => setHighImpact("high_impact")}>
                        High-impact
                      </Button>
                      <Button size="sm" variant={fd.highImpact === "presumed_not_high_impact" ? "default" : "outline"} disabled={busy} onClick={() => setHighImpact("presumed_not_high_impact")}>
                        Presumed, but not high-impact
                      </Button>
                      <Button size="sm" variant={fd.highImpact === "not_high_impact" ? "default" : "outline"} disabled={busy} onClick={() => setHighImpact("not_high_impact")}>
                        Not high-impact
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 border-t border-border-default pt-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="ks-microlabel">2 · Complete the use case</span>
                      <button type="button" className="text-[13px] font-semibold text-primary hover:underline" onClick={() => setGovernanceExpanded((v) => !v)}>
                        All {governanceApplicable.length} fields
                      </button>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      All {governanceApplicable.length} fields · {draftedByPlumb} drafted by {tenant.assistantName}, {confirmedByReviewer} confirmed by the reviewer.
                      {governanceExamples.length > 0 ? " Two examples:" : ""}
                    </p>
                    {governanceExamples.map((entry) => (
                      <div key={entry.field} className="flex flex-col gap-1 border-t border-border-subtle py-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[13.5px] font-semibold text-foreground">{FIELD_REGISTRY_BY_KEY[entry.field]?.label || entry.field}</span>
                          <span className="ks-microlabel text-foreground-faint">{tenant.assistantName} proposes</span>
                        </div>
                        <div className="text-[14px] text-foreground">{governanceFieldValueLabel(entry.field, entry.proposedValue)}</div>
                        <div className="text-[12.5px] text-muted-foreground">{entry.rationale}</div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="flex items-center gap-1 self-start text-[13px] font-semibold text-primary hover:underline"
                      aria-expanded={governanceExpanded}
                      onClick={() => setGovernanceExpanded((v) => !v)}
                    >
                      {governanceExpanded ? "Hide fields" : "Expand all fields"}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", governanceExpanded && "rotate-180")} aria-hidden="true" />
                    </button>
                    {governanceExpanded && (
                      <div className="border-t border-border-subtle pt-3">
                        <GovernanceCapturePanel
                          submission={sub}
                          assistantName={tenant.assistantName}
                          byName={session?.name || session?.email || "Reviewer"}
                          byEmail={session?.email || ""}
                          busy={busy}
                          setBusy={setBusy}
                          onSaved={reload}
                        />
                      </div>
                    )}
                  </div>

                  {resolvedRmf && (
                    <div className="flex flex-col gap-2.5 border-t border-border-default pt-4">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="ks-microlabel"><GlossaryTerm term="nistAiRmf">3 · NIST AI RMF</GlossaryTerm></span>
                        <span className={cn("ks-microlabel", resolvedRmf.review ? "text-healthy-foreground" : "text-attention-foreground")}>{rmfStatusLabel}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("font-mono text-[10px] uppercase tracking-[0.06em]", rmfBadgeClass(resolvedRmf.effectiveOverall))} title={resolvedRmf.profile.rationale}>
                          {RMF_OVERALL_LABELS[resolvedRmf.effectiveOverall]}
                        </Badge>
                        {resolvedRmf.isProposal && (
                          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.06em] bg-muted text-muted-foreground">proposed · awaiting reviewer</Badge>
                        )}
                      </div>
                      {resolvedRmf.review && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {resolvedRmf.review.decision === "overridden"
                            ? `Overridden to "${RMF_OVERALL_LABELS[resolvedRmf.review.overriddenOverall || resolvedRmf.review.proposedOverall]}" (proposed "${RMF_OVERALL_LABELS[resolvedRmf.review.proposedOverall]}")`
                            : "Confirmed as proposed"}
                          {" "}by {resolvedRmf.review.byName}, {new Date(resolvedRmf.review.at).toLocaleDateString()}
                          {resolvedRmf.review.notes ? ` — "${resolvedRmf.review.notes}"` : ""}
                        </p>
                      )}
                      {!rmfOverriding ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
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
                        <div className="space-y-2 pt-1">
                          <span className="text-sm text-muted-foreground">Set the overall RMF level:</span>
                          <div className="flex flex-wrap gap-2">
                            {(Object.keys(RMF_OVERALL_LABELS) as RmfRiskLevel[]).map((level) => (
                              <Button key={level} size="sm" variant="outline" disabled={busy} onClick={() => overrideRmfProfile(level)}>
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
                    </div>
                  )}
                </div>

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
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-border-subtle bg-card p-5">
              <div className="font-heading text-[18px] font-bold text-foreground">Compliance</div>
              <ComplianceGrid items={complianceItems} />
            </div>

            {/* Zone 3 (pre-tab collapsible details) — kept for the fuller risk-profile/RMF-breakdown/similar-matches reasoning the Compliance card summarizes above; expands from the same "Similar use cases" link. */}
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
                      <GlossaryTerm term="coveredPartialGap" className="text-[13px] text-muted-foreground">
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
                      <GlossaryTerm term="tokenOverlapMatch" className="text-[13px] text-muted-foreground">
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
          </TabsContent>

          <TabsContent value="conversation" className="space-y-[18px] pt-[18px]">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Conversation with submitter</div>
              {comments.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[13px] font-medium flex-shrink-0">
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
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>

      <div className="w-full shrink-0 lg:w-[300px]">
        {isReviewer && !decided ? (
          <ReviewProcessRail
            submission={sub}
            tenant={tenant}
            activity={activity}
            lifecycleStage={getLifecycleStage(sub)}
            title={fd.useCaseTitle || "Untitled idea"}
            unitLabel={businessUnitLabel(getBusinessUnit(sub))}
            submitterName={fd.submitterName || "Anonymous"}
            submittedAt={sub.submittedAt}
            steps={reviewSteps}
            currentStepKey={currentReviewStepKey}
            onNavigateStep={navigateToStep}
            awaitingPlumb={awaitingPlumb}
            draftedByPlumb={draftedByPlumb}
            assistantName={tenant.assistantName}
            busy={busy}
            onReject={() => setStatus("rejected")}
            comment={comment}
            onCommentChange={setComment}
            onSend={() => postComment("needs_info")}
            sendDisabled={busy || !comment.trim()}
            onDraftWithPlumb={() => assist?.draftRequestInfo && setComment(assist.draftRequestInfo)}
            draftDisabled={busy || assisting}
          />
        ) : (
          <ReviewerRail submission={sub} tenant={tenant} activity={activity} />
        )}
      </div>
    </div>
  )
}
