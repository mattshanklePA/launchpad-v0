"use client"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Button } from "../ui/button"
import { Rocket, Home, Save } from "lucide-react"
import { useForm } from "@/context/form-context"
import { useToast } from "@/components/ui/use-toast"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"

export function FormHeader() {
  const router = useRouter()
  const { toast } = useToast()
  const { formData } = useForm()

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-20 max-w-screen-2xl items-center justify-between">
        <Link href="/">
          <LaunchPadLogo size="md" />
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
  )
}
