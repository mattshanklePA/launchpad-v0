"use client"
import { Sparkles, HelpCircle } from "lucide-react"

type Props = {
  // Current value of the field this hint is attached to.
  value: string
  // The AI's proposed value + one-line rationale (lib/ombAutofill.ts). An
  // empty `value` means the field couldn't be confidently derived — never
  // fabricated, so the hint tells the submitter to pick one themselves.
  suggestion: { value: string; rationale: string }
  // Clears the field back to "" so the submitter can pick a different answer.
  onOverride: () => void
  assistantName: string
}

/**
 * Advisory hint shown next to an AI-proposed OMB field (issue #61). The
 * field itself is prefilled with `suggestion.value` the first time it's
 * empty (see the calling step component's effect) — this just explains why,
 * with a confirm/override affordance: leaving the value as-is is the
 * "confirm," the "Not sure? Clear it" link is the "override" (falls back to
 * the field's own control to pick something else). Renders nothing once the
 * submitter has picked a different answer than what was proposed.
 */
export function AiProposedHint({ value, suggestion, onOverride, assistantName }: Props) {
  if (!suggestion.value) {
    return (
      <p className="text-xs text-amber-700 flex items-start gap-1.5">
        <HelpCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>{assistantName} couldn&apos;t confidently determine this yet from what you&apos;ve entered — please select one.</span>
      </p>
    )
  }
  if (value !== suggestion.value) return null
  return (
    <p className="text-xs text-uspto-blue-primary flex items-start gap-1.5">
      <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      <span>
        <strong>{assistantName} proposed this</strong> — {suggestion.rationale} You decide;{" "}
        <button type="button" onClick={onOverride} className="underline hover:no-underline">
          not sure? clear it
        </button>
        .
      </span>
    </p>
  )
}
