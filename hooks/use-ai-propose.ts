"use client"

import { useEffect, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { FormData } from "@/lib/steps"
import type { AutofillProposal } from "@/lib/ombAutofill"

// Auto-fills `fieldKey` from `proposal.value` the first time both the field
// is empty AND a proposal is available, then never touches it again — a
// submitter's own answer, or a later override back to blank, is never
// clobbered (issue #61's "advisory/overridable" guardrail). Doesn't render
// anything; pair with <AiProposedHint proposal={proposal} /> to show the
// rationale next to the field.
export function useAiPropose<K extends keyof FormData>(
  fieldKey: K,
  currentValue: FormData[K],
  setFormData: Dispatch<SetStateAction<FormData>>,
  proposal: AutofillProposal<FormData[K]> | null,
): void {
  const applied = useRef(false)

  useEffect(() => {
    if (applied.current) return
    if (currentValue) {
      applied.current = true
      return
    }
    if (!proposal) return
    applied.current = true
    setFormData((prev) => (prev[fieldKey] ? prev : { ...prev, [fieldKey]: proposal.value }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal])
}
