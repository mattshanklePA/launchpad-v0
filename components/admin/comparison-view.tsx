"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/ui/status-pill"
import { Sparkles, Loader2, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Submission } from "@/lib/submissions"
import { compareSubmissions, type CompareBriefing } from "@/app/admin/compare-actions"
import { computeRiskProfile } from "@/lib/riskProfile"
import { businessUnitLabel } from "@/lib/reviewWorkflow"
import { getTenant } from "@/lib/tenant"
import { SectionTitle, SquareTag } from "@/components/cockpit"
import { splitLabelCode } from "@/components/dashboard/command-center-data"
import {
  fmt,
  prettyEnum,
  readinessKeystoneStatus,
  readinessPillLabel,
  riskKeystoneStatus,
  riskPillLabel,
} from "@/components/admin/decision-center"

type ComparisonViewProps = {
  submissions: Submission[]
  onClose: () => void
  Heading?: "h1" | "h2"
}

// NL-5 (#286), ES2 only: square tags with a word, no pills.
function cockpitVerdictTag(v: string) {
  switch (v) {
    case "fund_now":
      return <SquareTag tone="healthy">Fund now</SquareTag>
    case "fund_with_conditions":
      return <SquareTag tone="attention">Fund with conditions</SquareTag>
    default:
      return <SquareTag tone="neutral">Hold</SquareTag>
  }
}

function verdictBadge(v: string) {
  switch (v) {
    case "fund_now":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-healthy/30 bg-healthy-subtle px-2.5 py-0.5 text-xs font-semibold text-healthy-foreground">
          <CheckCircle className="w-3 h-3" /> Fund now
        </span>
      )
    case "fund_with_conditions":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-attention/30 bg-attention-subtle px-2.5 py-0.5 text-xs font-semibold text-attention-foreground">
          <AlertTriangle className="w-3 h-3" /> Fund with conditions
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-neutral/40 bg-neutral-subtle px-2.5 py-0.5 text-xs font-semibold text-neutral-foreground">
          <AlertCircle className="w-3 h-3" /> Hold
        </span>
      )
  }
}

// Row set for the 10b compare table (issue #204): the same fields already on
// each Decision Center card (readiness/risk pills, the five-number row,
// strategic alignment, feasibility) — no new data, just this set laid out
// side by side. Deliberately narrower than the old expando's 19-field dump;
// the mock's per-candidate "Plumb's read" row is left out, since there is no
// source for it yet.
const COMPARE_ROWS: Array<{ label: string; render: (s: Submission) => ReactNode }> = [
  {
    label: "Readiness",
    render: (s) =>
      getTenant().features.cockpitLook ? (
        <SquareTag tone={readinessKeystoneStatus(s.formData.readinessScore)}>{readinessPillLabel(s.formData.readinessScore)}</SquareTag>
      ) : (
        <StatusPill status={readinessKeystoneStatus(s.formData.readinessScore)}>
          {readinessPillLabel(s.formData.readinessScore)}
        </StatusPill>
      ),
  },
  {
    label: "Risk",
    render: (s) => {
      const risk = computeRiskProfile(s.formData)
      return getTenant().features.cockpitLook ? (
        <SquareTag tone={riskKeystoneStatus(risk.level)}>{riskPillLabel(risk.level)}</SquareTag>
      ) : (
        <StatusPill status={riskKeystoneStatus(risk.level)}>{riskPillLabel(risk.level)}</StatusPill>
      )
    },
  },
  {
    label: "Users",
    render: (s) => <span className="text-[15px] font-semibold text-foreground">{prettyEnum(s.formData.impactedUsersCount)}</span>,
  },
  {
    label: "Time saved",
    render: (s) => <span className="text-[15px] font-semibold text-foreground">{prettyEnum(s.formData.userTimeSavings)}</span>,
  },
  {
    label: "Cost saved",
    render: (s) => <span className="text-[15px] font-semibold text-foreground">{prettyEnum(s.formData.costSavings)}</span>,
  },
  {
    label: "Complexity",
    render: (s) => (
      <span className="text-[15px] font-semibold text-foreground">{prettyEnum(s.formData.implementationComplexity)}</span>
    ),
  },
  {
    label: "Timeline",
    render: (s) => <span className="text-[15px] font-semibold text-foreground">{prettyEnum(s.formData.timelineForResults)}</span>,
  },
  {
    label: "Strategic alignment",
    render: (s) => <span className="text-[14px] text-foreground">{fmt(s.formData.alignmentSummary || s.formData.relevantOkrs)}</span>,
  },
  {
    label: "Feasibility",
    render: (s) => <span className="text-[14px] text-foreground">{fmt(s.formData.feasibilitySummary || s.formData.dependencies)}</span>,
  },
]

export function ComparisonView({ submissions, onClose, Heading = "h2" }: ComparisonViewProps) {
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

  const recCand = briefing ? briefing.perSubmission.find((p) => p.id === briefing.recommendation.fundId) ?? null : null
  const titles = submissions.map((s) => s.formData.useCaseTitle || "Untitled idea")
  const gridStyle = { gridTemplateColumns: `170px repeat(${submissions.length}, minmax(0, 1fr))` }

  if (getTenant().features.cockpitLook) {
    const box = "border border-[var(--ks-limestone-dark)] bg-white"
    return (
      <div className="space-y-5">
        <SectionTitle title="Decision Center · compare" context="Same rows, side by side. The briefing writes itself from this table." />
        <p className="font-heading text-[20px] font-bold leading-[1.2] text-[var(--ks-ink-900)]">{titles.join(" vs. ")}</p>
        <div className="flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-semibold text-[var(--ks-active-blue-dark)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
          >
            Back to candidates
          </button>
          <Button onClick={handleGenerateBrief} disabled={isLoading}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Executive Briefing
          </Button>
        </div>

        <div className={`overflow-x-auto ${box}`}>
          <div className="grid gap-x-6 px-6 py-4" style={gridStyle}>
            <div />
            {submissions.map((s) => {
              const unitLabel = s.formData.submitterOffice ? businessUnitLabel(s.formData.submitterOffice) : "—"
              const unitShort = s.formData.submitterOffice ? splitLabelCode(unitLabel).code ?? unitLabel : "—"
              return (
                <div key={s.id} className="flex min-w-0 flex-col gap-1">
                  <p className="font-heading text-[16.5px] font-bold leading-[1.25] text-[var(--ks-ink-900)]">
                    {s.formData.useCaseTitle || "Untitled idea"}
                  </p>
                  <p className="text-[12.5px] text-[var(--ks-ink-700)]">
                    {fmt(s.formData.submitterName)} · {unitShort}
                  </p>
                </div>
              )
            })}
          </div>
          {COMPARE_ROWS.map((row) => (
            <div key={row.label} className="grid items-baseline gap-x-6 border-t border-[var(--ks-limestone)] px-6 py-3" style={gridStyle}>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]">{row.label}</p>
              {submissions.map((s) => (
                <div key={s.id} className="text-[13.5px] leading-[1.55]">
                  {row.render(s)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {(isLoading || briefing) && (
          <div className="space-y-4">
            <SectionTitle title="Executive Comparative Briefing" />
            {isLoading && (
              <div className="flex items-center gap-2 py-4 text-sm text-[var(--ks-ink-700)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating comparative briefing... (typically 10-20 seconds)
              </div>
            )}
            {briefing && (
              <div className="space-y-4 text-sm">
                <div className={`${box} border-l-4 border-l-[var(--ks-amber)] p-4`}>
                  <SquareTag tone="healthy">Recommendation</SquareTag>
                  {recCand && <p className="mt-2 font-semibold text-[var(--ks-ink-900)]">Fund first: {recCand.title}</p>}
                  <p className="mt-0.5 leading-relaxed text-[var(--ks-ink-900)]">{briefing.recommendation.headline}</p>
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${briefing.perSubmission.length}, minmax(0, 1fr))` }}>
                  {briefing.perSubmission.map((p) => (
                    <div key={p.id} className={`${box} p-3 ${p.id === briefing.recommendation.fundId ? "border-[var(--ks-amber)]" : ""}`}>
                      <p className="font-medium leading-tight">{p.title}</p>
                      <div className="mt-1.5">{cockpitVerdictTag(p.verdict)}</div>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--ks-ink-700)]">{p.oneLine}</p>
                      <p className="mt-1.5 text-xs leading-relaxed">
                        <span className="font-semibold text-[var(--ks-amber-dark)]">Gap: </span>
                        {p.gap}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`${box} p-3`}>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]">How they differ</span>
                    <p className="mt-1 leading-relaxed">{briefing.differ}</p>
                  </div>
                  <div className={`${box} p-3`}>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]">Biggest gap across the set</span>
                    <p className="mt-1 leading-relaxed">{briefing.portfolioGap}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={handleGenerateBrief} disabled={isLoading}>
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 rounded-md bg-keystone-basalt600 px-7 py-6 text-white shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <Heading className="ks-page-title text-white">Decision Center · compare</Heading>
          <p className="font-heading text-[20px] font-bold leading-[1.2] text-white">{titles.join(" vs. ")}</p>
          <p className="text-[13px] text-white/72">Same rows, side by side. The briefing writes itself from this table.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3.5 pb-0.5">
          <button type="button" onClick={onClose} className="text-[13px] font-semibold text-white/90 hover:text-white hover:underline">
            Back to candidates
          </button>
          <Button variant="chalk" onClick={handleGenerateBrief} disabled={isLoading}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Executive Briefing
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border-subtle bg-card">
        <div className="grid gap-x-6 px-6 py-4" style={gridStyle}>
          <div />
          {submissions.map((s) => {
            const unitLabel = s.formData.submitterOffice ? businessUnitLabel(s.formData.submitterOffice) : "—"
            const unitShort = s.formData.submitterOffice ? splitLabelCode(unitLabel).code ?? unitLabel : "—"
            return (
              <div key={s.id} className="flex min-w-0 flex-col gap-1">
                <p className="font-heading text-[16.5px] font-bold leading-[1.25] text-foreground">
                  {s.formData.useCaseTitle || "Untitled idea"}
                </p>
                <p className="text-[12.5px] text-muted-foreground">
                  {fmt(s.formData.submitterName)} · {unitShort}
                </p>
              </div>
            )
          })}
        </div>
        {COMPARE_ROWS.map((row) => (
          <div key={row.label} className="grid items-baseline gap-x-6 border-t border-border-subtle px-6 py-3" style={gridStyle}>
            <p className="ks-microlabel">{row.label}</p>
            {submissions.map((s) => (
              <div key={s.id} className="text-[13.5px] leading-[1.55]">
                {row.render(s)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {(isLoading || briefing) && (
        <div className="rounded-md border-2 border-dashed border-primary/30 bg-primary/5 p-5">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="w-5 h-5" />
            Executive Comparative Briefing
          </p>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating comparative briefing... (typically 10-20 seconds)
            </div>
          )}

          {briefing && (
            <div className="space-y-4 text-sm mt-3">
              {/* Recommendation banner */}
              <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-700" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-green-800">Recommendation</span>
                </div>
                {recCand && <p className="font-semibold text-green-900">Fund first: {recCand.title}</p>}
                <p className="text-green-900 mt-0.5 leading-relaxed">{briefing.recommendation.headline}</p>
              </div>

              {/* Per-candidate verdict cards */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${briefing.perSubmission.length}, minmax(0, 1fr))` }}>
                {briefing.perSubmission.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-lg border p-3 ${p.id === briefing.recommendation.fundId ? "border-green-400 bg-green-50/40" : "bg-white"}`}
                  >
                    <p className="font-medium leading-tight">{p.title}</p>
                    <div className="mt-1.5">{verdictBadge(p.verdict)}</div>
                    <p className="text-muted-foreground text-xs mt-2 leading-relaxed">{p.oneLine}</p>
                    <p className="text-xs mt-1.5 leading-relaxed">
                      <span className="font-semibold text-amber-700">Gap: </span>
                      {p.gap}
                    </p>
                  </div>
                ))}
              </div>

              {/* Short context */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-md bg-muted/40 p-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How they differ</span>
                  <p className="mt-1 leading-relaxed">{briefing.differ}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Biggest gap across the set</span>
                  <p className="mt-1 leading-relaxed">{briefing.portfolioGap}</p>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleGenerateBrief} disabled={isLoading}>
                  Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
