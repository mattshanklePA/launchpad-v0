"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, ChevronDown, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react"
import { findingStepName, readinessVerdictSentence, type ReadinessFinding } from "@/lib/readinessPresentation"

// The AI vetting-readiness result panel, pulled out of step-10-review-submit
// so it can be rendered in a test without the whole wizard (ES2-14).
//
// Shape: verdict row → the gaps, each a button that jumps to the step that
// closes it → "Detailed analysis" (the prose that used to sit here in the
// open) → the existing "Executive Summary (Preview)" disclosure → Re-assess.
// This mirrors the deterministic gate below it (components/steps/submission-gate.tsx),
// which already groups its blockers by step and makes each step name clickable.
// The two lists coexist and are never merged: this one is the AI's quality
// read, that one is field completeness.
//
// Every tenant renders this identically. The only tenant-varying text is the
// step name, which comes from `getFormSteps` and already varies there.

type Props = {
  readinessScore: "ready" | "needs_work" | "early_stage"
  readinessSummary: string
  // Absent on records written before ES2-14, and on the fallback's older
  // shape. Read exactly the same as an empty array.
  readinessFindings: ReadinessFinding[] | undefined
  executiveSummary: string
  submitterOffice?: string
  isAssessing: boolean
  onJumpToStep: (step: number) => void
  onReassess: () => void
  // False when composed inside a card that already renders its own verdict
  // pill, verdict sentence, and Re-assess control (step-10-review-submit.tsx's
  // vetting readiness card) — hides this panel's own copies of those three so
  // the merged card never shows each one twice. Defaults to true for every
  // other caller, which gets the panel's full chrome.
  chrome?: boolean
}

function readinessBadge(score: Props["readinessScore"]) {
  switch (score) {
    case "ready":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 text-sm px-3 py-1">
          <CheckCircle className="w-4 h-4 mr-1.5" />
          Ready for Review
        </Badge>
      )
    case "needs_work":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-sm px-3 py-1">
          <AlertTriangle className="w-4 h-4 mr-1.5" />
          Needs Work
        </Badge>
      )
    case "early_stage":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300 text-sm px-3 py-1">
          <AlertCircle className="w-4 h-4 mr-1.5" />
          Early stage: keep refining
        </Badge>
      )
    default:
      return null
  }
}

export function ReadinessResult({
  readinessScore,
  readinessSummary,
  readinessFindings,
  executiveSummary,
  submitterOffice,
  isAssessing,
  onJumpToStep,
  onReassess,
  chrome = true,
}: Props) {
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(false)
  const findings = readinessFindings || []

  return (
    <div className="space-y-4">
      {chrome && (
        <div className="flex items-center gap-3 flex-wrap">
          {readinessBadge(readinessScore)}
          <span className="text-sm">{readinessVerdictSentence(readinessScore)}</span>
        </div>
      )}

      {findings.length > 0 ? (
        <ul className="space-y-2">
          {findings.map((finding, i) => (
            <li key={`${finding.step}-${i}`} className="text-sm flex flex-wrap items-baseline gap-x-2">
              <span>{finding.message}</span>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onJumpToStep(finding.step)}>
                Fix in step {finding.step}: {findingStepName(finding.step, submitterOffice)}
              </Button>
            </li>
          ))}
        </ul>
      ) : readinessScore === "ready" ? (
        // Nothing to click, so say so rather than leaving an empty gap where
        // the list would be.
        <p className="text-sm">Nothing is blocking this.</p>
      ) : null}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            Detailed analysis
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{readinessSummary}</p>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={showExecutiveSummary} onOpenChange={setShowExecutiveSummary}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            Executive Summary (Preview)
            <ChevronDown className={`w-4 h-4 transition-transform ${showExecutiveSummary ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed border">{executiveSummary}</div>
        </CollapsibleContent>
      </Collapsible>

      {chrome && (
        <Button variant="ghost" size="sm" onClick={onReassess} disabled={isAssessing}>
          {isAssessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Re-evaluating...
            </>
          ) : (
            "Re-assess Readiness"
          )}
        </Button>
      )}
    </div>
  )
}
