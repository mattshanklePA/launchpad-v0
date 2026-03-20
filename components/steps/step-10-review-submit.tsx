"use client"
import { useState } from "react"
import { useForm } from "@/context/form-context"
import { formSteps } from "@/lib/steps"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "../ui/label"
import { Toggle } from "../ui/toggle"
import { Textarea } from "../ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ShieldCheck, Loader2, ChevronDown, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react"
import { assessReadiness } from "@/app/actions"

const routeOptions = [
  { value: "rally", label: "Export to Rally" },
  { value: "governance", label: "Submit for Governance Vetting" },
  { value: "draft", label: "Save as Draft (continue later)" },
]

export function Step10ReviewSubmit() {
  const { formData, setCurrentStep, setFormData } = useForm()
  const [isAssessing, setIsAssessing] = useState(false)
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(false)

  const handleRouteToggle = (item: string) => {
    const currentItems = formData.routeTo || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, routeTo: newItems }))
  }

  const handleAssessReadiness = async () => {
    setIsAssessing(true)
    try {
      const result = await assessReadiness(formData)
      setFormData((prev) => ({
        ...prev,
        readinessScore: result.readinessScore,
        readinessSummary: result.readinessSummary,
        executiveSummary: result.executiveSummary,
      }))
    } catch (error) {
      console.error("Error assessing readiness:", error)
    } finally {
      setIsAssessing(false)
    }
  }

  const getReadinessBadge = () => {
    switch (formData.readinessScore) {
      case "ready":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 text-sm px-3 py-1">
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Ready for Review
          </Badge>
        )
      case "needs_work":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-sm px-3 py-1">
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Needs Work
          </Badge>
        )
      case "early_stage":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 text-sm px-3 py-1">
            <AlertCircle className="w-4 h-4 mr-1.5" />
            Early Stage — Keep Refining
          </Badge>
        )
      default:
        return null
    }
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
      {/* Readiness Assessment Section */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Vetting Readiness Check
          </CardTitle>
          <CardDescription>
            Before submitting, get an AI assessment of whether your idea is ready for leadership review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!formData.readinessScore ? (
            <Button 
              onClick={handleAssessReadiness} 
              disabled={isAssessing}
              className="w-full sm:w-auto"
            >
              {isAssessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Evaluating your idea...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Assess Vetting Readiness
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {getReadinessBadge()}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {formData.readinessSummary}
              </p>
              <Collapsible open={showExecutiveSummary} onOpenChange={setShowExecutiveSummary}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Executive Summary (Preview)
                    <ChevronDown className={`w-4 h-4 transition-transform ${showExecutiveSummary ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed border">
                    {formData.executiveSummary}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAssessReadiness}
                disabled={isAssessing}
              >
                {isAssessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Re-evaluating...
                  </>
                ) : (
                  "Re-assess Readiness"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
