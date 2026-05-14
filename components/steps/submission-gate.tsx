"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Send, Loader2, AlertTriangle, CheckCircle2, Edit3, ShieldCheck } from "lucide-react"
import type { FormData } from "@/lib/steps"
import { getSubmissionReadiness } from "@/lib/submissionReadiness"

type Props = {
  formData: FormData
  onJumpToStep: (step: number) => void
  isSubmitting: boolean
  onSubmit: () => void
}

export function SubmissionGate({ formData, onJumpToStep, isSubmitting, onSubmit }: Props) {
  const readiness = getSubmissionReadiness(formData)

  // Group missing items by step for cleaner display
  const groupedMissing = readiness.missing.reduce<Record<number, typeof readiness.missing>>((acc, item) => {
    if (!acc[item.step]) acc[item.step] = []
    acc[item.step].push(item)
    return acc
  }, {})
  const groupedSteps = Object.keys(groupedMissing)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      {/* Completeness progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4" />
            Submission readiness: {readiness.completenessPercent}%
          </span>
          <span className="text-muted-foreground">
            {readiness.totalChecks - readiness.missing.length} of {readiness.totalChecks} checks passed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              readiness.canSubmit ? "bg-green-500" : "bg-amber-500"
            }`}
            style={{ width: `${readiness.completenessPercent}%` }}
          />
        </div>
      </div>

      {/* Missing items panel */}
      {!readiness.canSubmit && (
        <Card className="border-amber-300 bg-amber-50">
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  Complete {readiness.missing.length} {readiness.missing.length === 1 ? "item" : "items"} before submitting
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Each item below blocks submission. Click any step name to jump there and complete it.
                </p>
              </div>
            </div>
            <div className="space-y-3 pl-7">
              {groupedSteps.map((step) => (
                <div key={step}>
                  <button
                    onClick={() => onJumpToStep(step)}
                    className="text-sm font-semibold text-amber-900 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    Step {step}: {groupedMissing[step][0].stepName}
                  </button>
                  <ul className="mt-1 ml-4 space-y-0.5">
                    {groupedMissing[step].map((item) => (
                      <li key={item.field} className="text-xs text-amber-800 list-disc list-inside">
                        {item.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Warnings (don't block submission) */}
      {readiness.warnings.length > 0 && readiness.canSubmit && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">Heads up</AlertTitle>
          <AlertDescription className="text-amber-800">
            {readiness.warnings.map((w) => (
              <p key={w.field} className="text-xs mt-1">
                {w.message}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Submit button */}
      <div className="pt-2 flex items-center gap-3">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={onSubmit}
          disabled={isSubmitting || !readiness.canSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit for Vetting
            </>
          )}
        </Button>
        {readiness.canSubmit && (
          <span className="text-xs text-green-700 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            All required items complete
          </span>
        )}
      </div>
    </div>
  )
}
