"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LifecycleBadge } from "@/components/ui/lifecycle-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Scale,
  Gavel,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Shield,
  Target,
  Sparkles,
} from "lucide-react"
import type { Submission } from "@/lib/submissions"
import { ComparisonView } from "@/components/admin/comparison-view"
import { computeRiskProfile, riskBadgeClass } from "@/lib/riskProfile"
import { rmfBadgeClass, RMF_OVERALL_LABELS } from "@/lib/nistRmf"
import { resolveRmfProfile } from "@/lib/rmfProfileReview"
import { getTenant } from "@/lib/tenant"
import { businessUnitLabel } from "@/lib/reviewWorkflow"

// Higher rank sorts first in the Decision Center list; unassessed drafts (rank 0)
// always trail the fully-assessed candidates. Mirrors the ranking used for the
// AI comparison briefing in app/admin/compare-actions.ts.
const READINESS_RANK: Record<string, number> = { ready: 3, needs_work: 2, early_stage: 1 }

function readinessBadge(score: string | undefined) {
  switch (score) {
    case "ready":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" /> Ready
        </Badge>
      )
    case "needs_work":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
          <AlertTriangle className="w-3 h-3 mr-1" /> Needs Work
        </Badge>
      )
    case "early_stage":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <AlertCircle className="w-3 h-3 mr-1" /> Early Stage
        </Badge>
      )
    default:
      return <Badge variant="outline">Not Assessed</Badge>
  }
}

function fmt(v: string | string[] | undefined): string {
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

function prettyEnum(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.length > 0 ? v.map((x) => ENUM_LABELS[x] || x).join(", ") : "—"
  if (!v || v.trim() === "") return "—"
  return ENUM_LABELS[v] || v
}

function dateLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
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

  return (
    <Card className={`transition-colors ${selected ? "border-2 border-primary bg-primary/5" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{d.useCaseTitle || "Untitled idea"}</CardTitle>
              <LifecycleBadge submission={submission} />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>{fmt(d.submitterName)}</span>
              <span>·</span>
              <span>{d.submitterOffice ? businessUnitLabel(d.submitterOffice) : "—"}</span>
              <span>·</span>
              <span>Submitted {dateLabel(submission.submittedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {(() => {
              const risk = computeRiskProfile(d)
              return (
                <Badge
                  className={riskBadgeClass(risk.level)}
                  title={`${risk.rationale}${risk.flags.length > 0 ? ` — ${risk.flags.join(", ")}` : ""}`}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {risk.label}
                </Badge>
              )
            })()}
            {rmfEnabled && (() => {
              const resolved = resolveRmfProfile(submission)
              const rmf = resolved.profile
              return (
                <Badge
                  className={rmfBadgeClass(resolved.effectiveOverall)}
                  title={`${resolved.isProposal ? "Proposed — awaiting reviewer confirmation. " : ""}${rmf.rationale}${rmf.flags.length > 0 ? ` — ${rmf.flags.join(", ")}` : ""}`}
                >
                  <Scale className="w-3 h-3 mr-1" />
                  {RMF_OVERALL_LABELS[resolved.effectiveOverall]}
                  {resolved.isProposal ? " (proposed)" : ""}
                </Badge>
              )
            })()}
            {readinessBadge(d.readinessScore)}
            <div
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${
                selected ? "border-primary bg-primary/10" : "border-input"
              }`}
              title={disabled ? "Maximum of 4 candidates selected" : selected ? "Remove from comparison" : "Select for comparison"}
            >
              <Checkbox
                id={checkboxId}
                checked={selected}
                disabled={disabled}
                onCheckedChange={() => onToggleSelect(submission.id)}
              />
              <Label
                htmlFor={checkboxId}
                className={`text-sm ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                Compare
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive summary */}
        {d.executiveSummary && d.executiveSummary.trim() !== "" && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Executive Summary
            </p>
            <p className="text-sm leading-relaxed">{d.executiveSummary}</p>
          </div>
        )}

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Users
            </p>
            <p className="text-sm font-medium mt-0.5">{prettyEnum(d.impactedUsersCount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time savings
            </p>
            <p className="text-sm font-medium mt-0.5">{prettyEnum(d.userTimeSavings)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Cost savings
            </p>
            <p className="text-sm font-medium mt-0.5">{prettyEnum(d.costSavings)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" /> Complexity
            </p>
            <p className="text-sm font-medium mt-0.5">{prettyEnum(d.implementationComplexity)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Timeline
            </p>
            <p className="text-sm font-medium mt-0.5">{prettyEnum(d.timelineForResults)}</p>
          </div>
        </div>

        {/* Strategic + feasibility */}
        <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
              <Target className="w-3 h-3" /> Strategic alignment
            </p>
            <p className="text-sm leading-relaxed">
              {fmt(d.alignmentSummary || d.relevantOkrs)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
              <Shield className="w-3 h-3" /> Feasibility
            </p>
            <p className="text-sm leading-relaxed">
              {fmt(d.feasibilitySummary || d.dependencies)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Heading className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="w-6 h-6" />
            Decision Center
          </Heading>
          <p className="text-sm text-muted-foreground mt-1">
            Submissions awaiting executive review for funding decisions. Select 2–4 candidates to compare side-by-side.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {readyForDecision.length} awaiting review
        </Badge>
      </div>

      {/* Persistent compare control — always visible so the primary action is never hidden */}
      {readyForDecision.length > 0 && !showComparison && (
        <div
          className={`flex items-center justify-between p-3 rounded-lg border-2 ${
            selectedForCompare.size > 0 ? "border-primary/40 bg-primary/5" : "border-dashed border-input"
          }`}
        >
          <p className="text-sm">
            {selectedForCompare.size === 0 && (
              <>Check <span className="font-semibold">Compare</span> on 2–4 candidates below to compare them side-by-side.</>
            )}
            {selectedForCompare.size > 0 && (
              <>
                <span className="font-semibold">{selectedForCompare.size}</span> selected for comparison
                {selectedForCompare.size === 1 && ", pick 1 more to compare"}
                {selectedForCompare.size >= 4 && " (max 4)"}
              </>
            )}
          </p>
          <div className="flex gap-2">
            {selectedForCompare.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelect}>
                Clear
              </Button>
            )}
            <Button size="sm" onClick={() => setShowComparison(true)} disabled={selectedForCompare.size < 2}>
              <Scale className="w-4 h-4 mr-2" />
              Compare{selectedForCompare.size > 0 ? ` ${selectedForCompare.size}` : ""}
            </Button>
          </div>
        </div>
      )}

      {/* Comparison view */}
      {showComparison && selectedSubmissions.length >= 2 && (
        <ComparisonView submissions={selectedSubmissions} onClose={clearSelect} />
      )}

      {/* Empty state */}
      {readyForDecision.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg">No submissions awaiting decision</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              When ideas are submitted through the wizard, they will appear here for executive review. Up to the last
              5 submissions are retained.
            </p>
          </CardContent>
        </Card>
      )}

      {/* At-a-glance cards */}
      {readyForDecision.length > 0 && (
        <div className="grid gap-4">
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
