"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { useDataProvider } from "@/components/data-provider"
import {
  getStatus,
  getBusinessUnit,
  businessUnitLabel,
  STATUS_ORDER,
  STATUS_LABEL,
  statusBadgeClasses,
} from "@/lib/reviewWorkflow"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Scale, ArrowRight, SlidersHorizontal, Users, Database } from "lucide-react"
import { getSession } from "@/lib/auth"

export function ReviewerHome() {
  const { loaded } = useDataProvider()
  const [subs, setSubs] = useState<Submission[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (loaded) setSubs(getSubmissions())
  }, [loaded])

  useEffect(() => {
    setIsAdmin(getSession()?.role === "admin")
  }, [])

  const counts = STATUS_ORDER.map((st) => ({ st, n: subs.filter((s) => getStatus(s) === st).length }))

  const groups: Record<string, Submission[]> = {}
  for (const s of subs) {
    const bu = getBusinessUnit(s) || "other"
    if (!groups[bu]) groups[bu] = []
    groups[bu].push(s)
  }
  const buEntries = Object.entries(groups).sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-uspto-gray-text">Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">All AI ideas across business units.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {counts.map(({ st, n }) => (
          <div key={st} className="rounded-lg border bg-white p-4">
            <div className="text-2xl font-bold text-uspto-gray-text">{n}</div>
            <Badge variant="outline" className={`mt-1 ${statusBadgeClasses(st)}`}>{STATUS_LABEL[st]}</Badge>
          </div>
        ))}
      </div>

      <Link
        href="/decisions"
        className="flex items-center justify-between gap-3 rounded-lg border-2 border-uspto-blue-primary bg-white p-4 hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          <Scale className="w-6 h-6 text-uspto-blue-primary" />
          <div>
            <div className="font-medium">Decision Center</div>
            <div className="text-sm text-muted-foreground">Compare candidates and generate executive briefings.</div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-uspto-blue-primary" />
      </Link>

      {isAdmin && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/admin?tab=formconfig" className="rounded-lg border bg-white p-4 hover:bg-muted/30">
              <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
              <div className="font-medium text-sm mt-2">Form configuration</div>
              <div className="text-xs text-muted-foreground">Toggle wizard fields</div>
            </Link>
            <Link href="/admin?tab=settings" className="rounded-lg border bg-white p-4 hover:bg-muted/30">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div className="font-medium text-sm mt-2">User management</div>
              <div className="text-xs text-muted-foreground">Roles and accounts</div>
            </Link>
            <Link href="/admin?tab=settings" className="rounded-lg border bg-white p-4 hover:bg-muted/30">
              <Database className="w-5 h-5 text-muted-foreground" />
              <div className="font-medium text-sm mt-2">Demo data</div>
              <div className="text-xs text-muted-foreground">Seed and reset</div>
            </Link>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review queue · by business unit</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          {buEntries.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No submissions yet.</div>
          )}
          {buEntries.map(([bu, list]) => (
            <div key={bu}>
              <div className="bg-muted/50 px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                {businessUnitLabel(bu)} · {list.length}
              </div>
              {list.map((s) => (
                <Link
                  key={s.id}
                  href={`/submissions/${s.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 border-t hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.formData.useCaseTitle || "Untitled idea"}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.formData.submitterName || "Anonymous"} · readiness: {s.formData.readinessScore || "n/a"}
                    </div>
                  </div>
                  <Badge variant="outline" className={`flex-shrink-0 ${statusBadgeClasses(getStatus(s))}`}>
                    {STATUS_LABEL[getStatus(s)]}
                  </Badge>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
