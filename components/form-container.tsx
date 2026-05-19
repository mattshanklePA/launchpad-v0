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
import { Button } from "@/components/ui/button"
import { UserCircle2, PencilLine } from "lucide-react"

// Same enum labels used elsewhere — kept inline so the banner doesn't depend
// on a util we haven't created yet.
const ROLE_LABELS: Record<string, string> = {
  patent_examiner: "Patent Examiner",
  trademark_examiner: "Trademark Examiner",
  manager: "Manager",
  it_staff: "IT Staff",
  product_owner: "Product Owner",
  lead_product_owner: "Lead Product Owner",
  developer: "Developer",
  other: "Other",
}
const BU_LABELS: Record<string, string> = {
  patents: "Patents",
  trademarks: "Trademarks",
  ocio: "OCIO",
  ocfo: "OCFO",
  ogc: "OGC",
  opia: "OPIA",
  hr: "Human Resources",
  other: "Other",
}

export function FormContainer() {
  const { currentStep, setCurrentStep, formData } = useForm()

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

  // Show the "Submitting as…" pill on steps 2-11 (Step 1 IS the editable
  // submitter form, so no need to advertise it there). Only render if we
  // actually have a name to show.
  const showSubmitterPill =
    currentStep >= 2 && currentStep <= 11 && Boolean(formData.submitterName)
  const roleLabel = ROLE_LABELS[formData.submitterRole as string]
  const buLabel = BU_LABELS[formData.submitterOffice as string]

  return (
    <div className="max-w-[1800px] mx-auto px-4 py-8">
      {showSubmitterPill && (
        <div className="max-w-7xl mx-auto mb-3 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserCircle2 className="h-4 w-4 text-uspto-blue-primary" />
            <span>
              Submitting as <strong className="text-foreground">{formData.submitterName}</strong>
              {roleLabel && <> · {roleLabel}</>}
              {buLabel && <> · {buLabel}</>}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setCurrentStep(1)}
          >
            <PencilLine className="h-3 w-3 mr-1" />
            Edit submitter info
          </Button>
        </div>
      )}

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
