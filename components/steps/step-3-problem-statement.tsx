"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "../launchpad/chat-panel"

const problemTypeOptions = [
  { value: "process_inefficiency", label: "Process inefficiency" },
  { value: "technical_debt", label: "Technical debt" },
  { value: "policy_gap", label: "Policy gap" },
  { value: "user_experience", label: "User experience" },
  { value: "other", label: "Other" },
]

export function Step3ProblemStatement() {
  const { formData, setFormData } = useForm()

  const handleProblemTypeToggle = (type: string) => {
    const currentTypes = formData.problemType || []
    const newTypes = currentTypes.includes(type) ? currentTypes.filter((t) => t !== type) : [...currentTypes, type]
    setFormData((prev) => ({ ...prev, problemType: newTypes }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-8 h-full">
          <div className="space-y-2">
            <Label htmlFor="coreProblem">What is the core problem or opportunity?</Label>
            <Textarea
              id="coreProblem"
              value={formData.coreProblem}
              onChange={(e) => setFormData((prev) => ({ ...prev, coreProblem: e.target.value }))}
              placeholder="Summarize the main issue."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="problemImpact">Why does this problem matter?</Label>
            <Textarea
              id="problemImpact"
              value={formData.problemImpact}
              onChange={(e) => setFormData((prev) => ({ ...prev, problemImpact: e.target.value }))}
              placeholder="Describe the impact on users, the agency, or the mission."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="affectedSystem">Which process, system, or group does this affect?</Label>
            <Select
              value={formData.affectedSystem}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, affectedSystem: value as any }))}
            >
              <SelectTrigger id="affectedSystem">
                <SelectValue placeholder="Select an area..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patents">Patents</SelectItem>
                <SelectItem value="trademarks">Trademarks</SelectItem>
                <SelectItem value="it_systems">IT systems</SelectItem>
                <SelectItem value="cross_functional">Cross-functional</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Problem type</Label>
            <div className="flex flex-wrap gap-2">
              {problemTypeOptions.map((option) => (
                <Toggle
                  key={option.value}
                  pressed={formData.problemType.includes(option.value)}
                  onPressedChange={() => handleProblemTypeToggle(option.value)}
                  variant="outline"
                  className="rounded-full px-3 py-1 text-sm h-auto"
                >
                  {option.label}
                </Toggle>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <RadioGroup
              value={formData.severity}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, severity: value as any }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="sev-low" />
                <Label htmlFor="sev-low">Low</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="sev-medium" />
                <Label htmlFor="sev-medium">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="sev-high" />
                <Label htmlFor="sev-high">High</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel
          step={3}
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, coreProblem: suggestion }))}
        />
      </div>
    </div>
  )
}
