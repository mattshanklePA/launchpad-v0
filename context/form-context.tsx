"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type FormData, initialFormData, formSteps } from "@/lib/steps"
import { getSession } from "@/lib/auth"

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

// Returns the subset of FormData that the submitter step (Step 1) covers,
// drawn from the active session. Used to auto-fill so the submitter doesn't
// retype info every time. Falls back to empty values when no session.
function profileFromSession(): Partial<FormData> {
  if (typeof window === "undefined") return {}
  const s = getSession()
  if (!s) return {}
  return {
    submitterName: s.name || "",
    submitterEmail: s.email || "",
    submitterRole: (s.jobRole as FormData["submitterRole"]) || "",
    submitterOffice: (s.businessUnit as FormData["submitterOffice"]) || "",
  }
}

function isProfileComplete(d: Partial<FormData>): boolean {
  return Boolean(
    d.submitterName?.trim() &&
      d.submitterEmail?.trim() &&
      d.submitterRole &&
      d.submitterOffice,
  )
}

export const FormProvider = ({ children }: { children: ReactNode }) => {
  // Hydrate from localStorage if a saved draft exists; otherwise start fresh
  // and auto-fill submitter info from the logged-in user's profile so they
  // don't have to retype it. If the saved step is 12 (confirmation page),
  // the previous session was already submitted — clear it and start fresh.
  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window === "undefined") return initialFormData
    try {
      const savedStep = localStorage.getItem(STORAGE_KEY_STEP)
      const profile = profileFromSession()
      if (savedStep === "10") {
        localStorage.removeItem(STORAGE_KEY_FORM)
        localStorage.removeItem(STORAGE_KEY_STEP)
        // Fresh start after submission — still auto-fill profile so the next
        // submission doesn't make the user retype Step 1.
        return { ...initialFormData, ...profile }
      }
      const saved = localStorage.getItem(STORAGE_KEY_FORM)
      if (!saved) {
        // Fresh draft — start with profile pre-filled.
        return { ...initialFormData, ...profile }
      }
      const parsed = JSON.parse(saved)
      // Merge: defaults < profile < saved draft. Saved values always win so
      // a user who edited submitter info inline doesn't get clobbered.
      return { ...initialFormData, ...profile, ...parsed }
    } catch (error) {
      console.error("Failed to hydrate form data from localStorage:", error)
      return initialFormData
    }
  })

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === "undefined") return 1
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STEP)
      if (saved && saved !== "10") {
        const parsed = parseInt(saved, 10)
        if (Number.isFinite(parsed) && parsed >= 1) return parsed
      }
      // No saved step (fresh start). If the user's profile auto-fills Step 1,
      // skip straight to Step 2 — Step 1 is still reachable via "Previous" or
      // the review screen "Edit" link, so nothing is lost.
      const profile = profileFromSession()
      return isProfileComplete(profile) ? 2 : 1
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
  // so the user starts fresh next time they open /submit. Profile-prefilled
  // submitter fields are preserved so they don't have to retype them.
  const resetForm = () => {
    const profile = profileFromSession()
    setFormData({ ...initialFormData, ...profile })
    setCurrentStep(isProfileComplete(profile) ? 2 : 1)
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
  // Review is the LAST interactive step before the confirmation page.
  // formSteps now has 10 entries (1-9 interactive + 10 confirmation).
  const reviewStepNumber = 9

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
