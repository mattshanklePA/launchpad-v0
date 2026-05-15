"use client"
import type React from "react"
import { useForm } from "@/context/form-context"
import { formSteps, getPhaseForStep } from "@/lib/steps"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function StepWrapper({ children }: { children: React.ReactNode }) {
  const { currentStep, goToNextStep, goToPreviousStep, isFirstStep, isLastStep } = useForm()
  const stepInfo = formSteps[currentStep - 1]
  const phase = getPhaseForStep(currentStep)

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
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={goToPreviousStep} disabled={isFirstStep}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        {!isLastStep && (
          <Button onClick={goToNextStep}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
