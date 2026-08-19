"use client"

// NEW STEP (issue #162) — replaces the old, heavy "Feasibility & Security"
// step (Step8FeasibilitySecurity: data readiness, TRL, the DoC AI-risk
// gate, and the full OMB/M-25-21 federal AI use case inventory block).
// That block is why submitters gave up mid-form. All of it moves to the
// *vetting* stage instead (lib/governanceCapture.ts) — a reviewer, not the
// submitter, is the right person to answer 30 compliance questions.
//
// What's left at intake is deliberately light: free-text notes only, no
// self-graded feasibility rating, no OMB/M-25-21 fields. Reuses the existing
// `dependencies` FormData field so nothing is renamed or duplicated.
//
// RD-2 (issue #203): same inline-Plumb section as steps 2/3, minus a
// dedicated summary field — this step has none today, so drafted fields fall
// back to the panel's generic per-field Apply cards.

import { useForm } from "@/context/form-context"
import { Textarea } from "@/components/ui/textarea"
import { AIdChatPanel } from "@/components/launchpad/chat-panel"
import { useFieldVisibility } from "@/lib/formConfig"
import { Field, StepCard } from "./step-frame"

export function Step4TechnicalConstraints() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility(formData)

  const handleSuggestion = (fields: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...fields }))
  }

  return (
    <>
      {isVisible("dependencies") && (
        <StepCard>
          <Field
            label="Any known technical constraints?"
            htmlFor="dependencies"
            hint="Quick notes only: dependencies, blockers, or integration realities we should know about. No need to self-assess feasibility or security; reviewers cover that during vetting."
          >
            <Textarea
              id="dependencies"
              value={formData.dependencies}
              onChange={(e) => setFormData((prev) => ({ ...prev, dependencies: e.target.value }))}
              placeholder="e.g., access to authoritative data, integration with existing systems, ATO timeline... (optional)"
              rows={5}
              className="text-[15px]"
            />
          </Field>
        </StepCard>
      )}
      <AIdChatPanel step={4} onApplySuggestion={handleSuggestion} />
    </>
  )
}
