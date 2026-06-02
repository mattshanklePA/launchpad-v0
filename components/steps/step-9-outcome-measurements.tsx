"use client"
import { usePersistentDisclosure } from "@/hooks/use-persistent-disclosure"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "../launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"
import { useFieldVisibility } from "@/lib/formConfig"
import { OptionRadioGroup } from "@/components/launchpad/option-radio-group"
import { ChevronDown, ChevronRight } from "lucide-react"

const metricOptions = [
  { value: "time_savings", label: "Time savings" },
  { value: "cost_reduction", label: "Cost reduction" },
  { value: "improved_quality", label: "Improved quality" },
  { value: "user_satisfaction", label: "User satisfaction" },
  { value: "other", label: "Other" },
]

export function Step9OutcomeMeasurements() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()
  const [showOptional, setShowOptional] = usePersistentDisclosure("metrics")

  const handleMetricToggle = (item: string) => {
    const currentItems = formData.keyMetrics || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, keyMetrics: newItems }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7">
        <div className="space-y-8">
          {isVisible("successMetrics") && (
            <div className="space-y-2">
              <Label htmlFor="successMetrics" className="text-base font-semibold text-uspto-gray-text">
                How will we measure success?
              </Label>
              <Textarea
                id="successMetrics"
                value={formData.successMetrics}
                onChange={(e) => setFormData((prev) => ({ ...prev, successMetrics: e.target.value }))}
                placeholder="Describe the primary success indicators."
                rows={4}
                className="text-base"
              />
            </div>
          )}
          {isVisible("timelineForResults") && (
            <div className="space-y-2">
              <Label htmlFor="timelineForResults">Timeline for measurable results</Label>
              <OptionRadioGroup
                ariaLabel="Timeline for measurable results"
                value={formData.timelineForResults}
                onChange={(value) => setFormData((prev) => ({ ...prev, timelineForResults: value as any }))}
                options={[
                  { value: "lt_3", label: "<3 months" },
                  { value: "3_6", label: "3–6 months" },
                  { value: "6_12", label: "6–12 months" },
                  { value: "gt_12", label: "12+ months" },
                ]}
              />
            </div>
          )}

          {isVisible("keyMetrics") && (
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
                <div className="mt-5 space-y-2">
                  <Label>Key metrics</Label>
                  <div className="flex flex-wrap gap-2">
                    {metricOptions.map((option) => (
                      <Toggle
                        key={option.value}
                        pressed={formData.keyMetrics.includes(option.value)}
                        onPressedChange={() => handleMetricToggle(option.value)}
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

          {isVisible("metricsSummary") && (
            <div className="pt-6 border-t space-y-2">
              <Label htmlFor="metricsSummary" className="text-base font-semibold text-uspto-gray-text">
                Success Metrics Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                AI-generated refined summary of success metrics and measurement approach.
              </p>
              <TextareaAutosize
                id="metricsSummary"
                value={formData.metricsSummary || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, metricsSummary: e.target.value }))}
                placeholder="AI-generated summary will appear here..."
                minRows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              />
            </div>
          )}
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel
          step={7}
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, metricsSummary: suggestion }))}
        />
      </div>
    </div>
  )
}
