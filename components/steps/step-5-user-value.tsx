"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "../launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"

const improvementOptions = [
  { value: "faster_processing", label: "Faster processing" },
  { value: "better_accuracy", label: "Better accuracy" },
  { value: "reduced_frustration", label: "Reduced frustration" },
  { value: "other", label: "Other" },
]

export function Step5UserValue() {
  const { formData, setFormData } = useForm()

  const handleImprovementToggle = (item: string) => {
    const currentItems = formData.otherUserImprovements || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, otherUserImprovements: newItems }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-8 h-full">
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
          <div className="space-y-2">
            <Label htmlFor="userTimeSavings">Expected user time savings</Label>
            <Select
              value={formData.userTimeSavings}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, userTimeSavings: value as any }))}
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
          <div className="space-y-2">
            <Label>Other measurable improvements</Label>
            <div className="flex flex-wrap gap-2">
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

          <div className="pt-6 mt-6 border-t space-y-2">
            <Label htmlFor="userValueSummary" className="text-base font-semibold">
              User Value Summary
            </Label>
            <p className="text-sm text-muted-foreground">
              This field is for the AI-generated refined summary of user value and benefits.
            </p>
            <TextareaAutosize
              id="userValueSummary"
              value={formData.userValueSummary || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, userValueSummary: e.target.value }))}
              placeholder="AI-generated summary will appear here..."
              minRows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            />
          </div>
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel
          step={6}
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, userValueSummary: suggestion }))}
        />
      </div>
    </div>
  )
}
