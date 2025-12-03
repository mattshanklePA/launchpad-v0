"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AIdChatPanel } from "../launchpad/chat-panel"
import { X } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { useState } from "react"

const MAX_FEATURES = 3

export function Step4ProposedSolution() {
  const { formData, setFormData } = useForm()
  const [newFeature, setNewFeature] = useState("")

  const handleAddFeature = () => {
    if (newFeature && (formData.keyFunctionality || []).length < MAX_FEATURES) {
      setFormData((prev) => ({ ...prev, keyFunctionality: [...(prev.keyFunctionality || []), newFeature] }))
      setNewFeature("")
    }
  }

  const handleRemoveFeature = (feature: string) => {
    setFormData((prev) => ({ ...prev, keyFunctionality: (prev.keyFunctionality || []).filter((f) => f !== feature) }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-12">
      <div className="lg:col-span-7">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-8 h-full">
          <div className="space-y-2">
            <Label htmlFor="proposedSolution">Describe your proposed solution</Label>
            <Textarea
              id="proposedSolution"
              value={formData.proposedSolution}
              onChange={(e) => setFormData((prev) => ({ ...prev, proposedSolution: e.target.value }))}
              placeholder="Provide a short narrative of your solution."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Key functionality (top 3 features)</Label>
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature..."
                disabled={(formData.keyFunctionality || []).length >= MAX_FEATURES}
              />
              <Button onClick={handleAddFeature} disabled={(formData.keyFunctionality || []).length >= MAX_FEATURES}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {(formData.keyFunctionality || []).map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-1 bg-muted text-muted-foreground rounded-full pl-3 pr-1 py-1 text-sm"
                >
                  <span>{feature}</span>
                  <button onClick={() => handleRemoveFeature(feature)} className="rounded-full hover:bg-background">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel
          step={4}
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, proposedSolution: suggestion }))}
        />
      </div>
    </div>
  )
}
