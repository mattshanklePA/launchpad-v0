"use client"

// The signed-in user's dropdown body (name + role line, admin items, exports,
// sign out). Shared by the sidebar layout (DashboardShell) and the cockpit
// band (NL-2, #283) so both render the same items, labels and visibility
// rules from one place.

import Link from "next/link"
import { Database, Download, LogOut, SlidersHorizontal, Users } from "lucide-react"
import type { TenantConfig } from "@/lib/tenant"
import { isAdmin, type Session } from "@/lib/auth"
import { businessUnitLabel } from "@/lib/reviewWorkflow"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { hasDepartmentTransparency } from "@/lib/bureauSignoff"
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

// `{jobRole label} · {business unit short label}` for the user-menu header
// (03 · user dropdown, Intake Variant 3 - Combined.dc.html). Presentation-only
// resolution against data already exposed by TenantConfig/lib/reviewWorkflow
// — does not change either.
export function sessionJobRoleLabel(session: Session, tenant: TenantConfig): string | null {
  if (!session.jobRole) return null
  return tenant.submitterRoles.find((r) => r.value === session.jobRole)?.label ?? null
}

// The mock's business-unit label is short ("AT&R"), not the full option
// label ("Acquisition, Training and Readiness (AT&R)"). No shortLabel field
// exists on UnitOption, so this pulls the trailing parenthetical abbreviation
// when the tenant's option label has one, and falls back to the full label
// (still correct, just longer) for tenants/units whose labels don't.
export function sessionBusinessUnitShortLabel(session: Session): string | null {
  if (!session.businessUnit) return null
  const label = businessUnitLabel(session.businessUnit)
  const abbreviation = label.match(/\(([^)]+)\)\s*$/)
  return abbreviation ? abbreviation[1] : label
}

/** `{jobRole} · {unit}` when both are known, else the email. */
export function sessionRoleLine(session: Session, tenant: TenantConfig): string {
  const jobRole = sessionJobRoleLabel(session, tenant)
  const shortBusinessUnit = sessionBusinessUnitShortLabel(session)
  return jobRole && shortBusinessUnit ? `${jobRole} · ${shortBusinessUnit}` : session.email
}

export function UserMenuItems({
  session,
  tenant,
  onSignOut,
}: {
  session: Session
  tenant: TenantConfig
  onSignOut: () => void
}) {
  const viewer = { role: session.role, email: session.email, businessUnit: session.businessUnit, office: session.office }
  const canExportApprovalReport = tenantHasBureauTier(tenant) && hasDepartmentTransparency(viewer)
  const roleLine = sessionRoleLine(session, tenant)
  return (
    <>
    <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
      <span className="text-sm font-semibold text-foreground">{session.name}</span>
      <span className="text-[13px] text-muted-foreground">{roleLine}</span>
    </DropdownMenuLabel>
    {isAdmin(session) && (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="ks-microlabel px-2 py-1.5">Admin</DropdownMenuLabel>
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
            Export {tenant.inventoryLabel}
          </a>
        </DropdownMenuItem>
        {canExportApprovalReport && (
          <DropdownMenuItem asChild>
            <a href="/api/export/approval">
              <Download className="mr-2 h-4 w-4" />
              Export approval report
            </a>
          </DropdownMenuItem>
        )}
      </>
    )}
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onSignOut}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign out
    </DropdownMenuItem>
    </>
  )
}
