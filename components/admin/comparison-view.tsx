"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Loader2, CheckCircle, AlertTriangle, AlertCircle, FileText, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Submission } from "@/lib/submissions"
import { compareSubmissions, type CompareBriefing } from "@/app/admin/compare-actions"

type ComparisonViewProps = {
  submissions: Submission[]
  onClose: () => void
}

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

// Same enum labels as decision-center.tsx — keep in lockstep with the Select
// options in step-3/5/6/9. (If this duplicates one more time, move it to a util.)
const ENUM_LABELS: Record<string, string> = {
  lt_10: "<10 users",
  "10_50": "10–50 users",
  "50_500": "50–500 users",
  gt_500: "500+ users",
  lt_1: "<1 hr/week",
  "1_5": "1–5 hrs/week",
  "5_10": "5–10 hrs/week",
  gt_10: "10+ hrs/week",
  lt_50k: "<$50K",
  "50k_250k": "$50K–$250K",
  "250k_1m": "$250K–$1M",
  gt_1m: "$1M+",
  low: "Low",
  medium: "Medium",
  high: "High",
  lt_3: "<3 months",
  "3_6": "3–6 months",
  "6_12": "6–12 months",
  gt_12: "12+ months",
  yes: "Yes",
  no: "No",
  ready: "Ready",
  needs_work: "Needs Work",
  early_stage: "Early Stage",
  internal: "Internal",
  external: "External",
  controlled: "Controlled",
  public: "Public",
  excluded: "Excluded",
  // AI model sourcing
  american_built: "American-built",
  open_source_us: "Open-source (U.S.)",
  foreign: "Foreign-built",
  unknown: "Unknown",
}

function prettify(s: string): string {
  return ENUM_LABELS[s] || s
}

function fieldValue(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.length > 0 ? v.map(prettify).join(", ") : "—"
  if (!v || v.trim() === "") return "—"
  return prettify(v)
}

type RowProps = {
  label: string
  values: (string | string[] | undefined)[]
}

function CompareRow({ label, values }: RowProps) {
  return (
    <div
      className="grid gap-3 py-3 border-b last:border-b-0"
      style={{ gridTemplateColumns: `180px repeat(${values.length}, minmax(0, 1fr))` }}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">{label}</div>
      {values.map((v, i) => (
        <div key={i} className="text-sm whitespace-pre-wrap break-words">
          {fieldValue(v)}
        </div>
      ))}
    </div>
  )
}

export function ComparisonView({ submissions, onClose }: ComparisonViewProps) {
  const [briefing, setBriefing] = useState<CompareBriefing | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleGenerateBrief = async () => {
    setIsLoading(true)
    try {
      const result = await compareSubmissions(submissions)
      setBriefing(result)
    } catch (error) {
      console.error("Compare submissions failed:", error)
      toast({
        variant: "destructive",
        title: "Briefing failed",
        description: error instanceof Error ? error.message : "Could not generate the comparative briefing.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mb-6 border-2 border-primary/40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Compare {submissions.length} Use Cases for Funding Decision
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Side-by-side view of selected submissions. Generate an AI briefing for a portfolio-level take.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Side-by-side comparison grid */}
        <div className="border rounded-lg p-4 bg-white overflow-x-auto">
          <div
            className="grid gap-3 pb-3 border-b-2 border-gray-300"
            style={{ gridTemplateColumns: `180px repeat(${submissions.length}, minmax(0, 1fr))` }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">Dimension</div>
            {submissions.map((s) => (
              <div key={s.id} className="space-y-1">
                <p className="font-semibold text-uspto-blue-primary">{s.formData.useCaseTitle || "Untitled"}</p>
                <div className="flex items-center gap-2 flex-wrap">{readinessBadge(s.formData.readinessScore)}</div>
                <p className="text-xs text-muted-foreground">
                  {s.formData.submitterName || "Anonymous"} · {(s.formData.submitterOffice || "").toUpperCase() || "—"}
                </p>
              </div>
            ))}
          </div>

          <CompareRow label="One-line bet" values={submissions.map((s) => s.formData.executiveSummary)} />
          <CompareRow
            label="Target users"
            values={submissions.map((s) => s.formData.targetUserSummary || s.formData.targetUserContext)}
          />
          <CompareRow label="Impact size" values={submissions.map((s) => s.formData.impactedUsersCount)} />
          <CompareRow
            label="Problem"
            values={submissions.map((s) => s.formData.problemDefinition || s.formData.coreProblem)}
          />
          <CompareRow label="Severity" values={submissions.map((s) => s.formData.severity)} />
          <CompareRow
            label="Solution"
            values={submissions.map((s) => s.formData.solutionSummary || s.formData.proposedSolution)}
          />
          <CompareRow
            label="Expected user value"
            values={submissions.map((s) => s.formData.userValueSummary || s.formData.userValue)}
          />
          <CompareRow label="Time savings claim" values={submissions.map((s) => s.formData.userTimeSavings)} />
          <CompareRow
            label="Business value"
            values={submissions.map((s) => s.formData.businessValueSummary || s.formData.businessValue)}
          />
          <CompareRow label="Cost savings claim" values={submissions.map((s) => s.formData.costSavings)} />
          <CompareRow
            label="Strategic alignment"
            values={submissions.map((s) => s.formData.alignmentSummary || s.formData.relevantOkrs)}
          />
          <CompareRow
            label="Implementation complexity"
            values={submissions.map((s) => s.formData.implementationComplexity)}
          />
          <CompareRow
            label="Feasibility & risks"
            values={submissions.map((s) => s.formData.feasibilitySummary || s.formData.dependencies)}
          />
          <CompareRow label="Uses PII" values={submissions.map((s) => s.formData.involvesSensitiveData)} />
          <CompareRow
            label="AI drives decisions"
            values={submissions.map((s) => s.formData.aiDecisionalImpact)}
          />
          <CompareRow label="Model sourcing" values={submissions.map((s) => s.formData.aiModelSourcing)} />
          <CompareRow label="Human review" values={submissions.map((s) => s.formData.aiHumanReview)} />
          <CompareRow
            label="Success metrics"
            values={submissions.map((s) => s.formData.metricsSummary || s.formData.successMetrics)}
          />
          <CompareRow label="Timeline to results" values={submissions.map((s) => s.formData.timelineForResults)} />
          <CompareRow label="Readiness summary" values={submissions.map((s) => s.formData.readinessSummary)} />
        </div>

        {/* AI Briefing Section */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Executive Comparative Briefing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!briefing && !isLoading && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate an AI-synthesized briefing that compares these candidates across strategic fit, user impact,
                  feasibility, and operational realities. The briefing names gaps honestly — it does not invent specifics
                  the submissions don't include.
                </p>
                <Button onClick={handleGenerateBrief} size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Executive Briefing
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating comparative briefing... (typically 10-20 seconds)
              </div>
            )}

            {briefing && (
              <div className="space-y-5 text-sm">
                <section>
                  <h4 className="font-semibold mb-1 text-base">How they differ</h4>
                  <p className="whitespace-pre-wrap leading-relaxed">{briefing.narrative}</p>
                </section>

                <section>
                  <h4 className="font-semibold mb-1 text-base">Funding take</h4>
                  <p className="whitespace-pre-wrap leading-relaxed">{briefing.portfolioTake}</p>
                </section>

                <section>
                  <h4 className="font-semibold mb-1 text-base">What's not addressed in this portfolio</h4>
                  <p className="whitespace-pre-wrap leading-relaxed">{briefing.unaddressedGaps}</p>
                </section>

                <section>
                  <h4 className="font-semibold mb-2 text-base">Per-candidate honest snapshot</h4>
                  <div className="space-y-3">
                    {briefing.perSubmission.map((p) => (
                      <div key={p.id} className="border-l-2 border-primary/40 pl-3 py-1">
                        <p className="font-medium">{p.title}</p>
                        <p className="text-muted-foreground mt-0.5">{p.oneLine}</p>
                        <p className="mt-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            What this doesn't address:{" "}
                          </span>
                          {p.whatItDoesNotAddress}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="pt-3 border-t flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleGenerateBrief} disabled={isLoading}>
                    Regenerate Briefing
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}
