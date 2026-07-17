"use client"

// MERGED STEP (issue #162) — Proposed Solution + Expected Benefits. Combines
// the old separate "Proposed Solution" and "Value" steps into one screen: the
// submitter describes what they'd build and what they *expect* it to deliver
// for users and the business. This is deliberately framed as an expectation,
// not a determination — the quantified self-ratings that used to live here
// (`implementationComplexity`, `userTimeSavings`, `costSavings`) are gone;
// value and impact are a Scout/reviewer determination, made during vetting.
// The fields themselves stay in FormData, just no longer collected at intake.

import { useState } from "react"
import { usePersistentDisclosure } from "@/hooks/use-persistent-disclosure"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "@/components/launchpad/chat-panel"
import { X, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import TextareaAutosize from "react-textarea-autosize"
import { useFieldVisibility } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"
import { OptionRadioGroup } from "@/components/launchpad/option-radio-group"

const MAX_FEATURES = 3

const improvementOptions = [
  { value: "faster_processing", label: "Faster processing" },
  { value: "better_accuracy", label: "Better accuracy" },
  { value: "reduced_frustration", label: "Reduced frustration" },
  { value: "other", label: "Other" },
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
    <div className="grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7">
        <div className="space-y-10">
          {/* ─── THE SOLUTION ─── */}
          <div className="space-y-6">
            {isVisible("proposedSolution") && (
              <div className="space-y-2">
                <Label htmlFor="proposedSolution" className="text-base font-semibold text-uspto-gray-text">
                  Describe your proposed solution
                </Label>
                <Textarea
                  id="proposedSolution"
                  value={formData.proposedSolution}
                  onChange={(e) => setFormData((prev) => ({ ...prev, proposedSolution: e.target.value }))}
                  placeholder="Provide a short narrative of your solution."
                  rows={4}
                  className="text-base"
                />
              </div>
            )}

            {isVisible("solutionSummary") && (
              <div className="space-y-2">
                <Label htmlFor="solutionSummary" className="text-base font-semibold text-uspto-gray-text">
                  Solution Summary
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI-generated refined summary of your proposed solution. Open {tenant.assistantName} to draft or refine.
                </p>
                <TextareaAutosize
                  id="solutionSummary"
                  value={formData.solutionSummary || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, solutionSummary: e.target.value }))}
                  placeholder="AI-generated summary will appear here..."
                  minRows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                />
              </div>
            )}

            {isVisible("deliveryAudience") && (
              <div className="space-y-2">
                <Label htmlFor="deliveryAudience">Is this solution internal or external facing?</Label>
                <OptionRadioGroup
                  ariaLabel="Is this solution internal or external facing?"
                  value={formData.deliveryAudience}
                  onChange={(value) => setFormData((prev) => ({ ...prev, deliveryAudience: value as any }))}
                  options={[
                    { value: "internal", label: "Internal — for our own staff" },
                    { value: "external", label: "External — customer/public-facing" },
                  ]}
                />
              </div>
            )}
          </div>

          {/* ─── EXPECTED BENEFITS — the submitter's expectation, not a determination ─── */}
          {benefitsSectionVisible && (
            <div className="space-y-6 border-t pt-8">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Expected Benefits
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  What you expect this to deliver — reviewers will confirm the actual value and impact during vetting.
                </p>
              </div>

              {isVisible("userValue") && (
                <div className="space-y-2">
                  <Label htmlFor="userValue" className="text-base font-semibold text-uspto-gray-text">
                    What benefits will users gain?
                  </Label>
                  <Textarea
                    id="userValue"
                    value={formData.userValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, userValue: e.target.value }))}
                    placeholder="Describe the primary benefits for the end user."
                    rows={3}
                    className="text-base"
                  />
                </div>
              )}

              {isVisible("businessValue") && (
                <div className="space-y-2">
                  <Label htmlFor="businessValue" className="text-base font-semibold text-uspto-gray-text">
                    What is the expected business impact?
                  </Label>
                  <Textarea
                    id="businessValue"
                    value={formData.businessValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, businessValue: e.target.value }))}
                    placeholder="Describe the impact on the agency."
                    rows={3}
                    className="text-base"
                  />
                </div>
              )}
            </div>
          )}

          {/* ─── OPTIONAL DETAIL (progressive disclosure) ─── */}
          {optionalVisible && (
            <div className="border-t pt-6">
              <button
                type="button"
                onClick={() => setShowOptional((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-uspto-blue-primary hover:underline"
                aria-expanded={showOptional}
              >
                {showOptional ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {showOptional ? "Hide optional detail" : "Add optional detail"}
              </button>

              {showOptional && (
                <div className="mt-5 space-y-6">
                  {isVisible("keyFunctionality") && (
                    <div className="space-y-2">
                      <Label>Key functionality (top 3 features)</Label>
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
                    </div>
                  )}

                  {isVisible("otherUserImprovements") && (
                    <div className="space-y-2">
                      <Label>Other measurable improvements</Label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {improvementOptions.map((option) => (
                          <Toggle
                            key={option.value}
                            pressed={formData.otherUserImprovements.includes(option.value)}
                            onPressedChange={() => handleImprovementToggle(option.value)}
                            variant="outline"
                            className="rounded-full px-3 py-1 text-sm h-auto"
                          >
                            {option.label}
                          </Toggle>
                        ))}
                      </div>
                    </div>
                  )}

                  {isVisible("strategicBenefit") && (
                    <div className="space-y-2">
                      <Label>Strategic benefit</Label>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {benefitOptions.map((option) => (
                          <Toggle
                            key={option.value}
                            pressed={formData.strategicBenefit.includes(option.value)}
                            onPressedChange={() => handleBenefitToggle(option.value)}
                            variant="outline"
                            className="rounded-full px-3 py-1 text-sm h-auto"
                          >
                            {option.label}
                          </Toggle>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel step={3} onApplySuggestion={handleSuggestion} />
      </div>
    </div>
  )
}
