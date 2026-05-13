"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "../launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"

const metricOptions = [
  { value: "time_savings", label: "Time savings" },
  { value: "cost_reduction", label: "Cost reduction" },
  { value: "improved_quality", label: "Improved quality" },
  { value: "user_satisfaction", label: "User satisfaction" },
  { value: "other", label: "Other" },
]

export function Step9OutcomeMeasurements() {
  const { formData, setFormData } = useForm()

  const handleMetricToggle = (item: string) => {
    const currentItems = formData.keyMetrics || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, keyMetrics: newItems }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-8 h-full">
          <div className="space-y-2">
            <Label htmlFor="successMetrics">How will we measure success?</Label>
            <Textarea
              id="successMetrics"
              value={formData.successMetrics}
              onChange={(e) => setFormData((prev) => ({ ...prev, successMetrics: e.target.value }))}
              placeholder="Describe the primary success indicators."
              rows={4}
            />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="timelineForResults">Timeline for measurable results</Label>
            <Select
              value={formData.timelineForResults}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, timelineForResults: value as any }))}
            >
              <SelectTrigger id="timelineForResults">
                <SelectValue placeholder="Select a timeline..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lt_3">{"<3 months"}</SelectItem>
                <SelectItem value="3_6">3–6 months</SelectItem>
                <SelectItem value="6_12">6–12 months</SelectItem>
                <SelectItem value="gt_12">12+ months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-6 mt-6 border-t space-y-2">
            <Label htmlFor="metricsSummary" className="text-base font-semibold">
              Success Metrics Summary
            </Label>
            <p className="text-sm text-muted-foreground">
              This field is for the AI-generated refined summary of success metrics and measurement approach.
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
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel
          step={10}
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, metricsSummary: suggestion }))}
        />
      </div>
    </div>
  )
}
