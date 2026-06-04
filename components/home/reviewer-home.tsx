"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { useDataProvider } from "@/components/data-provider"
import {
  getStatus,
  getBusinessUnit,
  getAssigneeName,
  businessUnitLabel,
  STATUS_ORDER,
  STATUS_LABEL,
  statusBadgeClasses,
} from "@/lib/reviewWorkflow"
import { Badge } from "@/components/ui/badge"
import { Scale, ArrowRight, SlidersHorizontal, Users, Database, User } from "lucide-react"
import { getSession } from "@/lib/auth"

function readinessChip(score?: string): { cls: string; label: string } {
  switch (score) {
    case "ready":
      return { cls: "bg-green-100 text-green-700", label: "Ready" }
    case "needs_work":
      return { cls: "bg-amber-100 text-amber-700", label: "Needs work" }
    case "early_stage":
      return { cls: "bg-gray-100 text-gray-500", label: "Early" }
    default:
      return { cls: "bg-gray-100 text-gray-500", label: "Not assessed" }
  }
}

function Card({ s }: { s: Submission }) {
  const r = readinessChip(s.formData.readinessScore)
  const assignee = getAssigneeName(s)
  return (
    <Link
      href={`/submissions/${s.id}`}
      className="block rounded-md border bg-white p-3 hover:border-uspto-blue-primary/50 transition-colors"
    >
      <div className="text-sm font-medium line-clamp-2 text-uspto-gray-text">{s.formData.useCaseTitle || "Untitled idea"}</div>
      <div className="text-xs text-muted-foreground mt-1 truncate">{s.formData.submitterName || "Anonymous"}</div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{businessUnitLabel(getBusinessUnit(s))}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.cls}`}>{r.label}</span>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
        <User className="w-3 h-3" />
        {assignee || "Unassigned"}
      </div>
    </Link>
  )
}

export function ReviewerHome() {
  const { loaded } = useDataProvider()
  const [subs, setSubs] = useState<Submission[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [units, setUnits] = useState<string[]>([])
  const [assignees, setAssignees] = useState<string[]>([])

  useEffect(() => {
    if (loaded) setSubs(getSubmissions())
  }, [loaded])

  useEffect(() => {
    setIsAdmin(getSession()?.role === "admin")
  }, [])

  const allUnits = Array.from(new Set(subs.map(getBusinessUnit).filter(Boolean))).sort()
  const allAssignees = Array.from(new Set(subs.map(getAssigneeName).filter(Boolean))).sort()

  const filtered = subs.filter(
    (s) =>
      (units.length === 0 || units.includes(getBusinessUnit(s))) &&
      (assignees.length === 0 || assignees.includes(getAssigneeName(s))),
  )
  const inStatus = (st: (typeof STATUS_ORDER)[number]) => filtered.filter((s) => getStatus(s) === st)

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const pill = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-full border transition-colors ${
      active
        ? "border-uspto-blue-primary bg-uspto-blue-primary/10 text-uspto-blue-primary font-medium"
        : "border-input bg-white text-muted-foreground hover:bg-muted/50"
    }`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-uspto-gray-text">Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">All AI ideas across business units.</p>
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

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground w-24 shrink-0">Business unit</span>
          <button type="button" className={pill(units.length === 0)} onClick={() => setUnits([])}>All</button>
          {allUnits.map((u) => (
            <button key={u} type="button" className={pill(units.includes(u))} onClick={() => toggle(units, setUnits, u)}>
              {businessUnitLabel(u)}
            </button>
          ))}
        </div>
        {allAssignees.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground w-24 shrink-0">Assigned to</span>
            <button type="button" className={pill(assignees.length === 0)} onClick={() => setAssignees([])}>All</button>
            {allAssignees.map((a) => (
              <button key={a} type="button" className={pill(assignees.includes(a))} onClick={() => toggle(assignees, setAssignees, a)}>
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUS_ORDER.map((st) => {
          const items = inStatus(st)
          return (
            <div key={st} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-2 px-1">
                <Badge variant="outline" className={statusBadgeClasses(st)}>{STATUS_LABEL[st]}</Badge>
                <span className="text-xs font-medium text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2 rounded-lg bg-muted/40 p-2 min-h-[120px]">
                {items.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-6">None</div>
                ) : (
                  items.map((s) => <Card key={s.id} s={s} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
