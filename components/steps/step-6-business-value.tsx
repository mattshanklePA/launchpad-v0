"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "../launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"

const benefitOptions = [
  { value: "improve_quality", label: "Improve patent/trademark quality" },
  { value: "reduce_backlog", label: "Reduce backlog" },
  { value: "support_goals", label: "Support USPTO strategic goals" },
  { value: "other", label: "Other" },
]

export function Step6BusinessValue() {
  const { formData, setFormData } = useForm()

  const handleBenefitToggle = (item: string) => {
    const currentItems = formData.strategicBenefit || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, strategicBenefit: newItems }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-8 h-full">
          <div className="space-y-2">
            <Label htmlFor="businessValue">What is the expected business impact?</Label>
            <Textarea
              id="businessValue"
              value={formData.businessValue}
              onChange={(e) => setFormData((prev) => ({ ...prev, businessValue: e.target.value }))}
              placeholder="Describe the impact on the agency."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="costSavings">Estimate potential cost or time savings</Label>
            <Select
              value={formData.costSavings}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, costSavings: value as any }))}
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
          <div className="space-y-2">
            <Label>Strategic benefit</Label>
            <div className="flex flex-wrap gap-2">
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

          <div className="pt-6 mt-6 border-t space-y-2">
            <Label htmlFor="businessValueSummary" className="text-base font-semibold">
              Business Value Summary
            </Label>
            <p className="text-sm text-muted-foreground">
              This field is for the AI-generated refined summary of business value and impact.
            </p>
            <TextareaAutosize
              id="businessValueSummary"
              value={formData.businessValueSummary || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, businessValueSummary: e.target.value }))}
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
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, businessValueSummary: suggestion }))}
        />
      </div>
    </div>
  )
}
