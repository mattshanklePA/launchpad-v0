"use client"

// Step 6 in the new flow — Strategic Alignment. On mount, if the user hasn't
// already picked focus areas, Scout analyzes the prior steps (problem, users,
// solution, value) and pre-suggests 1-3 focus areas + drafts the alignment
// language. The user reviews and accepts/edits. This turns what used to be a
// cold-start step into a one-click confirmation.

import { useEffect, useState } from "react"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { Button } from "@/components/ui/button"
import { AIdChatPanel } from "../launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"
import { suggestStrategicAlignment } from "@/app/actions"
import { STRATEGIC_FOCUS_AREAS, type AlignmentSuggestion } from "@/lib/strategicFocusAreas"
import { useFieldVisibility } from "@/lib/formConfig"
import { Sparkles, Loader2, CheckCircle2, X, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Group the canonical focus areas by category for display.
const FOCUS_BY_CATEGORY = STRATEGIC_FOCUS_AREAS.reduce<Record<string, typeof STRATEGIC_FOCUS_AREAS[number][]>>(
  (acc, opt) => {
    acc[opt.category] = acc[opt.category] || []
    acc[opt.category].push(opt)
    return acc
  },
  {} as Record<string, typeof STRATEGIC_FOCUS_AREAS[number][]>,
)

export function Step7Alignment() {
  const { formData, setFormData } = useForm()
  const { toast } = useToast()
  const isVisible = useFieldVisibility()
  const [suggesting, setSuggesting] = useState(false)
  const [suggestion, setSuggestion] = useState<AlignmentSuggestion | null>(null)
  const [autoTried, setAutoTried] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)

  // Cheap heuristic for "has the submitter filled out the upstream steps enough
  // that a Scout suggestion would be useful?" — title + (problem or solution).
  const hasUpstreamContext = Boolean(
    formData.coreProblem?.trim() || formData.proposedSolution?.trim(),
  )

  const hasUserData =
    formData.usptoFocusArea.length > 0 ||
    Boolean(formData.relevantOkrs?.trim()) ||
    Boolean(formData.alignmentSummary?.trim())

  const fetchSuggestion = async (auto = false) => {
    if (!hasUpstreamContext) {
      toast({
        variant: "destructive",
        title: "Not enough context yet",
        description: "Fill in the problem, solution, and value steps first, then come back here.",
      })
      return
    }
    setSuggesting(true)
    try {
      const result = await suggestStrategicAlignment(formData)
      if (auto && result.focusAreas.length > 0) {
        setFormData((prev) => ({
          ...prev,
          usptoFocusArea: Array.from(new Set([...(prev.usptoFocusArea || []), ...result.focusAreas])),
          relevantOkrs: prev.relevantOkrs?.trim() ? prev.relevantOkrs : result.relevantOkrs,
          alignmentSummary: prev.alignmentSummary?.trim() ? prev.alignmentSummary : result.alignmentSummary,
        }))
        setAutoFilled(true)
      } else {
        setSuggestion(result)
      }
    } catch (error) {
      console.error("Failed to fetch alignment suggestion:", error)
      toast({
        variant: "destructive",
        title: "Couldn't get a suggestion",
        description: "Scout was unreachable. You can fill the fields manually or try again.",
      })
    } finally {
      setSuggesting(false)
    }
  }

  // Auto-trigger on first mount IF upstream context exists AND nothing is filled.
  // Only fires once per mount — re-runs are via the explicit Re-run button.
  useEffect(() => {
    if (autoTried) return
    setAutoTried(true)
    if (hasUpstreamContext && !hasUserData) {
      fetchSuggestion(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applySuggestion = () => {
    if (!suggestion) return
    setFormData((prev) => ({
      ...prev,
      // Merge — don't clobber any focus areas the user already picked.
      usptoFocusArea: Array.from(new Set([...(prev.usptoFocusArea || []), ...suggestion.focusAreas])),
      relevantOkrs: prev.relevantOkrs?.trim() ? prev.relevantOkrs : suggestion.relevantOkrs,
      alignmentSummary: prev.alignmentSummary?.trim() ? prev.alignmentSummary : suggestion.alignmentSummary,
    }))
    toast({
      title: "Suggestion applied",
      description: "Review and tweak. These were Scout's first draft, not the final word.",
    })
    setSuggestion(null)
  }

  const dismissSuggestion = () => setSuggestion(null)

  const handleFocusAreaToggle = (item: string) => {
    const current = formData.usptoFocusArea || []
    const next = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
    setFormData((prev) => ({ ...prev, usptoFocusArea: next }))
  }

  const idToLabel = (id: string): string =>
    STRATEGIC_FOCUS_AREAS.find((f) => f.id === id)?.label || id

  return (
    <div className="grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7">
        <div className="space-y-8">
          {/* ─── Scout suggestion card ─── */}
          {(suggesting || suggestion) && (
            <div className="rounded-lg border-2 border-dashed border-uspto-blue-primary/40 bg-uspto-blue-primary/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 text-uspto-blue-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-uspto-blue-primary">
                      {suggesting ? "Scout is suggesting alignment…" : "Scout's suggested alignment"}
                    </p>
                    {suggestion && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        {suggestion.rationale}
                      </p>
                    )}
                  </div>
                </div>
                {!suggesting && suggestion && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={dismissSuggestion}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {suggesting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing your problem, solution, and value claims against Department of War priorities…
                </div>
              )}

              {suggestion && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Suggested focus areas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestion.focusAreas.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-white border border-uspto-blue-primary/30 px-2.5 py-1 text-xs text-foreground"
                        >
                          <CheckCircle2 className="h-3 w-3 text-uspto-blue-primary" />
                          {idToLabel(id)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {suggestion.alignmentSummary && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Suggested summary
                      </p>
                      <p className="text-sm bg-white rounded border px-3 py-2">
                        {suggestion.alignmentSummary}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={applySuggestion}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Apply suggestion
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => fetchSuggestion()} disabled={suggesting}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Re-run
                    </Button>
                    <Button size="sm" variant="ghost" onClick={dismissSuggestion}>
                      Dismiss
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ─── "Get a suggestion" CTA when no suggestion card is showing ─── */}
          {!suggesting && !suggestion && !hasUserData && hasUpstreamContext && (
            <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 inline mr-1 text-uspto-blue-primary" />
                Let Scout draft this for you based on what you've entered.
              </p>
              <Button size="sm" onClick={() => fetchSuggestion()}>
                Get a suggestion
              </Button>
            </div>
          )}

          {/* ─── Focus area selectors (grouped by category) ─── */}
          {isVisible("usptoFocusArea") && (
          <div className="space-y-3">
            {autoFilled && (
              <div className="rounded-md border border-uspto-blue-primary/30 bg-uspto-blue-primary/5 px-3 py-2 text-sm">
                Scout filled this in from your earlier answers. Review and edit as needed.
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Which Department of War priorities does this advance?</Label>
              {hasUserData && !suggesting && !suggestion && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => fetchSuggestion()}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Re-suggest
                </Button>
              )}
            </div>
            {Object.entries(FOCUS_BY_CATEGORY).map(([category, options]) => (
              <div key={category} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => (
                    <Toggle
                      key={option.id}
                      pressed={formData.usptoFocusArea.includes(option.id)}
                      onPressedChange={() => handleFocusAreaToggle(option.id)}
                      variant="outline"
                      className="rounded-full px-3 py-1 text-xs h-auto"
                    >
                      {option.label}
                    </Toggle>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}

          {isVisible("relevantOkrs") && (
            <div className="space-y-2">
              <Label htmlFor="relevantOkrs">Relevant Department of War OKRs or goals</Label>
              <Textarea
                id="relevantOkrs"
                value={formData.relevantOkrs}
                onChange={(e) => setFormData((prev) => ({ ...prev, relevantOkrs: e.target.value }))}
                placeholder="Name the specific objectives this advances and how."
                rows={3}
              />
            </div>
          )}

          {isVisible("alignmentSummary") && (
            <div className="pt-6 mt-6 border-t space-y-2">
              <Label htmlFor="alignmentSummary" className="text-base font-semibold">
                Alignment Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                Executive-ready 2-3 sentence summary. Pre-filled by Scout. Edit to taste.
              </p>
              <TextareaAutosize
                id="alignmentSummary"
                value={formData.alignmentSummary || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, alignmentSummary: e.target.value }))}
                placeholder="AI-generated summary will appear here..."
                minRows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              />
            </div>
          )}
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel
          step={5}
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, alignmentSummary: suggestion }))}
        />
      </div>
    </div>
  )
}
