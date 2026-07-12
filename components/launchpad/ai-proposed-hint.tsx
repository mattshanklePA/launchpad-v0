"use client"

// Rationale line shown under an AI-proposed OMB field (issue #61) — pair with
// hooks/use-ai-propose.ts, which does the actual pre-fill. Renders the
// one-line "why" so a submitter can confirm or override at a glance, never a
// bare value with no explanation. When the engine couldn't confidently
// derive anything (`proposal` is `null`), flags the field as needing a
// manual answer instead of silently leaving it blank — the "don't fabricate"
// guardrail made visible.

import { Sparkles } from "lucide-react"
import { getTenant } from "@/lib/tenant"
import type { AutofillProposal } from "@/lib/ombAutofill"

export function AiProposedHint<T>({
  proposal,
  flagWhenEmpty = true,
}: {
  proposal: AutofillProposal<T> | null
  flagWhenEmpty?: boolean
}) {
  const tenant = getTenant()

  if (!proposal) {
    if (!flagWhenEmpty) return null
    return (
      <p className="flex items-start gap-1.5 text-xs text-amber-700">
        <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>{tenant.assistantName} couldn&apos;t confidently propose a value here — please select one.</span>
      </p>
    )
  }

  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0 text-uspto-blue-primary" />
      <span>
        <strong className="font-medium text-uspto-gray-text">{tenant.assistantName} proposed this</strong> — {proposal.rationale}{" "}
        Not sure? Change the answer above.
      </span>
    </p>
  )
}
