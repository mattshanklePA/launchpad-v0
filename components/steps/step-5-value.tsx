"use client"

// MERGED STEP — User value and Business value on one screen. Required fields
// stay visible; the optional tag pickers live behind an "Add optional detail"
// disclosure so the screen leads with the value statements, not the chips.

import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "@/components/launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"
import { useFieldVisibility } from "@/lib/formConfig"
import { OptionRadioGroup } from "@/components/launchpad/option-radio-group"
import { usePersistentDisclosure } from "@/hooks/use-persistent-disclosure"
import { getTenant } from "@/lib/tenant"
import { ChevronDown, ChevronRight } from "lucide-react"

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

export function Step5Value() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility(formData)
  const [showOptional, setShowOptional] = usePersistentDisclosure("value")
  const tenant = getTenant()
  const benefitOptions = getBenefitOptions(tenant.orgName)

  const userSectionVisible =
    isVisible("userValue") || isVisible("userTimeSavings") || isVisible("userValueSummary")
  const businessSectionVisible =
    isVisible("businessValue") || isVisible("costSavings") || isVisible("businessValueSummary")
  const optionalVisible = isVisible("otherUserImprovements") || isVisible("strategicBenefit")

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

  // Scout coaches on the business-value summary; user-value summary auto-fills
  // from the same conversation.
  const handleSuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, businessValueSummary: suggestion }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7">
        <div className="space-y-10">
          {/* ─── VALUE TO USERS ─── */}
          {userSectionVisible && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Value to Users
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  What changes for the people doing the work.
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
                    rows={4}
                    className="text-base"
                  />
                </div>
              )}

              {isVisible("userTimeSavings") && (
                <div className="space-y-2 md:max-w-sm">
                  <Label htmlFor="userTimeSavings">Expected user time savings</Label>
                  <OptionRadioGroup
                    ariaLabel="Expected user time savings"
                    value={formData.userTimeSavings}
                    onChange={(value) => setFormData((prev) => ({ ...prev, userTimeSavings: value as any }))}
                    options={[
                      { value: "lt_1", label: "<1 hr/week" },
                      { value: "1_5", label: "1–5 hrs/week" },
                      { value: "5_10", label: "5–10 hrs/week" },
                      { value: "gt_10", label: "10+ hrs/week" },
                    ]}
                  />
                </div>
              )}

              {isVisible("userValueSummary") && (
                <div className="space-y-2">
                  <Label htmlFor="userValueSummary" className="text-base font-semibold text-uspto-gray-text">
                    Refined User Value Summary
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    AI-generated summary of how this changes the user's day.
                  </p>
                  <TextareaAutosize
                    id="userValueSummary"
                    value={formData.userValueSummary || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, userValueSummary: e.target.value }))}
                    placeholder="AI-generated summary will appear here..."
                    minRows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                  />
                </div>
              )}
            </div>
          )}

          {/* ─── VALUE TO THE BUSINESS ─── */}
          {businessSectionVisible && (
            <div className={`space-y-6 ${userSectionVisible ? "pt-8 border-t" : ""}`}>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Value to the Business
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  What changes for the {tenant.orgName} at the enterprise level: {tenant.leadershipPriorities}.
                </p>
              </div>

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
                    rows={4}
                    className="text-base"
                  />
                </div>
              )}

              {isVisible("costSavings") && (
                <div className="space-y-2 md:max-w-sm">
                  <Label htmlFor="costSavings">Estimate potential cost or time savings</Label>
                  <OptionRadioGroup
                    ariaLabel="Estimate potential cost or time savings"
                    value={formData.costSavings}
                    onChange={(value) => setFormData((prev) => ({ ...prev, costSavings: value as any }))}
                    options={[
                      { value: "lt_50k", label: "<$50k" },
                      { value: "50k_250k", label: "$50k–$250k" },
                      { value: "250k_1m", label: "$250k–$1M" },
                      { value: "gt_1m", label: "$1M+" },
                    ]}
                  />
                </div>
              )}

              {isVisible("businessValueSummary") && (
                <div className="space-y-2">
                  <Label htmlFor="businessValueSummary" className="text-base font-semibold text-uspto-gray-text">
                    Refined Business Value Summary
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    AI-generated summary of measurable agency-level impact.
                  </p>
                  <TextareaAutosize
                    id="businessValueSummary"
                    value={formData.businessValueSummary || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, businessValueSummary: e.target.value }))}
                    placeholder="AI-generated summary will appear here..."
                    minRows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
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
        <AIdChatPanel step={4} onApplySuggestion={handleSuggestion} />
      </div>
    </div>
  )
}
