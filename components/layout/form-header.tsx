"use client"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Button } from "../ui/button"
import { Rocket, Home, Save } from "lucide-react"
import { useForm } from "@/context/form-context"
import { useToast } from "@/components/ui/use-toast"
import { DeleteDraftButton } from "@/components/draft/delete-draft-button"

export function FormHeader() {
  const router = useRouter()
  const { toast } = useToast()
  const { formData, resetForm } = useForm()

  const handleSaveAndExit = () => {
    // The wizard auto-saves to localStorage on every keystroke
    // (see form-context.tsx). Save & Exit just confirms and routes home.
    // localStorage already has the latest formData and currentStep, so the
    // user will resume exactly where they left off when they return to /submit.
    const title = formData.useCaseTitle?.trim()
    toast({
      title: "Draft saved",
      description: title
        ? `"${title}" is saved. You can resume from the landing page anytime.`
        : "Your progress is saved. Resume from the landing page anytime.",
    })
    // Small delay so the toast registers before navigation
    setTimeout(() => {
      router.push("/")
    }, 400)
  }

  const handleDeleteDraft = () => {
    resetForm()
    toast({ title: "Draft deleted", description: "Your in-progress idea was removed." })
    setTimeout(() => router.push("/home"), 300)
  }

  return (
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
        <div className="flex items-center gap-2">
          <DeleteDraftButton onConfirm={handleDeleteDraft} variant="ghost" />
          <Button variant="outline" onClick={handleSaveAndExit}>
            <Save className="mr-2 h-4 w-4" />
            Save & Exit
          </Button>
        </div>
      </div>
    </header>
  )
}
