"use client"
import Link from "next/link"
import Image from "next/image"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Button } from "../ui/button"
import { Rocket, Home, Save } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "@/context/form-context"
import { saveDraft, updateDraft } from "@/lib/draft-storage"
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
import { useToast } from "@/hooks/use-toast"

export function FormHeader() {
  const { formData, currentStep, currentDraftId, setCurrentDraftId } = useForm()
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [draftTitle, setDraftTitle] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSaveAndExit = () => {
    if (formData.useCaseTitle) {
      setDraftTitle(formData.useCaseTitle)
    }
    setShowSaveDialog(true)
  }

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
      updateDraft(currentDraftId, {
        title: draftTitle,
        formData,
        currentStep,
      })
      toast({
        title: "Draft Saved",
        description: "Your draft has been saved successfully.",
      })
    } else {
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
    router.push("/")
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex h-20 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-4">
            <Image src="/uspto-logo.png" alt="USPTO Logo" width={80} height={26} className="object-contain" />
            <div className="h-10 border-l border-gray-300" />
            <div className="flex items-center gap-3">
              <Rocket className="h-7 w-7 text-uspto-blue-primary" />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-uspto-gray-text">LaunchPad</span>
                <p className="-mt-1 text-xs text-gray-500">USPTO AI Use Case Platform</p>
              </div>
            </div>
          </Link>
          <Button variant="outline" asChild className="ml-4 bg-transparent">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          <div className="flex-1 px-8">
            <ProgressBar />
          </div>
          <div>
            <Button variant="outline" onClick={handleSaveAndExit}>
              <Save className="mr-2 h-4 w-4" />
              Save & Exit
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Draft</DialogTitle>
            <DialogDescription>Give your draft a name so you can find it later.</DialogDescription>
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
            <Button onClick={handleSaveDraft}>Save & Exit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
