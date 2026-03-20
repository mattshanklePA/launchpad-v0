"use client"
import { useForm } from "@/context/form-context"
import { formSteps } from "@/lib/steps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "../ui/label"
import { Toggle } from "../ui/toggle"
import { Textarea } from "../ui/textarea"

const routeOptions = [
  { value: "rally", label: "Export to Rally" },
  { value: "governance", label: "Submit for Governance Vetting" },
  { value: "draft", label: "Save as Draft (continue later)" },
]

export function Step10ReviewSubmit() {
  const { formData, setCurrentStep, setFormData } = useForm()

  const handleRouteToggle = (item: string) => {
    const currentItems = formData.routeTo || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, routeTo: newItems }))
  }

  const renderValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.join(", ") || <span className="text-muted-foreground">Not provided</span>
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No"
    }
    return value || <span className="text-muted-foreground">Not provided</span>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {formSteps.slice(0, 9).map((step) => (
        <Card key={step.step}>
          <CardHeader className="bg-muted/50 flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-base">
              Step {step.step}: {step.title}
            </CardTitle>
            <Button variant="link" size="sm" onClick={() => setCurrentStep(step.step)}>
              Edit
            </Button>
          </CardHeader>
          <CardContent className="p-4 text-sm">
            {/* This is a simplified review. A real implementation would map over fields. */}
            <pre className="whitespace-pre-wrap font-sans">
              {Object.entries(formData)
                .filter(([key]) =>
                  // A crude way to show relevant data for the step
                  key
                    .toLowerCase()
                    .includes(step.name.split(" ")[0].toLowerCase()),
                )
                .map(([key, value]) => `${key}: ${renderValue(value)}\n`)
                .join("")}
            </pre>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Submit for Vetting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Route to</Label>
            <div className="flex flex-wrap gap-2">
              {routeOptions.map((option) => (
                <Toggle
                  key={option.value}
                  pressed={formData.routeTo.includes(option.value)}
                  onPressedChange={() => handleRouteToggle(option.value)}
                  variant="outline"
                  className="rounded-full px-3 py-1 text-sm h-auto"
                >
                  {option.label}
                </Toggle>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewerNotes">Anything the vetting team should know?</Label>
            <Textarea
              id="reviewerNotes"
              value={formData.reviewerNotes}
              onChange={(e) => setFormData((prev) => ({ ...prev, reviewerNotes: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
