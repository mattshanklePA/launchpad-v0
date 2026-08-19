"use client"

// RD-6 (issue #207): "review is a process, not one surface" (DIVERGENCES.md
// item 5, mock `08 Reviewer Detail - Rationalization.dc.html`) — the
// undecided ("in review") body, replacing RD-5 item 8's "Review" tab
// checklist with a 5-step guided process: one question, one card, per
// screen. Step order/settledness comes from lib/reviewSteps.ts; nothing here
// changes a determination, `canApprove`, `rationalizationBlockReason`, the
// RMF review logic, or GovernanceCapturePanel's internals — this only
// reframes the same checklist RD-5 already built as a sequence.

import { useState } from "react"
import { AlertTriangle, ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { PlumbClusterRecommendation } from "@/components/clusters/plumb-cluster-recommendation"
import { ClusterMembers } from "@/components/clusters/cluster-members"
import { ClusterDecision } from "@/components/clusters/cluster-decision"
import { HighImpactPanel } from "@/components/submissions/high-impact-panel"
import { RmfPanel } from "@/components/submissions/rmf-panel"
import { GovernanceCapturePanel } from "@/components/submissions/governance-capture-panel"
import { DispositionControls } from "@/components/submissions/disposition-controls"
import type { Submission } from "@/lib/submissions"
import type { FormData } from "@/lib/steps"
import type { TenantConfig } from "@/lib/tenant"
import type { SubmissionStatus } from "@/lib/reviewWorkflow"
import type { HighImpactResult } from "@/lib/highImpactDetermination"
import type { ResolvedRmfProfile } from "@/lib/rmfProfileReview"
import type { RmfRiskLevel } from "@/lib/nistRmf"
import type { RationalizationCluster, Rationalization } from "@/lib/rationalization"
import { nextReviewStep, previousReviewStep, type ReviewStep, type ReviewStepKey } from "@/lib/reviewSteps"
import { PLUMB_PROGRESS_MIN_HEIGHT_CLASS } from "@/components/launchpad/plumb-progress"
import { spellCount, uniqueSlugTail } from "@/components/dashboard/command-center-data"
import { cn } from "@/lib/utils"

export const STEP_TITLE: Record<ReviewStepKey, string> = {
  cluster: "Is this one effort, or {n}?",
  high_impact: "Is this high-impact AI?",
  rmf: "Does the NIST AI RMF profile hold?",
  governance: "Are the inventory fields right?",
  disposition: "Approve, request info, or reject",
}

/** The rail's short label for a step (mock 08's "Your progress" list). */
export const STEP_RAIL_LABEL: Record<ReviewStepKey, string> = {
  cluster: "Duplicate cluster",
  high_impact: "High-impact determination",
  rmf: "NIST AI RMF",
  governance: "Inventory fields",
  disposition: "Approve, request info, or reject",
}

function stepTitle(key: ReviewStepKey, clusterCount: number): string {
  return STEP_TITLE[key].replace("{n}", spellCount(clusterCount).toLowerCase())
}

export type ReviewProcessProps = {
  submission: Submission
  tenant: TenantConfig
  status: SubmissionStatus
  reviewerName: string
  busy: boolean
  setBusy: (b: boolean) => void
  assistantName: string

  steps: ReviewStep[]
  currentStepKey: ReviewStepKey
  onNavigateStep: (key: ReviewStepKey) => void

  // Step 1 — duplicate cluster.
  cluster?: RationalizationCluster
  clusterAllMembers: Submission[]
  rationalizationDecision?: Rationalization
  onClusterDecided: () => void | Promise<void>

  // Step 2 — high-impact determination.
  fd: FormData
  highImpactRec: HighImpactResult
  onSetHighImpact: (next: "high_impact" | "presumed_not_high_impact" | "not_high_impact") => void

  // Step 3 — NIST AI RMF (only present when `steps` includes "rmf").
  resolvedRmf: ResolvedRmfProfile | null
  rmfOverriding: boolean
  setRmfOverriding: (v: boolean) => void
  rmfOverrideNote: string
  setRmfOverrideNote: (v: string) => void
  onConfirmRmf: () => void
  onOverrideRmf: (level: RmfRiskLevel) => void

  // Step 4 — inventory fields (GovernanceCapturePanel, unmodified internals).
  governanceApplicableCount: number
  draftedByPlumb: number
  confirmedByReviewer: number
  byName: string
  byEmail: string
  onGovernanceSaved: () => Promise<void>

  // Step 5 — disposition.
  blockReason?: string
  onApprove: () => void
  onRequestInfo: () => void
  onReject: () => void
  comment: string
  onCommentChange: (v: string) => void
  onSend: () => void
  sendDisabled: boolean
  onDraftWithPlumb: () => void
  draftDisabled: boolean
}

export function ProcessHeaderCard({
  eyebrow,
  title,
  lead,
  stepIndex,
  totalSteps,
  reviewerName,
}: {
  eyebrow: string
  title: string
  lead: string
  /** null before Plumb's read resolves (mock 09's "Step — of M"). */
  stepIndex: number | null
  totalSteps: number
  reviewerName: string
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-8 rounded-lg bg-keystone-basalt600 p-6 text-keystone-chalk sm:flex-row">
      <div className="min-w-0 flex-1 max-w-[520px] space-y-2">
        <p className="ks-microlabel text-keystone-amberLight">{eyebrow}</p>
        <h1 className="font-heading text-[27px] font-black leading-[1.1] tracking-[-0.022em] text-white">{title}</h1>
        <p className="text-[14px] leading-[1.55] text-white/72">{lead}</p>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[240px]">
        <span className="ks-microlabel text-white/55">{stepIndex === null ? "Reading" : `Step ${stepIndex} of ${totalSteps}`}</span>
        <div className="flex gap-[5px]">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={cn("h-1 flex-1 rounded-sm", i + 1 === stepIndex ? "bg-white/90" : "bg-white/18")} />
          ))}
        </div>
        <p className="text-[12px] text-white/55">{reviewerName} · reviewer</p>
      </div>
    </div>
  )
}

export function ReviewProcess(props: ReviewProcessProps) {
  const {
    submission, tenant, status, reviewerName, busy, setBusy, assistantName,
    steps, currentStepKey, onNavigateStep,
    cluster, clusterAllMembers, rationalizationDecision, onClusterDecided,
    fd, highImpactRec, onSetHighImpact,
    resolvedRmf, rmfOverriding, setRmfOverriding, rmfOverrideNote, setRmfOverrideNote, onConfirmRmf, onOverrideRmf,
    governanceApplicableCount, draftedByPlumb, confirmedByReviewer, byName, byEmail, onGovernanceSaved,
    blockReason, onApprove, onRequestInfo, onReject,
    comment, onCommentChange, onSend, sendDisabled, onDraftWithPlumb, draftDisabled,
  } = props

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const current = steps.find((s) => s.key === currentStepKey) ?? steps[0]
  const totalSteps = steps.length
  const clusterCount = cluster?.memberIds.length ?? 0
  const eyebrow = `Review · ${uniqueSlugTail(submission.id)} · step ${current.index} of ${totalSteps}${blockReason ? " · blocks approval on step 1" : ""}`

  const clusterOfficeCount = cluster?.bureaus.length ?? 0
  const leads: Record<ReviewStepKey, string> = {
    cluster: `${spellCount(clusterOfficeCount)} ${tenant.tierLabels.unitPlural.toLowerCase()} are pursuing overlapping work. Nothing in the cluster can be approved until you consolidate it or mark it keep-separate.`,
    high_impact: `Confirm or override ${assistantName}'s high-impact read — it determines which minimum practices apply.`,
    rmf: `Confirm the proposed RMF profile, or override it with a reason.`,
    governance: `Complete or confirm every applicable inventory field: ${assistantName} has drafted what it can.`,
    disposition: `Every answer up to here is reversible until sign-off; this one moves the record forward.`,
  }

  const next = nextReviewStep(steps, current.key)
  const previous = previousReviewStep(steps, current.key)
  const footerHint: Partial<Record<ReviewStepKey, string>> = {
    cluster: `${assistantName} has a read waiting.`,
    high_impact: `${assistantName} has a read waiting.`,
    rmf: `The inventory fields, drafted for review.`,
    governance: `Ready to decide once every field's set.`,
  }

  const leadId = cluster ? (rationalizationDecision?.leadSubmissionId || selectedLeadId || cluster.memberIds[0]) : ""

  return (
    <div className="flex flex-col gap-[18px]">
      <ProcessHeaderCard
        eyebrow={eyebrow}
        title={stepTitle(current.key, clusterCount)}
        lead={leads[current.key]}
        stepIndex={current.index}
        totalSteps={totalSteps}
        reviewerName={reviewerName}
      />

      {/* PLUMB_PROGRESS_MIN_HEIGHT_CLASS matches ReviewProcessLoading's PlumbProgress card so the loading→resolved swap (mock 09) never shifts the page. */}
      <div className={cn("rounded-lg border border-border-subtle bg-card p-6 shadow-sm", PLUMB_PROGRESS_MIN_HEIGHT_CLASS)}>
        {current.key === "cluster" && cluster && (
          <div className="flex flex-col gap-4">
            <PlumbClusterRecommendation members={clusterAllMembers} compact maxSimilarity={cluster.maxSimilarity} />
            <ClusterMembers
              members={clusterAllMembers}
              currentLeadId={leadId}
              decided={!!rationalizationDecision}
              onSelectLead={setSelectedLeadId}
              currentSubmissionId={submission.id}
            />
            <ClusterDecision cluster={cluster} members={clusterAllMembers} decision={rationalizationDecision} leadId={leadId} onDecided={onClusterDecided} />
          </div>
        )}

        {current.key === "high_impact" && (
          <HighImpactPanel fd={fd} highImpactRec={highImpactRec} busy={busy} onSetHighImpact={onSetHighImpact} />
        )}

        {current.key === "rmf" && resolvedRmf && (
          <RmfPanel
            resolvedRmf={resolvedRmf}
            busy={busy}
            overriding={rmfOverriding}
            setOverriding={setRmfOverriding}
            overrideNote={rmfOverrideNote}
            setOverrideNote={setRmfOverrideNote}
            onConfirm={onConfirmRmf}
            onOverride={onOverrideRmf}
          />
        )}

        {current.key === "governance" && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-muted-foreground">
              All {governanceApplicableCount} fields · {draftedByPlumb} drafted by {assistantName}, {confirmedByReviewer} confirmed by the reviewer.
            </p>
            <GovernanceCapturePanel
              submission={submission}
              assistantName={assistantName}
              byName={byName}
              byEmail={byEmail}
              busy={busy}
              setBusy={setBusy}
              onSaved={onGovernanceSaved}
            />
          </div>
        )}

        {current.key === "disposition" && (
          <div className="flex flex-col gap-4">
            <DispositionControls status={status} busy={busy} blockReason={blockReason} onApprove={onApprove} onRequestInfo={onRequestInfo} onReject={onReject} />
            {blockReason && (
              <p className="flex items-center gap-1.5 text-xs text-attention-foreground">
                <AlertTriangle className="h-3.5 w-3.5 flex-none" />
                {blockReason}
                <button type="button" className="ml-1 font-semibold text-primary hover:underline" onClick={() => onNavigateStep("cluster")}>
                  Back to step 1
                </button>
              </p>
            )}
            <div className="space-y-2 border-t pt-3">
              <Textarea
                id="comment-box"
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="Write feedback to the submitter…"
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={draftDisabled} onClick={onDraftWithPlumb}>
                  <PlumbMark className="mr-1.5 h-3.5 w-3.5" />Draft with {assistantName}
                </Button>
                <Button size="sm" disabled={sendDisabled} onClick={onSend}>
                  Send &amp; request info
                </Button>
              </div>
            </div>
            <p className="text-[12.5px] text-foreground-faint">
              Every answer is reversible until {tenant.tierLabels.unit.toLowerCase()} sign-off.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-border-default px-4 py-3">
        {previous ? (
          <Button variant="ghost" size="sm" onClick={() => onNavigateStep(previous.key)}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Previous
          </Button>
        ) : (
          <span />
        )}
        <div className="min-w-0 flex-1 text-[14px] text-muted-foreground">
          {next && footerHint[current.key] ? footerHint[current.key] : null}
        </div>
        {next && (
          <Button size="sm" onClick={() => onNavigateStep(next.key)}>
            Next: {stepTitle(next.key, clusterCount)}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
        {!next && (
          <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Check className="h-3.5 w-3.5" />Last step
          </span>
        )}
      </div>
    </div>
  )
}

export type { ReviewStep, ReviewStepKey }
