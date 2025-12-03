"use client"
import { useForm } from "@/context/form-context"
import { Progress } from "@/components/ui/progress"

export function ProgressBar() {
  const { totalSteps, currentStep } = useForm()
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Step {currentStep} of {totalSteps}
      </span>
      <Progress value={progress} className="w-full" />
    </div>
  )
}
