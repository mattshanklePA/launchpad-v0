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
import { ChevronDown, Home, Plus, Scale, User } from "lucide-react"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { isLevelAllowed, type DashboardScope, type OrgHierarchy } from "@/lib/dashboard/scope"
import { getSession, hasAdminAccess, logout, type Session } from "@/lib/auth"
import { LaunchPadLogo } from "@/components/branding/launchpad-logo"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { UserMenuItems } from "@/components/dashboard/user-menu-items"
import { CockpitShell } from "@/components/cockpit/cockpit-shell"
import { EntityTree, type EntitySelection } from "@/components/dashboard/entity-tree"
import { SIDEBAR_ITEM_TEXT_CLASS } from "@/lib/layoutTokens"

// Mono uppercase group-label treatment from the mock's left rail (01
// Dashboard - Action Center.dc.html) — smaller and dimmer than the sidebar
// primitive's own default (components/ui/sidebar.tsx's SidebarGroupLabel).
const GROUP_LABEL_CLASS = "text-[10px] font-normal tracking-[0.1em] text-sidebar-foreground/50"

export type DashboardShellProps = {
  baseScope: DashboardScope
  hierarchy: OrgHierarchy
  selection: EntitySelection | null
  onSelect: (selection: EntitySelection | null) => void
  breadcrumb: string
  /** Page title in the cockpit band (ES2 only); defaults to the breadcrumb. */
  title?: string
  tenant?: TenantConfig
  children: ReactNode
}

// NL-2 (#283): where `features.cockpitLook` is on (ES2) the header band and
// tabs replace the sidebar layout; every other tenant renders the sidebar
// layout below exactly as before.
export function DashboardShell(props: DashboardShellProps) {
  const tenant = props.tenant ?? getTenant()
  if (tenant.features.cockpitLook) return <CockpitShell {...props} tenant={tenant} />
  return <SidebarDashboardShell {...props} tenant={tenant} />
}

function SidebarDashboardShell({
  baseScope,
  hierarchy,
  selection,
  onSelect,
  breadcrumb,
  tenant = getTenant(),
  children,
}: DashboardShellProps) {
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
                    <SidebarMenuButton asChild tooltip="Ideas you submitted" className={SIDEBAR_ITEM_TEXT_CLASS}>
                      <Link href="/my-ideas">
                        <User />
                        <span>Personal</span>
                      </Link>
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
                  <UserMenuItems session={session} tenant={tenant} onSignOut={handleSignOut} />
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <div className="min-w-0 flex-1 px-6 py-6 md:px-10 lg:px-14 lg:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
