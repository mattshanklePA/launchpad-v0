"use client"

import { useEffect } from "react"
import { useForm } from "@/context/form-context"
import { AnimatePresence, motion } from "framer-motion"
import { StepWrapper } from "./steps/step-wrapper"
import { Step1SubmitterInfo } from "./steps/step-1-submitter-info"
import { Step2UseCaseOverview } from "./steps/step-2-use-case-overview"
import { Step3ProblemAndUsers } from "./steps/step-3-problem-and-users"
import { Step4ProposedSolution } from "./steps/step-4-proposed-solution"
import { Step5Value } from "./steps/step-5-value"
import { Step7Alignment } from "./steps/step-7-alignment"
import { Step8FeasibilitySecurity } from "./steps/step-8-feasibility-security"
import { Step9OutcomeMeasurements } from "./steps/step-9-outcome-measurements"
import { Step10ReviewSubmit } from "./steps/step-10-review-submit"
import { Step11ExportTracking } from "./steps/step-11-export-tracking"
import { Button } from "@/components/ui/button"
import { UserCircle2, PencilLine } from "lucide-react"
import { WizardNav } from "@/components/layout/wizard-nav"
import { SUBMITTER_ROLE_LABELS } from "@/lib/steps"
import { getTenant } from "@/lib/tenant"

export function FormContainer() {
  const { currentStep, setCurrentStep, formData, showResumePrompt, continueDraft, startNewForm } = useForm()

  // Whenever the step changes (including quick-jumps from the left nav), bring
  // the user back to the top of the page so they land on the step heading and
  // first field — not on a blank region scrolled halfway down the previous step.
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
        return <Step4ProposedSolution />
      case 4:
        return <Step5Value />
      case 5:
        return <Step7Alignment />
      case 6:
        return <Step8FeasibilitySecurity />
      case 7:
        return <Step9OutcomeMeasurements />
      case 8:
        return <Step2UseCaseOverview />
      case 9:
        return <Step10ReviewSubmit />
      case 10:
        return <Step11ExportTracking />
      default:
        return <div>Invalid Step</div>
    }
  }

  // Step 10 is the confirmation page and doesn't need the standard wrapper
  if (currentStep === 10) {
    return renderStepContent()
  }

  // Show the "Submitting as…" pill on steps 2-9 (Step 1 IS the editable
  // submitter form, so no need to advertise it there). Only render if we
  // actually have a name to show.
  const showSubmitterPill =
    currentStep >= 2 && currentStep <= 9 && Boolean(formData.submitterName)
  const roleLabel = SUBMITTER_ROLE_LABELS[formData.submitterRole as string]
  const buLabel = getTenant().unit.options.find((o) => o.value === formData.submitterOffice)?.label

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
    <div className="max-w-[1800px] mx-auto px-4 py-8 overflow-x-hidden">
      <div className="flex gap-6">
        {/* Left sidebar: wizard nav (desktop only) */}
        <WizardNav />

        {/* Center column: header pill + active step */}
        <div className="flex-1 min-w-0">
          {showSubmitterPill && (
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
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
                className="h-7 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto"
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <StepWrapper>{renderStepContent()}</StepWrapper>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
    </>
  )
}
