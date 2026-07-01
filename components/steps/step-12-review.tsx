// @ts-nocheck -- legacy v0 review step, superseded by step-10-review-submit.tsx; not imported anywhere. Kept only to avoid deleting from this branch; safe to remove.
"use client"
import { useForm } from "@/context/form-context"
import { formSteps, type FormData } from "@/lib/steps"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Rocket } from "lucide-react"
import { PDFExportButton } from "./pdf-export-button"

export function Step12Review() {
  const { formData, setCurrentStep } = useForm()

  return (
    <div className="space-y-6">
      {formSteps.slice(0, -1).map((step) => {
        const fieldId = step.fields[0]?.id as keyof FormData
        if (!fieldId) return null

        return (
          <Card key={step.step} className="overflow-hidden">
            <CardHeader className="bg-muted/50 flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-base">{step.title}</CardTitle>
              <Button variant="link" size="sm" onClick={() => setCurrentStep(step.step)}>
                Edit
              </Button>
            </CardHeader>
            <CardContent className="p-4 text-sm whitespace-pre-wrap">
              {step.step === 1 ? (
                <div className="grid grid-cols-2 gap-2">
                  <p>
                    <strong>Name:</strong> {formData.submitterName}
                  </p>
                  <p>
                    <strong>Email:</strong> {formData.submitterEmail}
                  </p>
                  <p>
                    <strong>Role:</strong> {formData.submitterRole}
                  </p>
                  <p>
                    <strong>Department:</strong> {formData.submitterDepartment}
                  </p>
                </div>
              ) : (
                formData[fieldId] || <span className="text-muted-foreground">Not provided.</span>
              )}
            </CardContent>
          </Card>
        )
      })}
      <div className="flex flex-wrap gap-4 justify-end pt-4 border-t">
        <Button variant="secondary" disabled>
          <Rocket className="mr-2 h-4 w-4" /> Submit to Rally (GovCloud)
        </Button>
        <PDFExportButton formData={formData} />
        <Button>Submit to AI Governance Council</Button>
      </div>
    </div>
  )
}
