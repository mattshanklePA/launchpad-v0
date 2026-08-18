"use client"

// Command Center dashboard shell (CC-STYLE, Keystone redesign RD-0) — the
// persistent left sidebar + top header + main content frame every dashboard
// view mounts into. Presentation only: scope, hierarchy, and selection all
// come from the caller (department-dashboard.tsx, bureau-dashboard.tsx, and
// personal-dashboard.tsx all reuse this same shell).

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, Database, Download, Home, LogOut, Plus, Scale, SlidersHorizontal, User, Users } from "lucide-react"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { isLevelAllowed, type DashboardScope, type OrgHierarchy } from "@/lib/dashboard/scope"
import { getSession, hasAdminAccess, isAdmin, logout, type Session } from "@/lib/auth"
import { businessUnitLabel } from "@/lib/reviewWorkflow"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { hasDepartmentTransparency } from "@/lib/bureauSignoff"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { EntityTree, type EntitySelection } from "@/components/dashboard/entity-tree"
import { SIDEBAR_ITEM_TEXT_CLASS } from "@/lib/layoutTokens"

// Mono uppercase group-label treatment from the mock's left rail (01
// Dashboard - Action Center.dc.html) — smaller and dimmer than the sidebar
// primitive's own default (components/ui/sidebar.tsx's SidebarGroupLabel).
const GROUP_LABEL_CLASS = "text-[10px] font-normal tracking-[0.1em] text-sidebar-foreground/50"

// `{jobRole label} · {business unit short label}` for the user-menu header
// (03 · user dropdown, Intake Variant 3 - Combined.dc.html). Presentation-only
// resolution against data already exposed by TenantConfig/lib/reviewWorkflow
// — does not change either.
function sessionJobRoleLabel(session: Session, tenant: TenantConfig): string | null {
  if (!session.jobRole) return null
  return tenant.submitterRoles.find((r) => r.value === session.jobRole)?.label ?? null
}

// The mock's business-unit label is short ("AT&R"), not the full option
// label ("Acquisition, Training and Readiness (AT&R)"). No shortLabel field
// exists on UnitOption, so this pulls the trailing parenthetical abbreviation
// when the tenant's option label has one, and falls back to the full label
// (still correct, just longer) for tenants/units whose labels don't.
function sessionBusinessUnitShortLabel(session: Session): string | null {
  if (!session.businessUnit) return null
  const label = businessUnitLabel(session.businessUnit)
  const abbreviation = label.match(/\(([^)]+)\)\s*$/)
  return abbreviation ? abbreviation[1] : label
}

export function DashboardShell({
  baseScope,
  hierarchy,
  selection,
  onSelect,
  breadcrumb,
  tenant = getTenant(),
  children,
}: {
  baseScope: DashboardScope
  hierarchy: OrgHierarchy
  selection: EntitySelection | null
  onSelect: (selection: EntitySelection | null) => void
  breadcrumb: string
  tenant?: TenantConfig
  children: ReactNode
}) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    setSession(getSession())
  }, [])

  const handleSignOut = () => {
    logout()
    setSession(null)
    router.replace("/login")
  }

  const jobRole = session ? sessionJobRoleLabel(session, tenant) : null
  const shortBusinessUnit = session ? sessionBusinessUnitShortLabel(session) : null
  const roleLine = jobRole && shortBusinessUnit ? `${jobRole} · ${shortBusinessUnit}` : session?.email
  const viewer = session
    ? { role: session.role, email: session.email, businessUnit: session.businessUnit, office: session.office }
    : null
  const canExportApprovalReport = tenantHasBureauTier(tenant) && hasDepartmentTransparency(viewer)

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          {tenant.sidebarTagline ? (
            <div className="flex items-center gap-2.5 px-1 py-0.5">
              <Image src="/keystone/mark-amber.svg" alt="" width={26} height={26} className="shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="font-heading text-sm font-bold text-sidebar-foreground">{tenant.productName}</span>
                <span className="ks-microlabel text-sidebar-foreground/50">{tenant.sidebarTagline}</span>
              </div>
            </div>
          ) : (
            <LaunchPadLogo size="sm" monochrome className="text-sidebar-foreground" subtitleClassName="text-sidebar-foreground/60" />
          )}
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className={GROUP_LABEL_CLASS}>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Submit an idea" className={SIDEBAR_ITEM_TEXT_CLASS}>
                  <Link href="/submit">
                    <Plus />
                    <span>Submit an idea</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {hasAdminAccess(session) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Decision Center" className={SIDEBAR_ITEM_TEXT_CLASS}>
                    <Link href="/decisions">
                      <Scale />
                      <span>Decision Center</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel className={GROUP_LABEL_CLASS}>Organization</SidebarGroupLabel>
            <EntityTree hierarchy={hierarchy} selected={selection} onSelect={onSelect} tenant={tenant} />
          </SidebarGroup>

          {isLevelAllowed(baseScope, "personal") && baseScope.level !== "personal" && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel className={GROUP_LABEL_CLASS}>My view</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled tooltip="Personal dashboard - coming soon" className={`cursor-not-allowed ${SIDEBAR_ITEM_TEXT_CLASS}`}>
                      <User />
                      <span>Personal</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
        <SidebarFooter>
          <p className="px-2 text-[13px] text-sidebar-foreground/50">Command Center</p>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-[52px] shrink-0 items-center gap-3 border-b border-border-subtle bg-card px-4">
          <SidebarTrigger />
          <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <span className="shrink-0 font-semibold text-foreground">Command Center</span>
            <span className="text-foreground-faint">/</span>
            <span className="truncate text-muted-foreground">{breadcrumb}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild title="Home">
              <Link href="/home">
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
              </Link>
            </Button>
            {session && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    {session.name}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
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
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <div className="flex-1 px-6 py-6 md:px-10 lg:px-14 lg:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
