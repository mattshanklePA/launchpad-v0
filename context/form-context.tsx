"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { type FormData, initialFormData, formSteps } from "@/lib/steps"
import { updateDraft } from "@/lib/draft-storage"

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
  currentDraftId: string | null
  setCurrentDraftId: React.Dispatch<React.SetStateAction<string | null>>
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
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("aid-form-data")
      if (savedData) {
        const parsedData = JSON.parse(savedData)

        // Ensure all fields that are supposed to be arrays are, in fact, arrays.
        for (const field of arrayFields) {
          if (!Array.isArray(parsedData[field])) {
            parsedData[field] = []
          }
        }

        return { ...initialFormData, ...parsedData }
      }
    }
    return initialFormData
  })

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const formDataRef = useRef(formData)
  const currentStepRef = useRef(currentStep)

  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  useEffect(() => {
    currentStepRef.current = currentStep
  }, [currentStep])

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

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
    }

    if (currentDraftId) {
      autoSaveTimerRef.current = setInterval(() => {
        console.log("[v0] Auto-saving draft...")
        updateDraft(currentDraftId, {
          formData: formDataRef.current,
          currentStep: currentStepRef.current,
          title: formDataRef.current.useCaseTitle || "Untitled Draft",
        })
      }, 60000) // 60 seconds

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current)
        }
      }
    }
  }, [currentDraftId])

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
        currentDraftId,
        setCurrentDraftId,
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
