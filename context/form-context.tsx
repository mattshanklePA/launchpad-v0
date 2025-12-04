"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type FormData, initialFormData, formSteps } from "@/lib/steps"

interface FormContextType {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  currentStep: number
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>
  goToNextStep: () => void
  goToPreviousStep: () => void
  isFirstStep: boolean
  isLastStep: boolean
  totalSteps: number
}

const FormContext = createContext<FormContextType | undefined>(undefined)

const arrayFields: (keyof FormData)[] = [
  "painPoints",
  "problemType",
  "keyFunctionality",
  "otherUserImprovements",
  "strategicBenefit",
  "usptoFocusArea",
  "resourcesNeeded",
  "accessControlRequirements",
  "keyMetrics",
  "routeTo",
  "targetUserContext",
  "coreProblem",
  "proposedSolution",
  "userValue",
  "businessValue",
  "relevantOkrs",
  "dependencies",
  "successMetrics",
]

export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window !== "undefined") {
      // Clear the saved form data
      localStorage.removeItem("aid-form-data")
      localStorage.removeItem("aid-current-step")
    }
    return initialFormData
  })

  useEffect(() => {
    localStorage.setItem("aid-form-data", JSON.stringify(formData))
  }, [formData])

  useEffect(() => {
    if (currentStep > 1) {
      localStorage.setItem("aid-current-step", currentStep.toString())
    } else {
      localStorage.removeItem("aid-current-step")
    }
  }, [currentStep])

  const totalSteps = formSteps.length
  const reviewStepNumber = 11

  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === reviewStepNumber

  return (
    <FormContext.Provider
      value={{
        formData,
        setFormData,
        currentStep,
        setCurrentStep,
        goToNextStep,
        goToPreviousStep,
        isFirstStep,
        isLastStep,
        totalSteps: reviewStepNumber,
      }}
    >
      {children}
    </FormContext.Provider>
  )
}

export const useForm = () => {
  const context = useContext(FormContext)
  if (context === undefined) {
    throw new Error("useForm must be used within a FormProvider")
  }
  return context
}

function getInputFieldForStep(step: number): keyof FormData | null {
  switch (step) {
    case 3:
      return "targetUserContext"
    case 4:
      return "coreProblem"
    case 5:
      return "proposedSolution"
    case 6:
      return "userValue"
    case 7:
      return "businessValue"
    case 8:
      return "relevantOkrs"
    case 9:
      return "dependencies"
    case 10:
      return "successMetrics"
    default:
      return null
  }
}
