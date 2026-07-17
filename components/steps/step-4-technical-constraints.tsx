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

import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AIdChatPanel } from "@/components/launchpad/chat-panel"
import { useFieldVisibility } from "@/lib/formConfig"

export function Step4TechnicalConstraints() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility(formData)

  const handleSuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, dependencies: suggestion }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7">
        <div className="space-y-8">
          {isVisible("dependencies") && (
            <div className="space-y-2">
              <Label htmlFor="dependencies" className="text-base font-semibold text-uspto-gray-text">
                Any known technical constraints?
              </Label>
              <p className="text-sm text-muted-foreground">
                Quick notes only — dependencies, blockers, or integration realities we should know about. No need to
                self-assess feasibility or security; reviewers cover that during vetting.
              </p>
              <Textarea
                id="dependencies"
                value={formData.dependencies}
                onChange={(e) => setFormData((prev) => ({ ...prev, dependencies: e.target.value }))}
                placeholder="e.g., access to authoritative data, integration with existing systems, ATO timeline... (optional)"
                rows={5}
                className="text-base"
              />
            </div>
          )}
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel step={4} onApplySuggestion={handleSuggestion} />
      </div>
    </div>
  )
}
