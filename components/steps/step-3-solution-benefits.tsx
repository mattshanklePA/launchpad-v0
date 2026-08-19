"use client"

// MERGED STEP (issue #162) — Proposed Solution + Expected Benefits. Combines
// the old separate "Proposed Solution" and "Value" steps into one screen: the
// submitter describes what they'd build and what they *expect* it to deliver
// for users and the business. This is deliberately framed as an expectation,
// not a determination — the quantified self-ratings that used to live here
// (`implementationComplexity`, `userTimeSavings`, `costSavings`) are gone;
// value and impact are a Scout/reviewer determination, made during vetting.
// The fields themselves stay in FormData, just no longer collected at intake.
//
// RD-2 (issue #203): same inline-Plumb treatment as step 2 (see
// step-3-problem-and-users.tsx) — the panel moves below the fields and gets
// the step's own summary field (`solutionSummary`).

import { useState } from "react"
import { usePersistentDisclosure } from "@/hooks/use-persistent-disclosure"
import { useForm } from "@/context/form-context"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "@/components/launchpad/chat-panel"
import { X, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import TextareaAutosize from "react-textarea-autosize"
import { useFieldVisibility } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"
import { Field, StepCard, pillToggleClass, segmentClass } from "./step-frame"

const MAX_FEATURES = 3

const improvementOptions = [
  { value: "faster_processing", label: "Faster processing" },
  { value: "better_accuracy", label: "Better accuracy" },
  { value: "reduced_frustration", label: "Reduced frustration" },
  { value: "other", label: "Other" },
]

const deliveryAudienceOptions = [
  { value: "internal", label: "Internal — for our own staff" },
  { value: "external", label: "External — customer/public-facing" },
]

function getBenefitOptions(orgName: string) {
  return [
    { value: "improve_quality", label: "Improve mission or operational quality" },
    { value: "reduce_backlog", label: "Reduce backlog" },
    { value: "support_goals", label: `Support ${orgName} strategic goals` },
    { value: "other", label: "Other" },
  ]
}

export function Step3SolutionBenefits() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility(formData)
  const tenant = getTenant()
  const [newFeature, setNewFeature] = useState("")
  const [showOptional, setShowOptional] = usePersistentDisclosure("solution")
  const benefitOptions = getBenefitOptions(tenant.orgName)

  const benefitsSectionVisible = isVisible("userValue") || isVisible("businessValue")
  const optionalVisible = isVisible("keyFunctionality") || isVisible("otherUserImprovements") || isVisible("strategicBenefit")

  const handleAddFeature = () => {
    if (newFeature && (formData.keyFunctionality || []).length < MAX_FEATURES) {
      setFormData((prev) => ({ ...prev, keyFunctionality: [...(prev.keyFunctionality || []), newFeature] }))
      setNewFeature("")
    }
  }

  const handleRemoveFeature = (feature: string) => {
    setFormData((prev) => ({ ...prev, keyFunctionality: (prev.keyFunctionality || []).filter((f) => f !== feature) }))
  }

  const handleImprovementToggle = (item: string) => {
    const cur = formData.otherUserImprovements || []
    const next = cur.includes(item) ? cur.filter((i) => i !== item) : [...cur, item]
    setFormData((prev) => ({ ...prev, otherUserImprovements: next }))
  }

  const handleBenefitToggle = (item: string) => {
    const cur = formData.strategicBenefit || []
    const next = cur.includes(item) ? cur.filter((i) => i !== item) : [...cur, item]
    setFormData((prev) => ({ ...prev, strategicBenefit: next }))
  }

  const handleSuggestion = (fields: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...fields }))
  }

  return (
    <>
      <StepCard>
        {isVisible("proposedSolution") && (
          <Field label="Describe your proposed solution" htmlFor="proposedSolution" required>
            <Textarea
              id="proposedSolution"
              value={formData.proposedSolution}
              onChange={(e) => setFormData((prev) => ({ ...prev, proposedSolution: e.target.value }))}
              placeholder="Provide a short narrative of your solution."
              rows={4}
              className="text-[15px]"
            />
          </Field>
        )}

        {isVisible("deliveryAudience") && (
          <Field label="Is this solution internal or external facing?">
            <div role="radiogroup" aria-label="Is this solution internal or external facing?" className="flex overflow-hidden rounded-md border border-border-subtle">
              {deliveryAudienceOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={formData.deliveryAudience === opt.value}
                  onClick={() => setFormData((prev) => ({ ...prev, deliveryAudience: opt.value as any }))}
                  className={segmentClass(formData.deliveryAudience === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
        )}

        {benefitsSectionVisible && (
          <div className="flex flex-col gap-5 border-t border-border-subtle pt-5">
            <p className="text-[12.5px] text-muted-foreground">
              What you expect this to deliver — reviewers will confirm the actual value and impact during vetting.
            </p>

            {isVisible("userValue") && (
              <Field label="What benefits will users gain?" htmlFor="userValue" required>
                <Textarea
                  id="userValue"
                  value={formData.userValue}
                  onChange={(e) => setFormData((prev) => ({ ...prev, userValue: e.target.value }))}
                  placeholder="Describe the primary benefits for the end user."
                  rows={3}
                  className="text-[15px]"
                />
              </Field>
            )}

            {isVisible("businessValue") && (
              <Field label="What is the expected business impact?" htmlFor="businessValue" required>
                <Textarea
                  id="businessValue"
                  value={formData.businessValue}
                  onChange={(e) => setFormData((prev) => ({ ...prev, businessValue: e.target.value }))}
                  placeholder="Describe the impact on the agency."
                  rows={3}
                  className="text-[15px]"
                />
              </Field>
            )}
          </div>
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
                {isVisible("keyFunctionality") && (
                  <Field label="Key functionality (top 3 features)">
                    <div className="flex gap-2">
                      <Input
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Add a feature..."
                        disabled={(formData.keyFunctionality || []).length >= MAX_FEATURES}
                      />
                      <Button onClick={handleAddFeature} disabled={(formData.keyFunctionality || []).length >= MAX_FEATURES}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {(formData.keyFunctionality || []).map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-1 bg-muted text-muted-foreground rounded-full pl-3 pr-1 py-1 text-sm"
                        >
                          <span>{feature}</span>
                          <button onClick={() => handleRemoveFeature(feature)} className="rounded-full hover:bg-background">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </Field>
                )}

                {isVisible("otherUserImprovements") && (
                  <Field label="Other measurable improvements">
                    <div className="flex flex-wrap gap-2">
                      {improvementOptions.map((option) => (
                        <Toggle
                          key={option.value}
                          pressed={formData.otherUserImprovements.includes(option.value)}
                          onPressedChange={() => handleImprovementToggle(option.value)}
                          className={pillToggleClass}
                        >
                          {option.label}
                        </Toggle>
                      ))}
                    </div>
                  </Field>
                )}

                {isVisible("strategicBenefit") && (
                  <Field label="Strategic benefit">
                    <div className="flex flex-wrap gap-2">
                      {benefitOptions.map((option) => (
                        <Toggle
                          key={option.value}
                          pressed={formData.strategicBenefit.includes(option.value)}
                          onPressedChange={() => handleBenefitToggle(option.value)}
                          className={pillToggleClass}
                        >
                          {option.label}
                        </Toggle>
                      ))}
                    </div>
                  </Field>
                )}
              </div>
            )}
          </div>
        )}
      </StepCard>

      <AIdChatPanel
        step={3}
        onApplySuggestion={handleSuggestion}
        summaryField={
          isVisible("solutionSummary")
            ? {
                key: "solutionSummary",
                label: "Solution Summary",
                hint: `${tenant.assistantName} writes the field reviewers read. You edit every word after.`,
              }
            : undefined
        }
      />
    </>
  )
}
