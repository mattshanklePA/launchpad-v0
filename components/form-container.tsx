"use client"

import { useEffect } from "react"
import { useForm } from "@/context/form-context"
import { AnimatePresence, motion } from "framer-motion"
import { StepHeader, StepFooter } from "./steps/step-frame"
import { Step1SubmitterInfo } from "./steps/step-1-submitter-info"
import { Step2UseCaseOverview } from "./steps/step-2-use-case-overview"
import { Step3ProblemAndUsers } from "./steps/step-3-problem-and-users"
import { Step3SolutionBenefits } from "./steps/step-3-solution-benefits"
import { Step4TechnicalConstraints } from "./steps/step-4-technical-constraints"
import { Step10ReviewSubmit } from "./steps/step-10-review-submit"
import { Step11ExportTracking } from "./steps/step-11-export-tracking"
import { Button } from "@/components/ui/button"

export function FormContainer({ onSwitchToGuided }: { onSwitchToGuided?: () => void }) {
  const { currentStep, formData, showResumePrompt, continueDraft, startNewForm } = useForm()

  // Whenever the step changes (including quick-jumps from the header's Edit
  // link), bring the user back to the top of the page so they land on the
  // step heading and first field — not on a blank region scrolled halfway
  // down the previous step.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [currentStep])

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1SubmitterInfo />
      case 2:
        return <Step3ProblemAndUsers />
      case 3:
        return <Step3SolutionBenefits />
      case 4:
        return <Step4TechnicalConstraints />
      case 5:
        return <Step2UseCaseOverview />
      case 6:
        return <Step10ReviewSubmit />
      case 7:
        return <Step11ExportTracking />
      default:
        return <div>Invalid Step</div>
    }
  }

  // Step 7 is the confirmation page and doesn't need the standard wrapper
  if (currentStep === 7) {
    return renderStepContent()
  }

  return (
    <>
      {showResumePrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-title"
        >
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl text-left">
            <h2 id="resume-title" className="text-xl font-bold text-uspto-gray-text">
              Pick up where you left off?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You have an in-progress idea
              {formData.useCaseTitle ? (
                <>
                  {" "}
                  · <strong className="text-foreground">{formData.useCaseTitle}</strong>
                </>
              ) : (
                ""
              )}{" "}
              saved in this browser. Continue that draft, or start a new form.
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button variant="outline" onClick={startNewForm}>
                Start a new form
              </Button>
              <Button
                className="bg-uspto-blue-primary hover:bg-uspto-blue-primary/90"
                onClick={continueDraft}
              >
                Continue draft
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-[880px] flex-col gap-[22px] px-4 pb-6 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-[22px]"
          >
            <StepHeader onSwitchToGuided={onSwitchToGuided} />
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      {currentStep < 6 && <StepFooter />}
    </>
  )
}
