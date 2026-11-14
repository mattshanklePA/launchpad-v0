"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/ui/status-pill"
import { LifecycleBadge } from "@/components/ui/lifecycle-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Sparkles } from "lucide-react"
import type { Submission } from "@/lib/submissions"
import { ComparisonView } from "@/components/admin/comparison-view"
import { computeRiskProfile, type RiskLevel } from "@/lib/riskProfile"
import { resolveRmfProfile, type ResolvedRmfProfile } from "@/lib/rmfProfileReview"
import { getTenant } from "@/lib/tenant"
import { businessUnitLabel, getLifecycleStage, LIFECYCLE_STAGE_LABEL } from "@/lib/reviewWorkflow"
import { formatKeystoneDate, splitLabelCode } from "@/components/dashboard/command-center-data"
import { PRIMARY_COLUMN_CLASS } from "@/lib/layoutTokens"
import type { KeystoneStatus } from "@/lib/statusTokens"
import { tenantCopy } from "@/lib/tenant/copy"
import { RankedTable, SectionTitle, SquareTag, type RankedColumn, type RankedDetail } from "@/components/cockpit"

// Higher rank sorts first in the Decision Center list; unassessed drafts (rank 0)
// always trail the fully-assessed candidates. Mirrors the ranking used for the
// AI comparison briefing in app/admin/compare-actions.ts.
const READINESS_RANK: Record<string, number> = { ready: 3, needs_work: 2, early_stage: 1 }

// Keystone status + pill copy for a submission's readiness score — restyled
// from the old green/amber/red Badge onto the shared StatusPill vocabulary
// (RD-3, issue #204). Same three assessed states plus "not yet assessed";
// no change to which state a given readinessScore resolves to.
const READINESS_KEYSTONE: Record<string, KeystoneStatus> = {
  ready: "healthy",
  needs_work: "attention",
  early_stage: "alert",
}
const READINESS_LABEL: Record<string, string> = {
  ready: "Ready",
  needs_work: "Needs work",
  early_stage: "Early stage",
}

export function readinessKeystoneStatus(score: string | undefined): KeystoneStatus {
  return READINESS_KEYSTONE[score || ""] || "neutral"
}
export function readinessPillLabel(score: string | undefined): string {
  return READINESS_LABEL[score || ""] || "Not assessed"
}

// Same restyle for lib/riskProfile.ts's RiskLevel — the mock's card badges
// read "Low risk" / "Med risk" / "High risk", shorter than RiskProfile's own
// "Low Risk" / "Medium Risk" / "High Risk" prose labels, so this is a
// display-only relabeling on top of the existing risk resolution.
const RISK_KEYSTONE: Record<RiskLevel, KeystoneStatus> = {
  low: "healthy",
  medium: "attention",
  high: "alert",
  unknown: "neutral",
}
const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Med risk",
  high: "High risk",
  unknown: "Risk unassessed",
}

export function riskKeystoneStatus(level: RiskLevel): KeystoneStatus {
  return RISK_KEYSTONE[level]
}
export function riskPillLabel(level: RiskLevel): string {
  return RISK_LABEL[level]
}

export function fmt(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "—"
  return v && v.trim() !== "" ? v : "—"
}

// Human-readable labels for the enum fields shown in the at-a-glance grid.
// Keep these in lockstep with the Select options in step-3, step-5, step-6, step-9.
const ENUM_LABELS: Record<string, string> = {
  // impactedUsersCount
  lt_10: "<10 users",
  "10_50": "10–50 users",
  "50_500": "50–500 users",
  gt_500: "500+ users",
  // userTimeSavings
  lt_1: "<1 hr/week",
  "1_5": "1–5 hrs/week",
  "5_10": "5–10 hrs/week",
  gt_10: "10+ hrs/week",
  // costSavings
  lt_50k: "<$50K",
  "50k_250k": "$50K–$250K",
  "250k_1m": "$250K–$1M",
  gt_1m: "$1M+",
  // implementationComplexity
  low: "Low",
  medium: "Medium",
  high: "High",
  // timelineForResults
  lt_3: "<3 months",
  "3_6": "3–6 months",
  "6_12": "6–12 months",
  gt_12: "12+ months",
  // AI model sourcing
  american_built: "American-built (commercial)",
  open_source_us: "Open-source, U.S.-hosted",
  foreign: "Foreign-built or foreign-hosted",
  unknown: "Unknown / TBD",
  // yes/no
  yes: "Yes",
  no: "No",
}

export function prettyEnum(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.length > 0 ? v.map((x) => ENUM_LABELS[x] || x).join(", ") : "—"
  if (!v || v.trim() === "") return "—"
  return ENUM_LABELS[v] || v
}

// The card's one-line RMF status — three states driven purely by
// `resolveRmfProfile`'s existing resolution (no new review logic): no review
// record yet, a reviewer confirmed the proposed profile, or a reviewer
// overrode it. Mirrors submission-detail.tsx's `rmfStatusLabel` for the
// reviewer detail page, restated for the card's shorter slot.
export function rmfCardLabel(resolved: ResolvedRmfProfile): string {
  if (!resolved.review) return "RMF profile not confirmed"
  return resolved.review.decision === "overridden" ? "RMF overridden by reviewer" : "RMF confirmed"
}

// Today's headline count line, shared by the old basalt band and (NL-5, #286)
// the ES2 header band title that app/decisions/page.tsx passes to the shell.
export function decisionHeadline(count: number): string {
  if (count === 0) return "Decision Center"
  return count === 1 ? "1 candidate awaits a funding decision" : `${count} candidates await a funding decision`
}

type DecisionCardProps = {
  submission: Submission
  selected: boolean
  selectionLimitReached: boolean
  onToggleSelect: (id: string) => void
}

function DecisionCard({ submission, selected, selectionLimitReached, onToggleSelect }: DecisionCardProps) {
  const d = submission.formData
  const checkboxId = `compare-${submission.id}`
  const disabled = !selected && selectionLimitReached
  const rmfEnabled = !!getTenant().features.rmf
  const risk = computeRiskProfile(d)
  const resolvedRmf = rmfEnabled ? resolveRmfProfile(submission) : null
  // "AT&R", not lib/reviewWorkflow's full option label ("Acquisition,
  // Training and Readiness (AT&R)") — the mock's card meta is the short form.
  const unitLabel = d.submitterOffice ? businessUnitLabel(d.submitterOffice) : "—"
  const unitShort = d.submitterOffice ? splitLabelCode(unitLabel).code ?? unitLabel : "—"

  const stats: Array<{ label: string; value: string }> = [
    { label: "Users", value: prettyEnum(d.impactedUsersCount) },
    { label: "Time saved", value: prettyEnum(d.userTimeSavings) },
    { label: "Cost saved", value: prettyEnum(d.costSavings) },
    { label: "Complexity", value: prettyEnum(d.implementationComplexity) },
    { label: "Timeline", value: prettyEnum(d.timelineForResults) },
  ]

  return (
    <div className="flex flex-col gap-3.5 rounded-md border border-border-subtle bg-card p-[22px] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <LifecycleBadge submission={submission} />
            <StatusPill status={readinessKeystoneStatus(d.readinessScore)}>{readinessPillLabel(d.readinessScore)}</StatusPill>
            <StatusPill status={riskKeystoneStatus(risk.level)} className="whitespace-nowrap">
              {riskPillLabel(risk.level)}
            </StatusPill>
          </div>
          <p className="font-heading text-[18px] font-bold leading-[1.25] text-foreground">
            {d.useCaseTitle || "Untitled idea"}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {fmt(d.submitterName)} · {unitShort} · {formatKeystoneDate(submission.submittedAt)}
          </p>
        </div>
        <Label
          htmlFor={checkboxId}
          className={`flex shrink-0 items-center gap-1.5 text-[12.5px] font-normal text-foreground ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
          title={disabled ? "Maximum of 4 candidates selected" : selected ? "Remove from comparison" : "Select for comparison"}
        >
          <Checkbox id={checkboxId} checked={selected} disabled={disabled} onCheckedChange={() => onToggleSelect(submission.id)} />
          Compare
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-3 border-y border-border-subtle py-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <p className="ks-microlabel">{s.label}</p>
            <p className="text-[15px] font-semibold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 text-[13px] leading-[1.55] sm:grid-cols-2">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Strategic alignment</p>
          <p className="text-[14px] text-foreground">{fmt(d.alignmentSummary || d.relevantOkrs)}</p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Feasibility</p>
          <p className="text-[14px] text-foreground">{fmt(d.feasibilitySummary || d.dependencies)}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2.5 pt-0.5">
        {rmfEnabled && resolvedRmf ? (
          <p className="text-[13px] text-muted-foreground">{rmfCardLabel(resolvedRmf)}</p>
        ) : (
          <span />
        )}
        <Link href={`/submissions/${submission.id}`} className="text-[13px] font-semibold text-primary hover:underline">
          Open submission
        </Link>
      </div>
    </div>
  )
}

function CockpitDecisionList({
  ranked,
  selected,
  onToggleSelect,
  selectionMeta,
  onCompare,
}: {
  ranked: Submission[]
  selected: Set<string>
  onToggleSelect: (id: string) => void
  selectionMeta: string
  onCompare: () => void
}) {
  const tenant = getTenant()
  const copy = tenantCopy(tenant)
  const rmfEnabled = !!tenant.features.rmf
  const count = ranked.length
  const limitReached = selected.size >= 4
  const rankOf = new Map(ranked.map((s, i) => [s.id, i + 1]))
  const stat = (v: string) => <span className="text-sm font-semibold">{v}</span>

  const columns: RankedColumn<Submission>[] = [
    {
      key: "compare",
      header: "Compare",
      width: 90,
      render: (s) => {
        const isSelected = selected.has(s.id)
        const disabled = !isSelected && limitReached
        const id = `compare-${s.id}`
        return (
          // The row opens on click; the checkbox must not.
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <Label
              htmlFor={id}
              className={`flex items-center gap-1.5 text-[12.5px] font-normal ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
              title={disabled ? "Maximum of 4 candidates selected" : isSelected ? "Remove from comparison" : "Select for comparison"}
            >
              <Checkbox id={id} checked={isSelected} disabled={disabled} onCheckedChange={() => onToggleSelect(s.id)} />
              Compare
            </Label>
          </span>
        )
      },
    },
    { key: "stage", header: copy.listColStage, render: (s) => <SquareTag tone="neutral">{LIFECYCLE_STAGE_LABEL[getLifecycleStage(s)]}</SquareTag> },
    {
      key: "readiness",
      header: "Readiness",
      render: (s) => (
        <SquareTag tone={readinessKeystoneStatus(s.formData.readinessScore)}>{readinessPillLabel(s.formData.readinessScore)}</SquareTag>
      ),
    },
    {
      key: "risk",
      header: "Risk",
      render: (s) => {
        const risk = computeRiskProfile(s.formData)
        return <SquareTag tone={riskKeystoneStatus(risk.level)}>{riskPillLabel(risk.level)}</SquareTag>
      },
    },
    { key: "users", header: "Users", render: (s) => stat(prettyEnum(s.formData.impactedUsersCount)) },
    { key: "time", header: "Time saved", render: (s) => stat(prettyEnum(s.formData.userTimeSavings)) },
    { key: "cost", header: "Cost saved", render: (s) => stat(prettyEnum(s.formData.costSavings)) },
    { key: "complexity", header: "Complexity", render: (s) => stat(prettyEnum(s.formData.implementationComplexity)) },
    { key: "timeline", header: "Timeline", render: (s) => stat(prettyEnum(s.formData.timelineForResults)) },
  ]

  return (
    <div className={`${PRIMARY_COLUMN_CLASS} space-y-5`}>
      <SectionTitle title="Decision Center" context={count > 0 ? "Each cleared vetting. Pick two to four to compare, or decide from the table." : undefined} />

      {count === 0 ? (
        <div className="border border-[var(--ks-limestone-dark)] bg-white px-6 py-12 text-center">
          <h3 className="font-heading text-lg font-bold text-[var(--ks-ink-900)]">Nothing is waiting on a funding decision.</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ks-ink-700)]">Use cases arrive here once a reviewer approves them.</p>
        </div>
      ) : (
        <RankedTable
          groups={[{ id: "ranked", rows: ranked }]}
          columns={columns}
          getRowId={(s) => s.id}
          getRank={(s) => String(rankOf.get(s.id))}
          getName={(s) => s.formData.useCaseTitle || "Untitled idea"}
          getReference={(s) => {
            const d = s.formData
            const unit = d.submitterOffice ? businessUnitLabel(d.submitterOffice) : "—"
            const short = d.submitterOffice ? splitLabelCode(unit).code ?? unit : "—"
            return `${fmt(d.submitterName)} · ${short} · ${formatKeystoneDate(s.submittedAt)}`
          }}
          getDetails={(s) => {
            const d = s.formData
            const details: RankedDetail[] = [
              { label: "Strategic alignment", value: fmt(d.alignmentSummary || d.relevantOkrs) },
              { label: "Feasibility", value: fmt(d.feasibilitySummary || d.dependencies) },
            ]
            if (rmfEnabled) details.push({ label: copy.decisionDetailRmf, value: rmfCardLabel(resolveRmfProfile(s)) })
            details.push({
              label: copy.decisionDetailRecord,
              value: (
                <Link
                  href={`/submissions/${s.id}`}
                  className="font-semibold text-[var(--ks-active-blue-dark)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
                >
                  Open submission
                </Link>
              ),
            })
            return details
          }}
          rankHeader={copy.listColNo}
          nameHeader={copy.listColIdea}
          expandAllLabel={copy.homeExpandAll}
          collapseAllLabel={copy.homeCollapseAll}
          toolbar={
            <>
              <span className="font-mono text-[12.5px] text-[var(--ks-ink-700)]">{selectionMeta}</span>
              <Button onClick={onCompare} disabled={selected.size < 2}>
                Compare selected
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}

// `submissions` must already be scoped to the viewer (see lib/reviewWorkflow's
// visibleSubmissions) — this component does not re-scope, so passing the
// unfiltered list here would leak other bureaus' submissions.
//
// `headingLevel` lets the standalone /decisions page promote this title to the
// page's sole <h1> without affecting the embedded use inside /admin's tab,
// where "Administration Dashboard" is already the page's <h1>.
export function DecisionCenter({
  submissions,
  headingLevel = "h2",
}: {
  submissions: Submission[]
  headingLevel?: "h1" | "h2"
}) {
  const Heading = headingLevel
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set())
  const [showComparison, setShowComparison] = useState(false)

  // Filter to only show submissions awaiting decision.
  // All real submissions have an implicit "needs_review" lifecycle status —
  // i.e., they were submitted and are awaiting exec review.
  //
  // Sort fully-assessed candidates first so the opening card is never a draft
  // with a "Not Assessed" badge and all-dash metrics. Tie-break by submittedAt
  // (newest first) then id so the order is deterministic across reloads.
  const readyForDecision = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const rankDiff =
        (READINESS_RANK[b.formData.readinessScore || ""] || 0) -
        (READINESS_RANK[a.formData.readinessScore || ""] || 0)
      if (rankDiff !== 0) return rankDiff
      if (a.submittedAt !== b.submittedAt) return a.submittedAt < b.submittedAt ? 1 : -1
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
  }, [submissions])

  const toggleSelect = (id: string) => {
    setSelectedForCompare((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 4) next.add(id)
      return next
    })
  }

  const clearSelect = () => {
    setSelectedForCompare(new Set())
    setShowComparison(false)
  }

  const selectedSubmissions = readyForDecision.filter((s) => selectedForCompare.has(s.id))

  if (showComparison && selectedSubmissions.length >= 2) {
    return (
      <div className={`${PRIMARY_COLUMN_CLASS} space-y-5`}>
        <ComparisonView submissions={selectedSubmissions} onClose={clearSelect} Heading={Heading} />
      </div>
    )
  }

  const count = readyForDecision.length
  const countLead = decisionHeadline(count)
  const selectedCount = selectedForCompare.size
  const selectionMeta =
    selectedCount === 1
      ? `${selectedCount} selected · pick 1 more to compare`
      : selectedCount >= 4
        ? `${selectedCount} selected · max 4`
        : `${selectedCount} selected`

  // NL-5 (#286), ES2 only: same ideas, order, selection and compare, in the
  // cockpit kit (K3 title, K5 ranked table, K6 tags). Other tenants fall through.
  if (getTenant().features.cockpitLook) {
    return (
      <CockpitDecisionList
        ranked={readyForDecision}
        selected={selectedForCompare}
        onToggleSelect={toggleSelect}
        selectionMeta={selectionMeta}
        onCompare={() => setShowComparison(true)}
      />
    )
  }

  return (
    <div className={`${PRIMARY_COLUMN_CLASS} space-y-5`}>
      <div className="flex flex-col gap-3 rounded-md bg-keystone-basalt600 px-7 py-6 text-white shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <Heading className="ks-page-title text-white">Decision Center</Heading>
          {count > 0 && (
            <>
              <p className="text-[14.5px] text-white">{countLead}</p>
              <p className="text-[13px] text-white/72">Each cleared vetting. Pick two to four to compare, or decide from the cards.</p>
            </>
          )}
        </div>
        {count > 0 && (
          <div className="flex shrink-0 items-center gap-3.5 pb-0.5">
            <span className="font-mono text-[12.5px] text-white/55">{selectionMeta}</span>
            <Button variant="chalk" onClick={() => setShowComparison(true)} disabled={selectedCount < 2}>
              Compare selected
            </Button>
          </div>
        )}
      </div>

      {/* Empty state — nothing has been approved yet, so say that plainly
          rather than the count line ("0 candidates await...") or a generic
          "no submissions" message that predates the approval gate. */}
      {count === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">Nothing is waiting on a funding decision.</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Use cases arrive here once a reviewer approves them.
            </p>
          </CardContent>
        </Card>
      )}

      {/* At-a-glance cards */}
      {count > 0 && (
        <div className="flex flex-col gap-3.5">
          {readyForDecision.map((s) => (
            <DecisionCard
              key={s.id}
              submission={s}
              selected={selectedForCompare.has(s.id)}
              selectionLimitReached={selectedForCompare.size >= 4}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
