"use client"

// Shared "where do I go from here" links folded in from the pre-Command-Center
// pipeline page (components/home/reviewer-home.tsx, retired by the CC-6
// cutover) — the Decision Center card and the admin tools menu, reused by
// both the Department (CC-4) and Bureau/Office (CC-7) dashboards so neither
// loses functionality the old page had. Presentation only: both dashboards
// pass in the signed-in session so the admin-only menu can gate itself.
//
// The admin tools render as a compact dropdown (not the full-width grid this
// used to be) so they sit alongside the page header instead of outweighing
// the Action Center / pipeline content beneath it — the same links are also
// reachable from the sidebar's "Admin" group (dashboard-shell.tsx).

import Link from "next/link"
import { ArrowRight, ChevronDown, Database, Download, Scale, SlidersHorizontal, Users } from "lucide-react"
import { isAdmin, type Session } from "@/lib/auth"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { hasDepartmentTransparency } from "@/lib/bureauSignoff"
import { getTenant } from "@/lib/tenant"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  const tenant = getTenant()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Admin
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Admin tools</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin?tab=formconfig">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Form configuration
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin?tab=settings">
            <Users className="mr-2 h-4 w-4" />
            User management
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin?tab=settings">
            <Database className="mr-2 h-4 w-4" />
            Demo data
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/api/export/omb">
            <Download className="mr-2 h-4 w-4" />
            Export {tenant.inventoryLabel} (CSV)
          </a>
        </DropdownMenuItem>
        {showApprovalExport && (
          <DropdownMenuItem asChild>
            <a href="/api/export/approval">
              <Download className="mr-2 h-4 w-4" />
              Export approval report (CSV)
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
