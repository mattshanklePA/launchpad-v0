"use client"

// Strategic Alignment. On entry, if the submitter hasn't filled anything,
// Scout analyzes the prior steps (problem, users, solution, value) and
// AUTO-FILLS the focus areas + OKR text + alignment summary directly, then
// shows a "Scout filled this in — review and edit" banner. No click needed.
// Resilient: only fills empty fields, fails quietly to manual entry, and the
// human can re-run or edit anything.

import { useEffect, useState } from "react"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { AIdChatPanel } from "../launchpad/chat-panel"
import { ScoutFilledBanner } from "../launchpad/scout-filled-banner"
import TextareaAutosize from "react-textarea-autosize"
import { suggestStrategicAlignment } from "@/app/actions"
import { STRATEGIC_FOCUS_AREAS } from "@/lib/strategicFocusAreas"
import { useFieldVisibility } from "@/lib/formConfig"
import { Sparkles, Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
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
  const [filling, setFilling] = useState(false)
  const [scoutFilled, setScoutFilled] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [autoTried, setAutoTried] = useState(false)

  // Enough upstream context for a useful suggestion? Problem or solution is enough.
  const hasUpstreamContext = Boolean(
    formData.coreProblem?.trim() || formData.proposedSolution?.trim(),
  )

  const hasUserData =
    formData.usptoFocusArea.length > 0 ||
    Boolean(formData.relevantOkrs?.trim()) ||
    Boolean(formData.alignmentSummary?.trim())

  // Fetch a suggestion and write it straight into the fields.
  // force = overwrite existing values (used by Re-run); otherwise only fill blanks.
  const fillFromScout = async (force: boolean) => {
    if (!hasUpstreamContext) {
      toast({
        variant: "destructive",
        title: "Not enough context yet",
        description: "Fill in the problem, solution, and value steps first, then come back here.",
      })
      return
    }
    setFilling(true)
    try {
      const result = await suggestStrategicAlignment(formData)
      setFormData((prev) => ({
        ...prev,
        usptoFocusArea: force
          ? result.focusAreas
          : Array.from(new Set([...(prev.usptoFocusArea || []), ...result.focusAreas])),
        relevantOkrs: force || !prev.relevantOkrs?.trim() ? result.relevantOkrs : prev.relevantOkrs,
        alignmentSummary:
          force || !prev.alignmentSummary?.trim() ? result.alignmentSummary : prev.alignmentSummary,
      }))
      setScoutFilled(true)
      setBannerDismissed(false)
    } catch (error) {
      console.error("Failed to auto-fill alignment:", error)
      toast({
        variant: "destructive",
        title: "Couldn't auto-fill",
        description: "Scout was unreachable. You can fill the fields manually or try again.",
      })
    } finally {
      setFilling(false)
    }
  }

  // Auto-fill once on mount when there's context and nothing filled yet.
  useEffect(() => {
    if (autoTried) return
    setAutoTried(true)
    if (hasUpstreamContext && !hasUserData) {
      fillFromScout(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFocusAreaToggle = (item: string) => {
    const current = formData.usptoFocusArea || []
    const next = current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
    setFormData((prev) => ({ ...prev, usptoFocusArea: next }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7">
        <div className="space-y-8">
          {/* Filling state */}
          {filling && (
            <div className="rounded-lg border border-uspto-blue-primary/40 bg-uspto-blue-primary/5 p-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-uspto-blue-primary" />
              Scout is filling in your strategic alignment from your earlier answers…
            </div>
          )}

          {/* Review banner after auto-fill */}
          {!filling && scoutFilled && !bannerDismissed && (
            <ScoutFilledBanner
              what="your strategic alignment"
              rerunning={filling}
              onRerun={() => fillFromScout(true)}
              onDismiss={() => setBannerDismissed(true)}
            />
          )}

          {/* Persistent Scout entry point. Survives navigating away and back
              (component state resets on remount, but this is derived only from
              form data + upstream context, so it always reappears). Shows a
              cold-start prompt when nothing's filled, and a re-suggest
              affordance after the user has cleared or edited the fields.
              Hidden only while the just-filled review banner is on screen, to
              avoid stacking two Scout prompts. */}
          {!filling && !(scoutFilled && !bannerDismissed) && hasUpstreamContext && (
            <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 inline mr-1 text-uspto-blue-primary" />
                {hasUserData
                  ? "Want Scout to re-draft your strategic alignment from your earlier answers?"
                  : "Let Scout fill this in from what you've entered."}
              </p>
              <Button size="sm" onClick={() => fillFromScout(hasUserData)}>
                {hasUserData ? "Re-suggest with Scout" : "Fill with Scout"}
              </Button>
            </div>
          )}

          {/* Focus area selectors (grouped by category) */}
          {isVisible("usptoFocusArea") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Which USPTO priorities does this advance?</Label>
                {formData.usptoFocusArea.length > 0 && (
                  <span className="text-xs font-medium text-uspto-blue-primary">
                    {formData.usptoFocusArea.length} selected
                  </span>
                )}
              </div>
              {Object.entries(FOCUS_BY_CATEGORY).map(([category, options]) => (
                <div key={category} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                      const selected = formData.usptoFocusArea.includes(option.id)
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => handleFocusAreaToggle(option.id)}
                          className={cn(
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors",
                            selected
                              ? "border-uspto-blue-primary bg-uspto-blue-primary text-white"
                              : "border-gray-300 bg-white text-foreground hover:bg-gray-50",
                          )}
                        >
                          {selected && <Check className="mr-1 h-3 w-3" />}
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isVisible("relevantOkrs") && (
            <div className="space-y-2">
              <Label htmlFor="relevantOkrs">Relevant USPTO OKRs or goals</Label>
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
