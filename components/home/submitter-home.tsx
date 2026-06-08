"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getSession } from "@/lib/auth"
import { getSubmissions, setSubmissionStatus, type Submission } from "@/lib/submissions"
import { useDataProvider } from "@/components/data-provider"
import {
  getStatus,
  getComments,
  getOwnerEmail,
  STATUS_LABEL,
  statusBadgeClasses,
} from "@/lib/reviewWorkflow"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, ArrowRight, MessageSquare, FileText, Undo2 } from "lucide-react"
import { DeleteDraftButton } from "@/components/draft/delete-draft-button"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const STORAGE_KEY_FORM = "aid-form-data"

function detectDraft(): { title: string } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORM)
    if (!raw) return null
    const fd = JSON.parse(raw) as Record<string, string>
    const meaningful = (fd.coreProblem || fd.useCaseTitle || fd.useCaseDescription || "").trim()
    if (!meaningful) return null
    return { title: (fd.useCaseTitle || "").trim() || "Untitled idea" }
  } catch {
    return null
  }
}

function StatusBadge({ status }: { status: ReturnType<typeof getStatus> }) {
  return (
    <Badge variant="outline" className={statusBadgeClasses(status)}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

function WithdrawButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-amber-700 hover:bg-amber-50 hover:text-amber-800">
          <Undo2 className="w-3.5 h-3.5 mr-1.5" />
          Withdraw
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw this submission?</AlertDialogTitle>
          <AlertDialogDescription>
            It will be pulled out of review and returned to draft, so reviewers no longer see it. You can submit it again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-600">
            Withdraw
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function SubmitterHome() {
  const { loaded } = useDataProvider()
  const { toast } = useToast()
  const [mine, setMine] = useState<Submission[]>([])
  const [draft, setDraft] = useState<{ title: string } | null>(null)

  const handleDeleteDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_FORM)
      localStorage.removeItem("aid-current-step")
    } catch {
      /* ignore */
    }
    setDraft(null)
    toast({ title: "Draft deleted", description: "Your in-progress idea was removed." })
  }

  const handleWithdraw = async (id: string) => {
    const ok = await setSubmissionStatus(id, "draft")
    if (ok) {
      setMine((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "draft", formData: { ...s.formData, reviewStatus: "draft" } } : s,
        ),
      )
      toast({ title: "Withdrawn", description: "Pulled from review and returned to draft." })
    } else {
      toast({ variant: "destructive", title: "Couldn't withdraw", description: "Please try again." })
    }
  }

  useEffect(() => {
    if (!loaded) return
    const me = (getSession()?.email || "").toLowerCase()
    setMine(getSubmissions().filter((s) => getOwnerEmail(s) === me))
    setDraft(detectDraft())
  }, [loaded])

  const needsInfo = mine.filter((s) => getStatus(s) === "needs_info")
  const dbDrafts = mine.filter((s) => getStatus(s) === "draft")
  const submitted = mine.filter((s) => {
    const st = getStatus(s)
    return st !== "needs_info" && st !== "draft"
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-uspto-gray-text">My ideas</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your AI ideas through review.</p>
        </div>
        <Button asChild>
          <Link
            href="/submit"
            onClick={() => {
              try {
                localStorage.removeItem(STORAGE_KEY_FORM)
                localStorage.removeItem("aid-current-step")
                localStorage.removeItem("aid-editing-id")
                sessionStorage.removeItem("aid-session-active")
              } catch {
                /* ignore */
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />Start a new idea
          </Link>
        </Button>
      </div>

      {needsInfo.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action needed</h2>
          <div className="space-y-2">
            {needsInfo.map((s) => {
              const comments = getComments(s)
              const last = comments[comments.length - 1]
              return (
                <div key={s.id} className="rounded-md border border-red-200 bg-white border-l-4 border-l-red-500 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{s.formData.useCaseTitle || "Untitled idea"}</div>
                      {last && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <MessageSquare className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                          {last.authorName}: &ldquo;{last.body}&rdquo;
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/submissions/${s.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {(draft || dbDrafts.length > 0) && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Drafts</h2>
          <div className="rounded-md border bg-white divide-y">
            {draft && (
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{draft.title}</span>
                  <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">Draft</Badge>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/submit?resume=1">Resume</Link>
                  </Button>
                  <DeleteDraftButton onConfirm={handleDeleteDraft} size="sm" label="Delete" />
                </div>
              </div>
            )}
            {dbDrafts
              .filter((s) => !(draft && (s.formData.useCaseTitle || "").trim() === draft.title))
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40">
                  <Link href={`/submissions/${s.id}`} className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{s.formData.useCaseTitle || "Untitled idea"}</div>
                    <div className="text-xs text-muted-foreground">Saved {new Date(s.submittedAt).toLocaleDateString()}</div>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">Draft</Badge>
                    <Link href={`/submissions/${s.id}`} aria-label="Open">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted</h2>
        {submitted.length === 0 ? (
          <div className="rounded-md border bg-white p-6 text-center text-sm text-muted-foreground">
            No submitted ideas yet. Start one above.
          </div>
        ) : (
          <div className="rounded-md border bg-white divide-y">
            {submitted.map((s) => {
              const status = getStatus(s)
              const canWithdraw = status === "submitted" || status === "in_review"
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40">
                  <Link href={`/submissions/${s.id}`} className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{s.formData.useCaseTitle || "Untitled idea"}</div>
                    <div className="text-xs text-muted-foreground">Submitted {new Date(s.submittedAt).toLocaleDateString()}</div>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={status} />
                    {canWithdraw && <WithdrawButton onConfirm={() => handleWithdraw(s.id)} />}
                    <Link href={`/submissions/${s.id}`} aria-label="Open">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
