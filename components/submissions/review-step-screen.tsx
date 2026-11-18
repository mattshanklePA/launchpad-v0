"use client"

// F7-3 (#346), ES2 only (`features.reviewerDecides`): the review step screen.
// One step at a time, top to bottom: what the record says, Plumb's advice in
// its own marked box, "Your answer" (starts empty), and the two buttons. The
// right side is review-step-list.tsx. Nothing is chosen for the reviewer: the
// radio buttons start empty unless the reviewer already answered, and the
// decision buttons carry no main style until a decision is on the record.
// Overlap, inventory fields and decision keep today's controls inside the frame.

import { useRef, useState, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { PlumbClusterRecommendation } from "@/components/clusters/plumb-cluster-recommendation"
import { ClusterMembers } from "@/components/clusters/cluster-members"
import { ClusterDecision } from "@/components/clusters/cluster-decision"
import { GovernanceCapturePanel } from "@/components/submissions/governance-capture-panel"
import { DispositionControls } from "@/components/submissions/disposition-controls"
import { PLUMB_PROGRESS_MIN_HEIGHT_CLASS, PlumbProgress } from "@/components/launchpad/plumb-progress"
import { SectionTitle, SquareTag } from "@/components/cockpit"
import type { ReviewProcessProps } from "@/components/submissions/review-process"
import { tenantCopy } from "@/lib/tenant/copy"
import { NONE_YET, readReviewerStep } from "@/lib/reviewerDecision"
import {
  decideStepSave,
  highImpactChoices,
  HIGH_IMPACT_LABELS,
  needsAttentionLine,
  rmfChoices,
  savedAnswerOrNull,
  stepAdvice,
  type StepChoice,
} from "@/lib/reviewStepScreen"
import { RMF_OVERALL_LABELS, type RmfRiskLevel } from "@/lib/nistRmf"
import { nextReviewStep, previousReviewStep, type ReviewStepKey } from "@/lib/reviewSteps"
import { STATUS_LABEL } from "@/lib/reviewWorkflow"
import { spellCount } from "@/components/dashboard/command-center-data"
import { cn } from "@/lib/utils"

export type ReviewStepScreenProps = ReviewProcessProps & {
  /** Saves the high-impact answer. A reason goes with it when the answer differs from Plumb's. */
  onSaveHighImpactAnswer: (answer: "high_impact" | "presumed_not_high_impact" | "not_high_impact", reason?: string) => Promise<boolean>
  /** Saves the risk-framework answer (a level). The page confirms when it equals Plumb's level and overrides when it does not. */
  onSaveRmfAnswer: (answer: RmfRiskLevel, reason?: string) => Promise<boolean>
}

const BOX = "border border-[var(--ks-limestone-dark)] bg-white p-5"

function AdviceBox({
  tag,
  suggestsLabel,
  notSureLabel,
  noAdvice,
  advice,
  children,
}: {
  tag: string
  suggestsLabel: string
  notSureLabel: string
  noAdvice: string
  advice: ReturnType<typeof stepAdvice>
  children?: ReactNode
}) {
  const empty = !advice.suggests && !children
  return (
    <section aria-label={tag} data-review="plumb-advice" className={cn(BOX, "flex flex-col gap-2.5 border-l-[3px] border-l-[var(--ks-amber)]")}>
      <div className="flex items-center gap-2">
        <PlumbMark className="h-3.5 w-3.5" />
        <SquareTag tone="info">{tag}</SquareTag>
      </div>
      {empty ? (
        <p className="m-0 text-[14px] text-[var(--ks-ink-700)]">{noAdvice}</p>
      ) : (
        <>
          {advice.suggests ? (
            <p className="m-0 text-[14.5px] text-[var(--ks-ink-900)]">
              <span className="font-semibold">{suggestsLabel}</span> {advice.suggests}
            </p>
          ) : null}
          {advice.reasons.length > 0 ? (
            <ul className="m-0 list-disc space-y-1 pl-5 text-[14px] text-[var(--ks-ink-700)]">
              {advice.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : null}
          {children}
          {advice.notSure ? (
            <p className="m-0 text-[14px] text-[var(--ks-ink-900)]">
              <span className="font-semibold">{notSureLabel}</span> {advice.notSure}
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}

function ChoiceStep({
  stepKey,
  choices,
  savedAnswer,
  suggestion,
  reasonLabel,
  nothingSelected,
  title,
  busy,
  onSave,
  nextLabel,
  backLabel,
  onBack,
  onGo,
}: {
  stepKey: ReviewStepKey
  choices: StepChoice[]
  savedAnswer: string
  suggestion: string
  reasonLabel: string
  nothingSelected: string
  title: string
  busy: boolean
  onSave: (answer: string, reason: string | undefined) => Promise<boolean>
  nextLabel: string | null
  backLabel: string | null
  onBack: () => void
  onGo: () => void
}) {
  const [chosen, setChosen] = useState<string | null>(savedAnswerOrNull(savedAnswer))
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState("")

  const save = async () => {
    const out = decideStepSave({ suggestion, saved: savedAnswer, chosen, reason })
    if (out.kind === "need_reason") {
      setMessage(out.message)
      return
    }
    setMessage("")
    if (out.kind === "save") {
      let saved = false
      try {
        saved = await onSave(out.answer, out.reason)
      } catch {
        saved = false
      }
      if (!saved) {
        setMessage("That answer was not saved. Try again.")
        return
      }
    }
    onGo()
  }

  return (
    <>
      <fieldset className={cn(BOX, "m-0 flex min-w-0 flex-col gap-3")}>
        <legend className="ks-section-head float-left w-full p-0 text-[var(--ks-ink-900)]">{title}</legend>
        <p className="m-0 clear-both text-[13px] text-[var(--ks-ink-700)]" id={`${stepKey}-none`}>
          {nothingSelected}
        </p>
        <div role="radiogroup" aria-describedby={`${stepKey}-none`} className="flex flex-col gap-2">
          {choices.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-start gap-2.5 text-[14.5px] text-[var(--ks-ink-900)]">
              <input
                type="radio"
                name={`${stepKey}-answer`}
                value={c.value}
                checked={chosen === c.value}
                disabled={busy}
                onChange={() => {
                  setChosen(c.value)
                  setMessage("")
                }}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span className="min-w-0 break-words">{c.label}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${stepKey}-reason`} className="text-[13px] font-semibold text-[var(--ks-ink-900)]">
            {reasonLabel}
          </label>
          <input
            id={`${stepKey}-reason`}
            type="text"
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            aria-describedby={message ? `${stepKey}-msg` : undefined}
            aria-invalid={message ? true : undefined}
            className="w-full rounded-[5px] border border-[var(--ks-limestone-dark)] bg-white px-3 py-2 text-[14px] text-[var(--ks-ink-900)]"
          />
        </div>
      </fieldset>
      <StepButtons
        busy={busy}
        nextLabel={nextLabel}
        backLabel={backLabel}
        onSave={save}
        onBack={onBack}
        message={message}
        messageId={`${stepKey}-msg`}
      />
    </>
  )
}

function StepButtons({
  busy,
  nextLabel,
  backLabel,
  onSave,
  onBack,
  message,
  messageId,
}: {
  busy: boolean
  nextLabel: string | null
  backLabel: string | null
  onSave?: () => void
  onBack: () => void
  message?: string
  messageId?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {nextLabel && onSave ? (
          <Button type="button" disabled={busy} onClick={onSave}>
            {nextLabel}
          </Button>
        ) : null}
        {backLabel ? (
          <Button type="button" variant="outline" disabled={busy} onClick={onBack}>
            {backLabel}
          </Button>
        ) : null}
      </div>
      <p id={messageId} role="status" aria-live="polite" className={cn("m-0 text-[13px] text-[var(--ks-ink-900)]", !message && "sr-only")}>
        {message}
      </p>
    </div>
  )
}

export function ReviewStepScreen(props: ReviewStepScreenProps) {
  const {
    submission, tenant, status, busy, setBusy, assistantName,
    steps, currentStepKey, onNavigateStep,
    cluster, clusterAllMembers, rationalizationDecision, onClusterDecided,
    fd, highImpactRec, onSaveHighImpactAnswer,
    resolvedRmf, onSaveRmfAnswer,
    governanceApplicableCount, draftedByPlumb, confirmedByReviewer, byName, byEmail, onGovernanceSaved, governanceDraft,
    blockReason, onApprove, onRequestInfo, onReject,
    comment, onCommentChange, onSend, sendDisabled, onDraftWithPlumb, draftDisabled,
    reading, governanceDone, recommendationDone, onSkipToSteps,
  } = props

  const copy = tenantCopy(tenant)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const saveFieldsRef = useRef<(() => Promise<void>) | null>(null)

  const current = steps.find((s) => s.key === currentStepKey) ?? steps[0]
  const next = nextReviewStep(steps, current.key)
  const previous = previousReviewStep(steps, current.key)
  const clusterCount = cluster?.memberIds.length ?? 0
  const leadId = cluster ? (rationalizationDecision?.leadSubmissionId || selectedLeadId || cluster.memberIds[0]) : ""

  const titles: Record<ReviewStepKey, string> = {
    cluster: copy.stepTitleCluster,
    high_impact: copy.stepTitleHighImpact,
    rmf: copy.stepTitleRmf,
    governance: copy.stepTitleFields,
    disposition: copy.stepTitleDecide,
  }
  const title = titles[current.key]

  const nextLabel = next ? copy.stepSaveGo.replace("{n}", String(next.index)) : null
  const backLabel = previous ? copy.stepBack.replace("{n}", String(previous.index)) : null
  const onBack = () => previous && onNavigateStep(previous.key)
  const onGo = () => next && onNavigateStep(next.key)
  const adviceProps = { tag: copy.stepAdviceTag, suggestsLabel: copy.stepSuggests, notSureLabel: copy.stepNotSure, noAdvice: copy.stepNoAdvice }

  // What the record says, in plain words.
  const hiRead = readReviewerStep("highImpact", fd, tenant)
  const rmfRead = resolvedRmf ? readReviewerStep("rmf", fd, tenant) : null
  const answerWord = (answer: string, labels: Record<string, string>) => (answer === NONE_YET ? null : labels[answer] ?? answer)
  const recordSays: Record<ReviewStepKey, string> = {
    cluster: cluster
      ? `This idea is one of ${spellCount(clusterCount).toLowerCase()} ideas from ${spellCount(cluster.bureaus.length).toLowerCase()} ${tenant.tierLabels.unitPlural.toLowerCase()} that overlap.${rationalizationDecision ? " A decision is on record." : " No decision is on record yet."}`
      : "",
    high_impact: answerWord(hiRead.answer, HIGH_IMPACT_LABELS)
      ? `On record: ${answerWord(hiRead.answer, HIGH_IMPACT_LABELS)}.`
      : "No high impact answer is on record yet.",
    rmf: resolvedRmf
      ? `The risk framework reads: ${RMF_OVERALL_LABELS[resolvedRmf.effectiveOverall]}.${rmfRead && rmfRead.answer !== NONE_YET ? " A reviewer has answered." : " No reviewer has answered yet."}`
      : "",
    governance: `${confirmedByReviewer} of ${governanceApplicableCount} inventory fields have an answer a reviewer chose.`,
    disposition: `Status: ${STATUS_LABEL[status]}.`,
  }
  const attentionLine = current.key === "rmf" && resolvedRmf ? needsAttentionLine(resolvedRmf.profile, resolvedRmf.effectiveOverall, copy.stepNeedsAttention) : null

  let body: ReactNode = null
  if (reading) {
    body = (
      <div className={cn(BOX, PLUMB_PROGRESS_MIN_HEIGHT_CLASS)}>
        <PlumbProgress
          assistantName={assistantName}
          governanceDone={!!governanceDone}
          recommendationDone={!!recommendationDone}
          className="min-h-0 rounded-none border-0 bg-transparent p-0 shadow-none"
        />
      </div>
    )
  } else if (current.key === "high_impact") {
    body = (
      <>
        <AdviceBox {...adviceProps} advice={stepAdvice("high_impact", { highImpact: { recommendation: hiRead.suggestion === "high_impact" ? "yes" : "no", reasons: highImpactRec.reasons } })} />
        <ChoiceStep
          key={`${current.key}:${hiRead.answer}`}
          stepKey="high_impact"
          choices={highImpactChoices()}
          savedAnswer={hiRead.answer}
          suggestion={hiRead.suggestion}
          reasonLabel={copy.stepReasonLabel}
          nothingSelected={copy.stepNothingSelected}
          title={copy.stepYourAnswer}
          busy={busy}
          onSave={(a, r) => onSaveHighImpactAnswer(a as Parameters<typeof onSaveHighImpactAnswer>[0], r)}
          nextLabel={nextLabel}
          backLabel={backLabel}
          onBack={onBack}
          onGo={onGo}
        />
      </>
    )
  } else if (current.key === "rmf" && resolvedRmf && rmfRead) {
    body = (
      <>
        <AdviceBox {...adviceProps} advice={stepAdvice("rmf", { rmf: { profile: resolvedRmf.profile } })} />
        <ChoiceStep
          key={`${current.key}:${rmfRead.answer}`}
          stepKey="rmf"
          choices={rmfChoices(rmfRead.suggestion)}
          savedAnswer={rmfRead.answer}
          suggestion={rmfRead.suggestion}
          reasonLabel={copy.stepReasonLabel}
          nothingSelected={copy.stepNothingSelected}
          title={copy.stepYourAnswer}
          busy={busy}
          onSave={(a, r) => onSaveRmfAnswer(a as RmfRiskLevel, r)}
          nextLabel={nextLabel}
          backLabel={backLabel}
          onBack={onBack}
          onGo={onGo}
        />
      </>
    )
  } else if (current.key === "cluster" && cluster) {
    body = (
      <>
        <AdviceBox {...adviceProps} advice={stepAdvice("cluster", {})}>
          <PlumbClusterRecommendation members={clusterAllMembers} compact maxSimilarity={cluster.maxSimilarity} />
        </AdviceBox>
        <section aria-label={copy.stepYourAnswer} className={cn(BOX, "flex min-w-0 flex-col gap-3")}>
          <SectionTitle title={copy.stepYourAnswer} />
          <ClusterMembers
            members={clusterAllMembers}
            currentLeadId={leadId}
            decided={!!rationalizationDecision}
            onSelectLead={setSelectedLeadId}
            currentSubmissionId={submission.id}
          />
          <ClusterDecision cluster={cluster} members={clusterAllMembers} decision={rationalizationDecision} leadId={leadId} onDecided={onClusterDecided} />
        </section>
        <StepButtons busy={busy} nextLabel={nextLabel} backLabel={backLabel} onSave={onGo} onBack={onBack} />
      </>
    )
  } else if (current.key === "governance") {
    body = (
      <>
        <AdviceBox
          {...adviceProps}
          advice={stepAdvice("governance", { fields: { applicable: governanceApplicableCount, drafted: draftedByPlumb } })}
        />
        <section aria-label={copy.stepYourAnswer} className={cn(BOX, "flex min-w-0 flex-col gap-3")}>
          <SectionTitle title={copy.stepYourAnswer} />
          <GovernanceCapturePanel
            submission={submission}
            assistantName={assistantName}
            byName={byName}
            byEmail={byEmail}
            busy={busy}
            setBusy={setBusy}
            onSaved={onGovernanceSaved}
            initialDraft={governanceDraft}
            saveRef={saveFieldsRef}
          />
        </section>
        <StepButtons
          busy={busy}
          nextLabel={nextLabel}
          backLabel={backLabel}
          onSave={async () => {
            if (saveFieldsRef.current) await saveFieldsRef.current()
            onGo()
          }}
          onBack={onBack}
        />
      </>
    )
  } else if (current.key === "disposition") {
    body = (
      <>
        <AdviceBox {...adviceProps} advice={stepAdvice("disposition", {})} />
        <section aria-label={copy.stepYourAnswer} className={cn(BOX, "flex min-w-0 flex-col gap-4")}>
          <SectionTitle title={copy.stepYourAnswer} />
          <DispositionControls
            status={status}
            busy={busy}
            blockReason={blockReason}
            neutralUntilChosen
            onApprove={onApprove}
            onRequestInfo={onRequestInfo}
            onReject={onReject}
          />
          {blockReason && (
            <p className="m-0 flex flex-wrap items-center gap-1.5 text-[13px] text-attention-foreground">
              <AlertTriangle className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              {blockReason}
              <button type="button" className="ml-1 font-semibold text-primary hover:underline" onClick={() => onNavigateStep("cluster")}>
                {copy.stepBack.replace("{n}", "1")}
              </button>
            </p>
          )}
          <div className="space-y-2 border-t border-[var(--ks-limestone-dark)] pt-3">
            <Textarea id="comment-box" value={comment} onChange={(e) => onCommentChange(e.target.value)} placeholder="Write feedback to the submitter…" rows={2} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={draftDisabled} onClick={onDraftWithPlumb}>
                <PlumbMark className="mr-1.5 h-3.5 w-3.5" />Draft with {assistantName}
              </Button>
              <Button type="button" size="sm" disabled={sendDisabled} onClick={onSend}>
                Send &amp; request info
              </Button>
            </div>
          </div>
        </section>
        <StepButtons busy={busy} nextLabel={null} backLabel={backLabel} onBack={onBack} />
      </>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-[18px]">
      <SectionTitle title={title} />
      {!reading && recordSays[current.key] ? (
        <p data-review="record-says" className="m-0 text-[14px] leading-[1.55] text-[var(--ks-ink-700)]">
          {recordSays[current.key]}
        </p>
      ) : null}
      {!reading && attentionLine ? (
        <p data-review="needs-attention" className="m-0 text-[14px] font-semibold leading-[1.55] text-[var(--ks-ink-900)]">
          {attentionLine}
        </p>
      ) : null}
      {body}
      {reading && onSkipToSteps ? (
        <div className="flex flex-wrap items-center gap-4 border border-[var(--ks-limestone-dark)] bg-white p-4">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[14.5px] font-semibold text-[var(--ks-ink-900)]">You don&apos;t have to wait</p>
            <p className="m-0 mt-0.5 text-[13px] text-[var(--ks-ink-700)]">
              The submission is ready to read now, and your decision buttons stay live. {assistantName}&apos;s read arrives as advice, not a gate.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onSkipToSteps}>
            Read the submission
          </Button>
        </div>
      ) : null}
    </div>
  )
}
