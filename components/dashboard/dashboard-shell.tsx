"use client"

// Command Center dashboard shell (CC-STYLE) — the persistent left sidebar +
// top header + main content frame every dashboard view mounts into, mirroring
// the original Command Center layout. Presentation only: scope, hierarchy,
// and selection all come from the caller (department-dashboard.tsx,
// bureau-dashboard.tsx, and personal-dashboard.tsx all reuse this same shell).

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Database, Download, Home, LayoutDashboard, LogOut, Plus, Scale, SlidersHorizontal, User, Users } from "lucide-react"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { isLevelAllowed, type DashboardScope, type OrgHierarchy } from "@/lib/dashboard/scope"
import { getSession, hasAdminAccess, isAdmin, logout, type Session } from "@/lib/auth"
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

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <LaunchPadLogo size="sm" monochrome className="text-sidebar-foreground" subtitleClassName="text-sidebar-foreground/60" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Submit an idea">
                  <Link href="/submit">
                    <Plus />
                    <span>Submit an idea</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {hasAdminAccess(session) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Decision Center">
                    <Link href="/decisions">
                      <Scale />
                      <span>Decision Center</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

          {isAdmin(session) && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Form configuration">
                      <Link href="/admin?tab=formconfig">
                        <SlidersHorizontal />
                        <span>Form configuration</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="User management">
                      <Link href="/admin?tab=settings">
                        <Users />
                        <span>User management</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Demo data">
                      <Link href="/admin?tab=settings">
                        <Database />
                        <span>Demo data</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Export OMB inventory (CSV)">
                      <a href="/api/export/omb">
                        <Download />
                        <span>Export OMB inventory</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {tenantHasBureauTier(tenant) &&
                    hasDepartmentTransparency(
                      session
                        ? { role: session.role, email: session.email, businessUnit: session.businessUnit, office: session.office }
                        : null,
                    ) && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Export approval report (CSV)">
                          <a href="/api/export/approval">
                            <Download />
                            <span>Export approval report</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}

          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Organization</SidebarGroupLabel>
            <EntityTree hierarchy={hierarchy} selected={selection} onSelect={onSelect} tenant={tenant} />
          </SidebarGroup>

          {isLevelAllowed(baseScope, "personal") && baseScope.level !== "personal" && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>My view</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled tooltip="Personal dashboard - coming soon" className="cursor-not-allowed">
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
          <p className="px-2 text-[11px] text-sidebar-foreground/50">Command Center</p>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger />
          <div className="h-5 w-px bg-border" />
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="shrink-0 font-medium text-foreground">Command Center</span>
            <span className="text-muted-foreground">/</span>
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
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{session.name}</span>
                    <span className="text-xs text-muted-foreground">{session.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <div className="flex-1 space-y-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
