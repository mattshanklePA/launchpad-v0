"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "../launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"

const resourceOptions = [
  { value: "dev_staff", label: "Development staff" },
  { value: "data_access", label: "Data access" },
  { value: "vendor_support", label: "Vendor support" },
  { value: "other", label: "Other" },
]
const accessOptions = [
  { value: "role_based", label: "Role-based access" },
  { value: "mfa", label: "MFA" },
  { value: "fedramp", label: "FedRAMP compliance" },
  { value: "other", label: "Other" },
]

export function Step8FeasibilitySecurity() {
  const { formData, setFormData } = useForm()

  const handleToggle = (field: "resourcesNeeded" | "accessControlRequirements", item: string) => {
    const currentItems = formData[field] || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, [field]: newItems }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-8 h-full">
          <div className="space-y-2">
            <Label>Implementation complexity</Label>
            <RadioGroup
              value={formData.implementationComplexity}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, implementationComplexity: value as any }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="comp-low" />
                <Label htmlFor="comp-low">Low</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="comp-medium" />
                <Label htmlFor="comp-medium">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="comp-high" />
                <Label htmlFor="comp-high">High</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>What resources are needed?</Label>
            <div className="flex flex-wrap gap-2">
              {resourceOptions.map((option) => (
                <Toggle
                  key={option.value}
                  pressed={formData.resourcesNeeded.includes(option.value)}
                  onPressedChange={() => handleToggle("resourcesNeeded", option.value)}
                  variant="outline"
                  className="rounded-full px-3 py-1 text-sm h-auto"
                >
                  {option.label}
                </Toggle>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dependencies">Key dependencies or constraints</Label>
            <Textarea
              id="dependencies"
              value={formData.dependencies}
              onChange={(e) => setFormData((prev) => ({ ...prev, dependencies: e.target.value }))}
              placeholder="e.g., API access to legacy systems, vendor contracts..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Does this involve sensitive data?</Label>
            <RadioGroup
              value={formData.involvesSensitiveData}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, involvesSensitiveData: value as any }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="data-yes" />
                <Label htmlFor="data-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="data-no" />
                <Label htmlFor="data-no">No</Label>
              </div>
            </RadioGroup>
          </div>
          {formData.involvesSensitiveData === "yes" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="securityClassification">Security classification</Label>
                <Select
                  value={formData.securityClassification}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, securityClassification: value as any }))}
                >
                  <SelectTrigger id="securityClassification">
                    <SelectValue placeholder="Select classification..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal only</SelectItem>
                    <SelectItem value="external">External shareable</SelectItem>
                    <SelectItem value="controlled">Controlled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Access control requirements</Label>
                <div className="flex flex-wrap gap-2">
                  {accessOptions.map((option) => (
                    <Toggle
                      key={option.value}
                      pressed={formData.accessControlRequirements.includes(option.value)}
                      onPressedChange={() => handleToggle("accessControlRequirements", option.value)}
                      variant="outline"
                      className="rounded-full px-3 py-1 text-sm h-auto"
                    >
                      {option.label}
                    </Toggle>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="pt-6 mt-6 border-t space-y-2">
            <Label htmlFor="feasibilitySummary" className="text-base font-semibold">
              Feasibility & Security Summary
            </Label>
            <p className="text-sm text-muted-foreground">
              This field is for the AI-generated refined summary of implementation feasibility and security
              considerations.
            </p>
            <TextareaAutosize
              id="feasibilitySummary"
              value={formData.feasibilitySummary || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, feasibilitySummary: e.target.value }))}
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
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, feasibilitySummary: suggestion }))}
        />
      </div>
    </div>
  )
}
