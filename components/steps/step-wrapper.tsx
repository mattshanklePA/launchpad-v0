"use client"
import type React from "react"
import { useForm } from "@/context/form-context"
import { formSteps } from "@/lib/steps"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveDraft, updateDraft } from "@/lib/draft-storage"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function StepWrapper({ children }: { children: React.ReactNode }) {
  const {
    currentStep,
    goToNextStep,
    goToPreviousStep,
    isFirstStep,
    isLastStep,
    formData,
    currentDraftId,
    setCurrentDraftId,
  } = useForm()
  const stepInfo = formSteps[currentStep - 1]
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [draftTitle, setDraftTitle] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSaveDraft = () => {
    if (!draftTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your draft.",
        variant: "destructive",
      })
      return
    }

    if (currentDraftId) {
      // Update existing draft
      updateDraft(currentDraftId, {
        title: draftTitle,
        formData,
        currentStep,
      })
      toast({
        title: "Draft Updated",
        description: "Your draft has been saved successfully.",
      })
    } else {
      // Save new draft
      const newDraft = saveDraft({
        title: draftTitle,
        formData,
        currentStep,
      })
      setCurrentDraftId(newDraft.id)
      localStorage.setItem("aid-current-draft-id", newDraft.id)
      toast({
        title: "Draft Saved",
        description: "Your draft has been saved successfully.",
      })
    }

    setShowSaveDialog(false)
    setDraftTitle("")
  }

  const handleOpenSaveDialog = () => {
    if (formData.useCaseTitle) {
      setDraftTitle(formData.useCaseTitle)
    }
    setShowSaveDialog(true)
  }

  // Guard against invalid steps
  if (!stepInfo) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Error: Invalid Step</CardTitle>
          <CardDescription>The requested step does not exist.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{stepInfo.title}</CardTitle>
          <CardDescription>{stepInfo.prompt}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={goToPreviousStep} disabled={isFirstStep}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenSaveDialog}>
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            {!isLastStep && (
              <Button onClick={goToNextStep}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentDraftId ? "Update Draft" : "Save Draft"}</DialogTitle>
            <DialogDescription>
              {currentDraftId ? "Update the title for your draft." : "Give your draft a name so you can find it later."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="draft-title">Draft Title</Label>
              <Input
                id="draft-title"
                placeholder="e.g., NLP-Powered Prior Art Search"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveDraft()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDraft}>{currentDraftId ? "Update" : "Save"} Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
