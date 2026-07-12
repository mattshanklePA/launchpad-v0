"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { type FormData, initialFormData, getFormSteps } from "@/lib/steps"
import { getSession } from "@/lib/auth"
import { isStepEnabled } from "@/lib/formConfig"
import { profileAutofill } from "@/lib/ombAutofill"

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
  showResumePrompt: boolean
  continueDraft: () => void
  startNewForm: () => void
}

const STORAGE_KEY_FORM = "aid-form-data"
const STORAGE_KEY_STEP = "aid-current-step"
// Per-tab flag: set once the submitter is actively working in this session.
// Lives in sessionStorage so it clears when the tab closes — a brand-new
// session starts fresh and offers the draft via the resume prompt instead
// of silently dropping the user back into the middle of the form.
const SESSION_KEY = "aid-session-active"

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
// retype info every time. Falls back to empty values when no session. The
// actual session -> FormData mapping lives in lib/ombAutofill.ts's
// `profileAutofill` (pure, unit-tested) — this just supplies the session.
function profileFromSession(): Partial<FormData> {
  if (typeof window === "undefined") return {}
  return profileAutofill(getSession())
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
      // Merge precedence: saved draft wins for fields the user actually filled,
      // but for any submitter field that's blank in the saved draft, fall
      // through to the profile. This fixes the previous bug where a stale
      // draft with empty submitter strings would override the profile auto-fill.
      const merged: FormData = { ...initialFormData, ...parsed }
      const submitterKeys: (keyof FormData)[] = [
        "submitterName",
        "submitterEmail",
        "submitterRole",
        "submitterOffice",
        "submitterSubOffice",
      ]
      for (const key of submitterKeys) {
        const savedValue = merged[key]
        const profileValue = profile[key]
        const isEmpty =
          savedValue === undefined ||
          savedValue === null ||
          (typeof savedValue === "string" && savedValue.trim() === "")
        if (isEmpty && profileValue) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(merged as any)[key] = profileValue
        }
      }
      return merged
    } catch (error) {
      console.error("Failed to hydrate form data from localStorage:", error)
      return initialFormData
    }
  })

  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (typeof window === "undefined") return 1
    try {
      const profile = profileFromSession()
      // If the profile auto-fills Step 1, a fresh start lands on Step 2.
      const freshStart = isProfileComplete(profile) ? 2 : 1
      const params = new URLSearchParams(window.location.search)
      const forceResume = params.get("resume") === "1"
      const sessionActive = sessionStorage.getItem(SESSION_KEY) === "1"
      // Only drop the submitter back into a saved step when they explicitly
      // asked to resume (Resume button → ?resume=1) or they're already mid-session
      // in this tab (so a refresh doesn't lose their place). A brand-new session
      // starts fresh; the draft is offered via the resume prompt instead.
      if (forceResume || sessionActive) {
        const saved = localStorage.getItem(STORAGE_KEY_STEP)
        if (saved && saved !== "10") {
          const parsed = parseInt(saved, 10)
          if (Number.isFinite(parsed) && parsed >= 1) return parsed
        }
      }
      return freshStart
    } catch {
      return 1
    }
  })

  // Resume-prompt state. When an in-progress draft exists and this is a new
  // session, we ask "continue or start new?" rather than auto-resuming.
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [pendingResumeStep, setPendingResumeStep] = useState<number | null>(null)

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
    if (typeof window === "undefined") return
    try {
      // Don't persist (or clobber) the saved step until the user has committed
      // to a session — otherwise the fresh-start step would overwrite the saved
      // resume target before they pick "Continue draft".
      if (sessionStorage.getItem(SESSION_KEY) !== "1") return
      if (currentStep > 1) {
        localStorage.setItem(STORAGE_KEY_STEP, currentStep.toString())
      } else {
        localStorage.removeItem(STORAGE_KEY_STEP)
      }
    } catch (error) {
      console.error("Failed to persist current step:", error)
    }
  }, [currentStep])

  // On mount, decide whether to prompt. New session + meaningful draft → prompt.
  // Explicit ?resume=1 or an already-active session → no prompt (resume handled
  // by the initializer). No draft → just mark the session active and start.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get("resume") === "1") {
        sessionStorage.setItem(SESSION_KEY, "1")
        return
      }
      if (sessionStorage.getItem(SESSION_KEY) === "1") return
      const saved = localStorage.getItem(STORAGE_KEY_FORM)
      let hasContent = false
      let step = 1
      if (saved) {
        const parsed = JSON.parse(saved)
        hasContent = Boolean(
          (parsed.useCaseTitle || "").trim() ||
            (parsed.useCaseDescription || "").trim() ||
            (parsed.coreProblem || "").trim(),
        )
        const ss = localStorage.getItem(STORAGE_KEY_STEP)
        const n = ss ? parseInt(ss, 10) : NaN
        if (Number.isFinite(n) && n >= 1 && ss !== "10") step = n
      }
      if (hasContent) {
        setPendingResumeStep(step)
        setShowResumePrompt(true)
      } else {
        sessionStorage.setItem(SESSION_KEY, "1")
      }
    } catch {
      try {
        sessionStorage.setItem(SESSION_KEY, "1")
      } catch {
        /* ignore */
      }
    }
  }, [])

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

  // Resume the saved draft at the step the submitter left off on.
  const continueDraft = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(SESSION_KEY, "1")
      } catch {
        /* ignore */
      }
    }
    if (pendingResumeStep && pendingResumeStep >= 1) setCurrentStep(pendingResumeStep)
    setShowResumePrompt(false)
  }

  // Abandon the saved draft and start a clean form (profile fields preserved).
  const startNewForm = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(SESSION_KEY, "1")
      } catch {
        /* ignore */
      }
    }
    resetForm()
    setShowResumePrompt(false)
  }

  const totalSteps = getFormSteps().length
  // Review is the LAST interactive step before the confirmation page.
  // formSteps now has 10 entries (1-9 interactive + 10 confirmation).
  const reviewStepNumber = 9

  // Walk forward/backward until we hit a step that has at least one enabled
  // field, or land on the review step (which has no registry fields and is
  // always "enabled"). Prevents users from seeing a step with no fields.
  const findNextEnabledStep = (from: number, direction: 1 | -1): number => {
    let candidate = from + direction
    const lower = 1
    const upper = totalSteps
    while (candidate >= lower && candidate <= upper) {
      if (isStepEnabled(candidate)) return candidate
      candidate += direction
    }
    return from // no enabled step in that direction — stay put
  }

  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      const next = findNextEnabledStep(currentStep, 1)
      if (next !== currentStep) setCurrentStep(next)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      const prev = findNextEnabledStep(currentStep, -1)
      if (prev !== currentStep) setCurrentStep(prev)
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
        showResumePrompt,
        continueDraft,
        startNewForm,
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
