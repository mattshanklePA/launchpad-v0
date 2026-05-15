"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileEdit, Info, FileText, CheckCircle, Sparkles, ArrowRight } from "lucide-react"
import { getSubmissions, type Submission } from "@/lib/submissions"
import type { FormData } from "@/lib/steps"

type InProgressDraft = {
  title: string
  step: number
  updatedAt: Date | null
}

function readInProgressDraft(): InProgressDraft | null {
  if (typeof window === "undefined") return null
  try {
    const stepRaw = localStorage.getItem("aid-current-step")
    const formRaw = localStorage.getItem("aid-form-data")
    if (!formRaw) return null
    const parsed: Partial<FormData> = JSON.parse(formRaw)
    // Only treat as a meaningful in-progress draft if the submitter has
    // started naming the idea. Otherwise it's an untouched form.
    if (!parsed.useCaseTitle || parsed.useCaseTitle.trim() === "") return null
    const step = stepRaw ? parseInt(stepRaw, 10) : 1
    // If step is 12 (just-submitted state), it gets reset on next mount —
    // don't show as in-progress
    if (step === 12) return null
    return {
      title: parsed.useCaseTitle,
      step: Number.isFinite(step) ? step : 1,
      updatedAt: null, // we don't track update time on the draft itself
    }
  } catch (error) {
    console.error("Failed to read in-progress draft:", error)
    return null
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`
  return new Date(iso).toLocaleDateString()
}

function readinessClass(score: string | undefined): string {
  switch (score) {
    case "ready":
      return "bg-green-100 text-green-800 border-green-200"
    case "needs_work":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "early_stage":
      return "bg-gray-100 text-gray-700 border-gray-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

function readinessLabel(score: string | undefined): string {
  switch (score) {
    case "ready":
      return "Ready"
    case "needs_work":
      return "Needs Work"
    case "early_stage":
      return "Early Stage"
    default:
      return "Not Assessed"
  }
}

export function RecentDrafts() {
  const [draft, setDraft] = useState<InProgressDraft | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDraft(readInProgressDraft())
    setSubmissions(getSubmissions())
    setHydrated(true)
  }, [])

  // Skeleton on server / pre-hydration so SSR markup matches initial client render
  if (!hydrated) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Your Recent Ideas</CardTitle>
          <CardDescription>Drafts and submissions saved in this browser.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse bg-muted/50 rounded" />
        </CardContent>
      </Card>
    )
  }

  const hasNothing = !draft && submissions.length === 0

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Your Recent Ideas</CardTitle>
        <CardDescription>Drafts and submissions saved in this browser.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasNothing ? (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>No ideas yet</AlertTitle>
            <AlertDescription>
              Start a new idea to see it appear here. Your last 5 submitted ideas will be retained.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {draft && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  In Progress
                </p>
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-blue-50/30">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileEdit className="h-4 w-4 text-uspto-blue-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-uspto-blue-primary truncate">{draft.title}</p>
                      <p className="text-xs text-muted-foreground">
                        On step {draft.step} of 11
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Draft
                    </Badge>
                    <Button asChild size="sm">
                      <Link href="/submit">
                        Resume
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {submissions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Submitted ({submissions.length})
                </p>
                <ul className="space-y-2">
                  {submissions.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {sub.formData.useCaseTitle || "Untitled idea"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submitted {timeAgo(sub.submittedAt)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={readinessClass(sub.formData.readinessScore)}>
                        {readinessLabel(sub.formData.readinessScore)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
