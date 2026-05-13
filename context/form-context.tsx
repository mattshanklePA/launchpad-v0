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
  resetForm: () => void
}

const STORAGE_KEY_FORM = "aid-form-data"
const STORAGE_KEY_STEP = "aid-current-step"

const FormContext = createContext<FormContextType | undefined>(undefined)

const arrayFields: (keyof FormData)[] = [
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
  // Hydrate from localStorage if a saved draft exists; otherwise start fresh.
  // This is what lets a submitter close the tab and resume later.
  //
  // If the saved step is 12 (confirmation page), the previous session was
  // already submitted — clear it and start fresh on this visit.
  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window === "undefined") return initialFormData
    try {
      const savedStep = localStorage.getItem(STORAGE_KEY_STEP)
      if (savedStep === "12") {
        localStorage.removeItem(STORAGE_KEY_FORM)
        localStorage.removeItem(STORAGE_KEY_STEP)
        return initialFormData
      }
      const saved = localStorage.getItem(STORAGE_KEY_FORM)
      if (!saved) return initialFormData
      const parsed = JSON.parse(saved)
      // Merge with initialFormData so any new fields added since the draft was
      // saved get default values instead of being undefined.
      return { ...initialFormData, ...parsed }
    } catch (error) {
      console.error("Failed to hydrate form data from localStorage:", error)
      return initialFormData
    }
  })

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === "undefined") return 1
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STEP)
      if (!saved) return 1
      // Already-submitted state — treat next visit as fresh
      if (saved === "12") return 1
      const parsed = parseInt(saved, 10)
      return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
    } catch {
      return 1
    }
  })

  // Persist on every change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(formData))
      } catch (error) {
        console.error("Failed to persist form data:", error)
      }
    }
  }, [formData])

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (currentStep > 1) {
          localStorage.setItem(STORAGE_KEY_STEP, currentStep.toString())
        } else {
          localStorage.removeItem(STORAGE_KEY_STEP)
        }
      } catch (error) {
        console.error("Failed to persist current step:", error)
      }
    }
  }, [currentStep])

  // Called after successful submission to clear the in-progress draft
  // so the user starts fresh next time they open /submit.
  const resetForm = () => {
    setFormData(initialFormData)
    setCurrentStep(1)
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY_FORM)
        localStorage.removeItem(STORAGE_KEY_STEP)
      } catch (error) {
        console.error("Failed to clear form storage:", error)
      }
    }
  }

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
        resetForm,
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
