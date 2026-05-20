"use client"

// MERGED STEP — combines what used to be Step 6 (User Value) and Step 7
// (Business Value). The two value lenses live on one screen so submitters
// don't have to context-switch between "user benefit" and "business case"
// in two separate steps.

import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "@/components/launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"
import { useFieldVisibility } from "@/lib/formConfig"

const improvementOptions = [
  { value: "faster_processing", label: "Faster processing" },
  { value: "better_accuracy", label: "Better accuracy" },
  { value: "reduced_frustration", label: "Reduced frustration" },
  { value: "other", label: "Other" },
]

const benefitOptions = [
  { value: "improve_quality", label: "Improve patent/trademark quality" },
  { value: "reduce_backlog", label: "Reduce backlog" },
  { value: "support_goals", label: "Support USPTO strategic goals" },
  { value: "other", label: "Other" },
]

export function Step5Value() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()

  const userSectionVisible =
    isVisible("userValue") ||
    isVisible("userTimeSavings") ||
    isVisible("otherUserImprovements") ||
    isVisible("userValueSummary")
  const businessSectionVisible =
    isVisible("businessValue") ||
    isVisible("costSavings") ||
    isVisible("strategicBenefit") ||
    isVisible("businessValueSummary")

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

  // Scout coaches on the BUSINESS value summary (the more leadership-facing
  // of the two). User value summary auto-fills from the same conversation.
  const handleSuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, businessValueSummary: suggestion }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-10 h-full">
          {/* ─── VALUE TO USERS ─── */}
          {userSectionVisible && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg text-uspto-gray-text">Value to Users</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  What changes for the people doing the work.
                </p>
              </div>

              {isVisible("userValue") && (
                <div className="space-y-2">
                  <Label htmlFor="userValue">What benefits will users gain?</Label>
                  <Textarea
                    id="userValue"
                    value={formData.userValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, userValue: e.target.value }))}
                    placeholder="Describe the primary benefits for the end user."
                    rows={4}
                  />
                </div>
              )}

              {(isVisible("userTimeSavings") || isVisible("otherUserImprovements")) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isVisible("userTimeSavings") && (
                    <div className="space-y-2">
                      <Label htmlFor="userTimeSavings">Expected user time savings</Label>
                      <Select
                        value={formData.userTimeSavings}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, userTimeSavings: value as any }))
                        }
                      >
                        <SelectTrigger id="userTimeSavings">
                          <SelectValue placeholder="Select time saved per week..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lt_1">{"<1 hr/week"}</SelectItem>
                          <SelectItem value="1_5">1–5 hrs/week</SelectItem>
                          <SelectItem value="5_10">5–10 hrs/week</SelectItem>
                          <SelectItem value="gt_10">10+ hrs/week</SelectItem>
                        </SelectContent>
                      </Select>
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
                </div>
              )}

              {isVisible("userValueSummary") && (
                <div className="space-y-2">
                  <Label htmlFor="userValueSummary" className="text-base font-semibold">
                    Refined User Value Summary
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    AI-generated summary of how this changes the user's day.
                  </p>
                  <TextareaAutosize
                    id="userValueSummary"
                    value={formData.userValueSummary || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, userValueSummary: e.target.value }))
                    }
                    placeholder="AI-generated summary will appear here..."
                    minRows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                  />
                </div>
              )}
            </div>
          )}

          {/* ─── VALUE TO THE BUSINESS (USPTO) ─── */}
          {businessSectionVisible && (
            <div className={`space-y-6 ${userSectionVisible ? "pt-6 border-t" : ""}`}>
              <div>
                <h3 className="font-semibold text-lg text-uspto-gray-text">Value to the Business</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  What changes for USPTO at the agency level — pendency, quality, cost.
                </p>
              </div>

              {isVisible("businessValue") && (
                <div className="space-y-2">
                  <Label htmlFor="businessValue">What is the expected business impact?</Label>
                  <Textarea
                    id="businessValue"
                    value={formData.businessValue}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, businessValue: e.target.value }))
                    }
                    placeholder="Describe the impact on the agency."
                    rows={4}
                  />
                </div>
              )}

              {(isVisible("costSavings") || isVisible("strategicBenefit")) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isVisible("costSavings") && (
                    <div className="space-y-2">
                      <Label htmlFor="costSavings">Estimate potential cost or time savings</Label>
                      <Select
                        value={formData.costSavings}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, costSavings: value as any }))
                        }
                      >
                        <SelectTrigger id="costSavings">
                          <SelectValue placeholder="Select a range..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lt_50k">{"<$50k"}</SelectItem>
                          <SelectItem value="50k_250k">$50k–$250k</SelectItem>
                          <SelectItem value="250k_1m">$250k–$1M</SelectItem>
                          <SelectItem value="gt_1m">$1M+</SelectItem>
                        </SelectContent>
                      </Select>
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

              {isVisible("businessValueSummary") && (
                <div className="space-y-2">
                  <Label htmlFor="businessValueSummary" className="text-base font-semibold">
                    Refined Business Value Summary
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    AI-generated summary of measurable agency-level impact.
                  </p>
                  <TextareaAutosize
                    id="businessValueSummary"
                    value={formData.businessValueSummary || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, businessValueSummary: e.target.value }))
                    }
                    placeholder="AI-generated summary will appear here..."
                    minRows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel step={5} onApplySuggestion={handleSuggestion} />
      </div>
    </div>
  )
}
