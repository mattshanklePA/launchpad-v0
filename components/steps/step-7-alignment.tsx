"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "../launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"

const focusAreaOptions = [
  { value: "operational_excellence", label: "Operational Excellence" },
  { value: "customer_experience", label: "Customer Experience" },
  { value: "responsible_ai", label: "Responsible AI & Policy Leadership" },
  { value: "data_driven", label: "Data-Driven Decisioning & Modern IT" },
]

export function Step7Alignment() {
  const { formData, setFormData } = useForm()

  const handleFocusAreaToggle = (item: string) => {
    const currentItems = formData.usptoFocusArea || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, usptoFocusArea: newItems }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-8 h-full">
          <div className="space-y-2">
            <Label>Which USPTO focus area does this support?</Label>
            <div className="flex flex-wrap gap-2">
              {focusAreaOptions.map((option) => (
                <Toggle
                  key={option.value}
                  pressed={formData.usptoFocusArea.includes(option.value)}
                  onPressedChange={() => handleFocusAreaToggle(option.value)}
                  variant="outline"
                  className="rounded-full px-3 py-1 text-sm h-auto"
                >
                  {option.label}
                </Toggle>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="relevantOkrs">Relevant USPTO OKRs or goals</Label>
            <Textarea
              id="relevantOkrs"
              value={formData.relevantOkrs}
              onChange={(e) => setFormData((prev) => ({ ...prev, relevantOkrs: e.target.value }))}
              placeholder="List any specific OKRs or goals this aligns with."
              rows={3}
            />
          </div>

          <div className="pt-6 mt-6 border-t space-y-2">
            <Label htmlFor="alignmentSummary" className="text-base font-semibold">
              Alignment Summary
            </Label>
            <p className="text-sm text-muted-foreground">
              This field is for the AI-generated refined summary of strategic alignment with USPTO goals.
            </p>
            <TextareaAutosize
              id="alignmentSummary"
              value={formData.alignmentSummary || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, alignmentSummary: e.target.value }))}
              placeholder="AI-generated summary will appear here..."
              minRows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            />
          </div>
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel
          step={7}
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, alignmentSummary: suggestion }))}
        />
      </div>
    </div>
  )
}
