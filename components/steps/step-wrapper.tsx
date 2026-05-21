"use client"
import type React from "react"
import { useForm } from "@/context/form-context"
import { formSteps, getPhaseForStep } from "@/lib/steps"
import { getSubmissionReadiness } from "@/lib/submissionReadiness"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function StepWrapper({ children }: { children: React.ReactNode }) {
  const { currentStep, goToNextStep, goToPreviousStep, isFirstStep, isLastStep, formData } = useForm()
  const stepInfo = formSteps[currentStep - 1]
  const phase = getPhaseForStep(currentStep)

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
        {phase && (
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs font-medium bg-uspto-blue-primary/5 border-uspto-blue-primary/20 text-uspto-blue-primary">
              Phase {phase.phase} · {phase.name}
            </Badge>
            <span className="text-xs text-muted-foreground">{phase.description}</span>
          </div>
        )}
        <CardTitle>{stepInfo.title}</CardTitle>
        <CardDescription>{stepInfo.prompt}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter className="flex flex-col gap-3">
        {!isLastStep && (
          <div className="w-full text-xs" aria-live="polite">
            {stepMissing.length > 0 ? (
              <div className="flex items-start gap-1.5 text-amber-700">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Still needed on this step:{" "}
                  <span className="font-medium">
                    {stepMissing.map((m) => m.message).join(", ")}
                  </span>
                  . You can continue and finish these later before submitting.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>This step is complete.</span>
              </div>
            )}
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
