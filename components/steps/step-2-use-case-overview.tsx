"use client"
import { useForm } from "@/context/form-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useFieldVisibility } from "@/lib/formConfig"

export function Step2UseCaseOverview() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <Label htmlFor="useCaseTitle">Idea Title</Label>
        <Input
          id="useCaseTitle"
          value={formData.useCaseTitle}
          onChange={(e) => setFormData((prev) => ({ ...prev, useCaseTitle: e.target.value }))}
          placeholder="Give it a working title — e.g., Smarter Prior Art Search"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="useCaseDescription">Describe Your Idea</Label>
        <Textarea
          id="useCaseDescription"
          value={formData.useCaseDescription}
          onChange={(e) => setFormData((prev) => ({ ...prev, useCaseDescription: e.target.value }))}
          placeholder="What's the idea? Describe it in your own words — rough is fine..."
          rows={6}
        />
      </div>

      {isVisible("publicIndicator") && (
        <div className="space-y-3">
          <Label>Information Classification</Label>
          <RadioGroup
            value={formData.publicIndicator}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, publicIndicator: value as any }))}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="font-normal">
                <span className="font-medium">Public</span> - This information can be released publicly
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="excluded" id="excluded" />
              <Label htmlFor="excluded" className="font-normal">
                <span className="font-medium">Excluded</span> - This information must stay internal to USPTO
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  )
}
