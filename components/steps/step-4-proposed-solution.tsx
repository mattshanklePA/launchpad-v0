"use client"
import { useState } from "react"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AIdChatPanel } from "../launchpad/chat-panel"
import { X, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import TextareaAutosize from "react-textarea-autosize"
import { useFieldVisibility } from "@/lib/formConfig"

const MAX_FEATURES = 3

export function Step4ProposedSolution() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()
  const [newFeature, setNewFeature] = useState("")
  const [showOptional, setShowOptional] = useState(false)

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
    <div className="grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7">
        <div className="space-y-8">
          {isVisible("proposedSolution") && (
            <div className="space-y-2">
              <Label htmlFor="proposedSolution" className="text-base font-semibold text-uspto-gray-text">
                Describe your proposed solution
              </Label>
              <Textarea
                id="proposedSolution"
                value={formData.proposedSolution}
                onChange={(e) => setFormData((prev) => ({ ...prev, proposedSolution: e.target.value }))}
                placeholder="Provide a short narrative of your solution."
                rows={4}
                className="text-base"
              />
            </div>
          )}

          {isVisible("keyFunctionality") && (
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
              )}
            </div>
          )}

          {isVisible("solutionSummary") && (
            <div className="pt-6 border-t space-y-2">
              <Label htmlFor="solutionSummary" className="text-base font-semibold text-uspto-gray-text">
                Solution Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                AI-generated refined summary of your proposed solution. Open Scout to draft or refine.
              </p>
              <TextareaAutosize
                id="solutionSummary"
                value={formData.solutionSummary || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, solutionSummary: e.target.value }))}
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
          step={3}
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, solutionSummary: suggestion }))}
        />
      </div>
    </div>
  )
}
