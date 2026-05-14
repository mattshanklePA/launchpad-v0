"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Circle,
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
import { getSubmissions, type Submission } from "@/lib/submissions"
import { ComparisonView } from "@/components/admin/comparison-view"

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
  onToggleSelect: (id: string) => void
}

function DecisionCard({ submission, selected, onToggleSelect }: DecisionCardProps) {
  const d = submission.formData

  return (
    <Card className={`transition-colors ${selected ? "border-2 border-primary bg-primary/5" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{d.useCaseTitle || "Untitled idea"}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>{fmt(d.submitterName)}</span>
              <span>·</span>
              <span>{(d.submitterOffice || "").toUpperCase() || "—"}</span>
              <span>·</span>
              <span>Submitted {dateLabel(submission.submittedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {readinessBadge(d.readinessScore)}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleSelect(submission.id)}
              title={selected ? "Remove from comparison" : "Select for comparison"}
            >
              {selected ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5" />}
            </Button>
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
            <p className="text-sm font-medium mt-0.5">{fmt(d.impactedUsersCount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time savings
            </p>
            <p className="text-sm font-medium mt-0.5">{fmt(d.userTimeSavings)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Cost savings
            </p>
            <p className="text-sm font-medium mt-0.5">{fmt(d.costSavings)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" /> Complexity
            </p>
            <p className="text-sm font-medium mt-0.5">{fmt(d.implementationComplexity)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Timeline
            </p>
            <p className="text-sm font-medium mt-0.5">{fmt(d.timelineForResults)}</p>
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

export function DecisionCenter() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set())
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    setSubmissions(getSubmissions())
    setHydrated(true)
  }, [])

  // Filter to only show submissions awaiting decision.
  // All real submissions have an implicit "needs_review" lifecycle status —
  // i.e., they were submitted and are awaiting exec review.
  const readyForDecision = submissions

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

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse bg-muted/50 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="w-6 h-6" />
            Decision Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Submissions awaiting executive review for funding decisions. Select 2–4 candidates to compare side-by-side.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {readyForDecision.length} awaiting review
        </Badge>
      </div>

      {/* Selection bar */}
      {selectedForCompare.size > 0 && !showComparison && (
        <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/40 bg-primary/5">
          <p className="text-sm">
            <span className="font-semibold">{selectedForCompare.size}</span> selected for comparison
            {selectedForCompare.size === 1 && " — pick 1 more to compare"}
            {selectedForCompare.size >= 4 && " (max 4)"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelect}>
              Clear
            </Button>
            <Button size="sm" onClick={() => setShowComparison(true)} disabled={selectedForCompare.size < 2}>
              <Scale className="w-4 h-4 mr-2" />
              Compare {selectedForCompare.size}
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
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
