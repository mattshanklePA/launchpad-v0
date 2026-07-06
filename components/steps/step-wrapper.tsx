"use client"
import type React from "react"
import { useForm } from "@/context/form-context"
import { getFormSteps } from "@/lib/steps"
import { getSubmissionReadiness } from "@/lib/submissionReadiness"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function StepWrapper({ children }: { children: React.ReactNode }) {
  const { currentStep, goToNextStep, goToPreviousStep, isFirstStep, isLastStep, formData } = useForm()
  const stepInfo = getFormSteps()[currentStep - 1]

  // What's still required on THIS step? Used to give the submitter a clear,
  // non-blocking hint near the Next button (they can still move freely; the
  // hard gate is the readiness check on the review step).
  const stepMissing = getSubmissionReadiness(formData).missing.filter((m) => m.step === currentStep)

  // Guard against invalid steps
  if (!stepInfo) {
    return (
      <Card className="max-w-7xl mx-auto">
        <CardHeader>
          <CardTitle>Error: Invalid Step</CardTitle>
          <CardDescription>The requested step does not exist.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="max-w-7xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-uspto-gray-text">{stepInfo.title}</CardTitle>
        <CardDescription className="text-base">{stepInfo.prompt}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter className="flex flex-col gap-3">
        {!isLastStep && stepMissing.length > 0 && (
          <div className="w-full text-xs text-muted-foreground flex items-start gap-1.5" aria-live="polite">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
            <span>Still needed before submitting: {stepMissing.map((m) => m.message).join(", ")}</span>
          </div>
        )}
        <div className="flex w-full justify-between">
          <Button variant="outline" onClick={goToPreviousStep} disabled={isFirstStep}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          {!isLastStep && (
            <Button onClick={goToNextStep}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
