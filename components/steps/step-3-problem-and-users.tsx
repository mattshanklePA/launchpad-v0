"use client"

// MERGED STEP — Problem first, then who's affected (per Jonathan's framing,
// reinforced by the problem-first reorder). Non-required enrichment fields are
// tucked behind an "Add optional detail" disclosure so the screen leads with
// the core question instead of overwhelming the submitter with ~10 inputs.
//
// `severity` (a submitter self-rating of impact) was dropped from this step
// at idea intake (issue #162) — value and impact are a Scout/reviewer
// determination, not something submitters grade on their own idea. The field
// stays in FormData, filled in during vetting instead.
//
// RD-2 (issue #203): Plumb (AIdChatPanel) moves from a right-hand column into
// an inline section below the fields, in the same white card, per the 05a/05b
// mocks — the merged Plumb-thread-plus-drafted-summary pattern from
// docs/design/handoff/DIVERGENCES.md item 6.

import { usePersistentDisclosure } from "@/hooks/use-persistent-disclosure"
import { useForm } from "@/context/form-context"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TextareaAutosize from "react-textarea-autosize"
import { AIdChatPanel } from "@/components/launchpad/chat-panel"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useFieldVisibility } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Field, StepCard, pillToggleClass, segmentClass } from "./step-frame"

const problemTypeOptions = [
  { value: "process_inefficiency", label: "Process inefficiency" },
  { value: "technical_debt", label: "Technical debt" },
  { value: "policy_gap", label: "Policy gap" },
  { value: "user_experience", label: "User experience" },
  { value: "other", label: "Other" },
]

const impactedUsersOptions = [
  { value: "lt_10", label: "<10" },
  { value: "10_50", label: "10–50" },
  { value: "50_500", label: "50–500" },
  { value: "gt_500", label: "500+" },
]

export function Step3ProblemAndUsers() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility(formData)
  const tenant = getTenant()
  const [showOptional, setShowOptional] = usePersistentDisclosure("problem")

  // Non-required enrichment fields — hidden behind the disclosure by default.
  const optionalVisible =
    isVisible("problemImpact") || isVisible("problemType") || isVisible("painPoints")

  const handleProblemTypeToggle = (type: string) => {
    const currentTypes = formData.problemType || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type]
    setFormData((prev) => ({ ...prev, problemType: newTypes }))
  }

  const handleAffectedBusinessUnitToggle = (unit: string) => {
    const current = formData.affectedBusinessUnits || []
    const next = current.includes(unit) ? current.filter((u) => u !== unit) : [...current, unit]
    setFormData((prev) => ({ ...prev, affectedBusinessUnits: next }))
  }

  const handleSuggestion = (fields: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...fields }))
  }

  return (
    <TooltipProvider>
      <StepCard>
        {isVisible("coreProblem") && (
          <Field label="Core Problem" htmlFor="coreProblem" required>
            <Textarea
              id="coreProblem"
              value={formData.coreProblem}
              onChange={(e) => setFormData((prev) => ({ ...prev, coreProblem: e.target.value }))}
              placeholder="Summarize the main issue in a sentence or two."
              rows={4}
              className="text-[15px]"
            />
          </Field>
        )}

        {(isVisible("targetAudience") || isVisible("impactedUsersCount")) && (
          <div className="flex flex-wrap gap-5">
            {isVisible("targetAudience") && (
              <Field label="Target Audience" htmlFor="targetAudience" required className="min-w-[260px] flex-1">
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, targetAudience: value as any }))}
                >
                  <SelectTrigger id="targetAudience">
                    <SelectValue placeholder="Select an audience..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenant.targetAudiences.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {isVisible("impactedUsersCount") && (
              <Field label="Impacted Users Count" required className="min-w-[260px] flex-1">
                <div
                  role="radiogroup"
                  aria-label="How many users are impacted?"
                  className="flex overflow-hidden rounded-md border border-border-subtle"
                >
                  {impactedUsersOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={formData.impactedUsersCount === opt.value}
                      onClick={() => setFormData((prev) => ({ ...prev, impactedUsersCount: opt.value as any }))}
                      className={segmentClass(formData.impactedUsersCount === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </div>
        )}

        {isVisible("affectedBusinessUnits") && (
          <Field label={`Affected ${tenant.tierLabels.unitPlural}`} required>
            <div className="flex flex-wrap gap-2">
              {tenant.affectedSystems.map((option) => (
                <Toggle
                  key={option.value}
                  pressed={formData.affectedBusinessUnits.includes(option.value)}
                  onPressedChange={() => handleAffectedBusinessUnitToggle(option.value)}
                  className={pillToggleClass}
                >
                  {option.label}
                </Toggle>
              ))}
            </div>
          </Field>
        )}

        {isVisible("targetUserContext") && (
          <Field label="User Profile / Context" htmlFor="targetUserContext" required>
            <TextareaAutosize
              id="targetUserContext"
              value={formData.targetUserContext}
              onChange={(e) => setFormData((prev) => ({ ...prev, targetUserContext: e.target.value }))}
              placeholder="Anything else about the users: workflow context, environment, edge cases."
              minRows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-[14.5px]"
            />
          </Field>
        )}

        {optionalVisible && (
          <div className="border-t border-border-subtle pt-5">
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              aria-expanded={showOptional}
            >
              {showOptional ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {showOptional ? "Hide optional detail" : "Add optional detail"}
            </button>

            {showOptional && (
              <div className="mt-4 flex flex-col gap-5">
                {isVisible("problemImpact") && (
                  <Field label="Why does this problem matter?" htmlFor="problemImpact">
                    <Textarea
                      id="problemImpact"
                      value={formData.problemImpact}
                      onChange={(e) => setFormData((prev) => ({ ...prev, problemImpact: e.target.value }))}
                      placeholder="Describe the impact on users, the agency, or the mission."
                      rows={3}
                    />
                  </Field>
                )}

                {isVisible("problemType") && (
                  <Field label="Problem type">
                    <div className="flex flex-wrap gap-2">
                      {problemTypeOptions.map((option) => (
                        <Toggle
                          key={option.value}
                          pressed={formData.problemType.includes(option.value)}
                          onPressedChange={() => handleProblemTypeToggle(option.value)}
                          className={pillToggleClass}
                        >
                          {option.label}
                        </Toggle>
                      ))}
                    </div>
                  </Field>
                )}

                {isVisible("painPoints") && (
                  <Field label="Key pain points" htmlFor="painPoints">
                    <TextareaAutosize
                      id="painPoints"
                      value={formData.painPoints}
                      onChange={(e) => setFormData((prev) => ({ ...prev, painPoints: e.target.value }))}
                      placeholder="What are users dealing with today that this would fix?"
                      minRows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-[14.5px]"
                    />
                  </Field>
                )}
              </div>
            )}
          </div>
        )}
      </StepCard>

      <AIdChatPanel
        step={2}
        onApplySuggestion={handleSuggestion}
        summaryField={
          isVisible("problemDefinition")
            ? {
                key: "problemDefinition",
                label: "Refined Problem & Users Summary",
                hint: `${tenant.assistantName} writes the field reviewers read. You edit every word after.`,
              }
            : undefined
        }
      />
    </TooltipProvider>
  )
}
