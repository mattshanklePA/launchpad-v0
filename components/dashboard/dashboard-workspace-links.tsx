"use client"

// Shared "where do I go from here" links folded in from the pre-Command-Center
// pipeline page (components/home/reviewer-home.tsx, retired by the CC-6
// cutover) — the Decision Center card and the admin tools grid, reused by
// both the Department (CC-4) and Bureau/Office (CC-7) dashboards so neither
// loses functionality the old page had. Presentation only: both dashboards
// pass in the signed-in session so the admin-only grid can gate itself.

import Link from "next/link"
import { ArrowRight, Database, Download, Scale, SlidersHorizontal, Users } from "lucide-react"
import { isAdmin, type Session } from "@/lib/auth"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { hasDepartmentTransparency } from "@/lib/bureauSignoff"

export function DecisionCenterLink() {
  return (
    <Link
      href="/decisions"
      className="flex items-center justify-between gap-3 rounded-lg border-2 border-primary bg-card p-4 hover:bg-muted/30"
    >
      <div className="flex items-center gap-3">
        <Scale className="h-6 w-6 text-primary" />
        <div>
          <div className="font-medium text-foreground">Decision Center</div>
          <div className="text-sm text-muted-foreground">Compare candidates and generate executive briefings.</div>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-primary" />
    </Link>
  )
}

export function AdminToolsSection({ session }: { session: Session | null }) {
  if (!isAdmin(session)) return null

  const viewer = session
    ? { role: session.role, email: session.email, businessUnit: session.businessUnit, office: session.office }
    : null
  const showApprovalExport = tenantHasBureauTier() && hasDepartmentTransparency(viewer)

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin tools</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Link href="/admin?tab=formconfig" className="rounded-lg border bg-card p-4 hover:bg-muted/30">
          <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          <div className="mt-2 text-sm font-medium">Form configuration</div>
          <div className="text-xs text-muted-foreground">Toggle wizard fields</div>
        </Link>
        <Link href="/admin?tab=settings" className="rounded-lg border bg-card p-4 hover:bg-muted/30">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div className="mt-2 text-sm font-medium">User management</div>
          <div className="text-xs text-muted-foreground">Roles and accounts</div>
        </Link>
        <Link href="/admin?tab=settings" className="rounded-lg border bg-card p-4 hover:bg-muted/30">
          <Database className="h-5 w-5 text-muted-foreground" />
          <div className="mt-2 text-sm font-medium">Demo data</div>
          <div className="text-xs text-muted-foreground">Seed and reset</div>
        </Link>
        <a href="/api/export/omb" className="rounded-lg border bg-card p-4 hover:bg-muted/30">
          <Download className="h-5 w-5 text-muted-foreground" />
          <div className="mt-2 text-sm font-medium">Export OMB inventory (CSV)</div>
          <div className="text-xs text-muted-foreground">2025 AI use case inventory</div>
        </a>
        {showApprovalExport && (
          <a href="/api/export/approval" className="rounded-lg border bg-card p-4 hover:bg-muted/30">
            <Download className="h-5 w-5 text-muted-foreground" />
            <div className="mt-2 text-sm font-medium">Export approval report (CSV)</div>
            <div className="text-xs text-muted-foreground">Bureau sign-off &amp; department approval</div>
          </a>
        )}
      </div>
    </section>
  )
}
