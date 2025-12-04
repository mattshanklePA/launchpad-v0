"use client"

import { FormContainer } from "@/components/form-container"
import { useEffect } from "react"
import { useForm } from "@/context/form-context"
import { getDraft, clearCurrentDraft } from "@/lib/draft-storage"
import { useSearchParams } from "next/navigation"
import { initialFormData } from "@/lib/steps"

export default function Home() {
  const { setFormData, setCurrentStep, setCurrentDraftId } = useForm()
  const searchParams = useSearchParams()

  useEffect(() => {
    const isNewDraft = searchParams.get("new") === "true"

    if (isNewDraft) {
      clearCurrentDraft()
      setFormData(initialFormData)
      setCurrentStep(1)
      setCurrentDraftId(null)
    } else {
      const draftId = localStorage.getItem("aid-current-draft-id")
      if (draftId) {
        const draft = getDraft(draftId)
        if (draft) {
          setFormData(draft.formData)
          setCurrentStep(draft.currentStep)
          setCurrentDraftId(draftId)
        }
      }
    }
  }, [searchParams, setFormData, setCurrentStep, setCurrentDraftId])

  return (
    <div className="relative flex min-h-screen flex-col">
      <main className="flex-1">
        <FormContainer />
      </main>
    </div>
  )
}
