"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Info, X, Lightbulb, Bot, ClipboardCheck } from "lucide-react"
import { getTenant } from "@/lib/tenant"

// Client-side hero actions. Keeps the three primary CTAs working:
//   - Start Idea Submission → /submit
//   - View Saved Drafts     → smooth-scrolls to the "Your Recent Ideas" card
//   - How It Works          → opens a short explainer modal
export function HeroActions() {
  const tenant = getTenant()
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  // Close on Escape for accessibility.
  useEffect(() => {
    if (!showHowItWorks) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHowItWorks(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showHowItWorks])

  const scrollToRecent = () => {
    const el = document.getElementById("recent-ideas")
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button
          asChild
          size="lg"
          className="bg-uspto-blue-primary h-12 px-8 text-base text-white hover:bg-uspto-blue-primary/90 hover:scale-105 transition-transform"
        >
          <Link href="/submit">
            Start Idea Submission <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 px-8 text-base bg-transparent"
          onClick={scrollToRecent}
        >
          View Saved Drafts
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="h-12 px-8 text-base text-gray-600"
          onClick={() => setShowHowItWorks(true)}
        >
          <Info className="mr-2 h-5 w-5" /> How It Works
        </Button>
      </div>

      {showHowItWorks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="how-it-works-title"
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowHowItWorks(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="how-it-works-title" className="text-2xl font-bold text-uspto-gray-text">
              How {tenant.productName} works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Turn a rough AI idea into a vetted, decision-ready use case in four short phases.
            </p>
            <ol className="mt-5 space-y-4">
              <li className="flex gap-3">
                <Lightbulb className="h-5 w-5 flex-shrink-0 text-uspto-blue-primary mt-0.5" />
                <div>
                  <p className="font-semibold">1. Describe the idea and the problem</p>
                  <p className="text-sm text-muted-foreground">
                    Capture who you are, what you&apos;re proposing, and who it affects — rough is fine.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <Bot className="h-5 w-5 flex-shrink-0 text-uspto-blue-primary mt-0.5" />
                <div>
                  <p className="font-semibold">2. Refine with {tenant.productName} {tenant.assistantName}</p>
                  <p className="text-sm text-muted-foreground">
                    {tenant.assistantName} asks focused questions to sharpen value, strategic alignment, and feasibility —
                    it never invents facts.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <ClipboardCheck className="h-5 w-5 flex-shrink-0 text-uspto-blue-primary mt-0.5" />
                <div>
                  <p className="font-semibold">3. Pass the readiness check, then submit</p>
                  <p className="text-sm text-muted-foreground">
                    A readiness gate confirms every required field is complete before your idea routes to
                    the vetting team for a funding decision.
                  </p>
                </div>
              </li>
            </ol>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowHowItWorks(false)}>
                Close
              </Button>
              <Button asChild className="bg-uspto-blue-primary hover:bg-uspto-blue-primary/90">
                <Link href="/submit">
                  Start Idea Submission <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
