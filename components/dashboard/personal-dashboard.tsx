"use client"

// Personal Dashboard (CC-8) — the submitter-scoped Command Center landing
// view, assembled from the same CC-STYLE shell every other dashboard screen
// uses (components/dashboard/dashboard-shell.tsx), computed for a
// "personal" DashboardScope instead of department/bureau/office. Re-skins
// the prior ad hoc submitter home (components/home/submitter-home.tsx, still
// mounted at /home until the CC-6 cutover) rather than replacing its
// behavior: draft detection (localStorage) and the start-a-new-idea action
// are unchanged, and "my ideas" is still scoped by owner email — now via
// `scopedSubmissions` (lib/dashboard/metrics.ts) so it can never disagree
// with what `getDashboardScope` resolves for this viewer.
//
// Guardrail: a submitter sees ONLY their own submissions and drafts. No
// entity-tree drilling is offered here — hierarchy is always `{ bureaus: [] }`
// — a submitter has no bureau/office roll-up to browse, unlike the
// Department/Bureau dashboards.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { getSession } from "@/lib/auth"
import { getTenant } from "@/lib/tenant"
import { getDashboardScope } from "@/lib/dashboard/scope"
import { scopedSubmissions } from "@/lib/dashboard/metrics"
import { getStatus, getComments, STATUS_LABEL, statusBadgeClasses } from "@/lib/reviewWorkflow"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, ArrowRight, MessageSquare, FileText } from "lucide-react"

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

export function PersonalDashboard() {
  const { loaded } = useDataProvider()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [draft, setDraft] = useState<{ title: string } | null>(null)

  useEffect(() => {
    if (!loaded) return
    setSubmissions(getSubmissions())
    setDraft(detectDraft())
  }, [loaded])

  const tenant = getTenant()
  const baseScope = getDashboardScope(getSession())
  const mine = scopedSubmissions(baseScope, submissions)
  const needsInfo = mine.filter((s) => getStatus(s) === "needs_info")
  const submitted = mine.filter((s) => getStatus(s) !== "needs_info")

  return (
    <DashboardShell
      baseScope={baseScope}
      hierarchy={{ bureaus: [] }}
      selection={null}
      onSelect={() => {}}
      breadcrumb="My ideas"
      tenant={tenant}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My ideas</h1>
          <p className="text-sm text-muted-foreground">Track your AI ideas through review.</p>
        </div>
        <Button asChild>
          <Link href="/submit">
            <Plus className="w-4 h-4 mr-2" />
            Start a new idea
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
                <Card key={s.id} className="border-red-200 border-l-4 border-l-red-500 shadow-none">
                  <CardContent className="flex items-start justify-between gap-3 p-3">
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
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {draft && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">In progress</h2>
          <Card className="shadow-none">
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm truncate">{draft.title}</span>
                <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                  Draft
                </Badge>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/submit?resume=1">Resume</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted</h2>
        {submitted.length === 0 ? (
          <Card className="shadow-none">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No submitted ideas yet. Start one above.
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-none divide-y p-0">
            {submitted.map((s) => (
              <Link
                key={s.id}
                href={`/submissions/${s.id}`}
                className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{s.formData.useCaseTitle || "Untitled idea"}</div>
                  <div className="text-xs text-muted-foreground">
                    Submitted {new Date(s.submittedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={getStatus(s)} />
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </DashboardShell>
  )
}
