"use client"

import { useForm } from "@/context/form-context"
import { AnimatePresence, motion } from "framer-motion"
import { StepWrapper } from "./steps/step-wrapper"
import { Step1SubmitterInfo } from "./steps/step-1-submitter-info"
import { Step2UseCaseOverview } from "./steps/step-2-use-case-overview"
import { Step3TargetUser } from "./steps/step-3-target-user"
import { Step3ProblemStatement } from "./steps/step-3-problem-statement"
import { Step4ProposedSolution } from "./steps/step-4-proposed-solution"
import { Step5UserValue } from "./steps/step-5-user-value"
import { Step6BusinessValue } from "./steps/step-6-business-value"
import { Step7Alignment } from "./steps/step-7-alignment"
import { Step8FeasibilitySecurity } from "./steps/step-8-feasibility-security"
import { Step9OutcomeMeasurements } from "./steps/step-9-outcome-measurements"
import { Step10ReviewSubmit } from "./steps/step-10-review-submit"
import { Step11ExportTracking } from "./steps/step-11-export-tracking"

export function FormContainer() {
  const { currentStep } = useForm()

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1SubmitterInfo />
      case 2:
        return <Step2UseCaseOverview />
      case 3:
        return <Step3TargetUser />
      case 4:
        return <Step3ProblemStatement />
      case 5:
        return <Step4ProposedSolution />
      case 6:
        return <Step5UserValue />
      case 7:
        return <Step6BusinessValue />
      case 8:
        return <Step7Alignment />
      case 9:
        return <Step8FeasibilitySecurity />
      case 10:
        return <Step9OutcomeMeasurements />
      case 11:
        return <Step10ReviewSubmit />
      case 12:
        return <Step11ExportTracking />
      default:
        return <div>Invalid Step</div>
    }
  }

  // Step 12 is a confirmation page and doesn't need the standard wrapper
  if (currentStep === 12) {
    return renderStepContent()
  }

  return (
    <div className="container py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <StepWrapper>{renderStepContent()}</StepWrapper>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
