"use client"

// NL-2 (#283): the cockpit frame for signed-in pages. One dark header band
// (K1) with the tenant eyebrow, page title, three tabs, the office picker and
// the user line, then the sample-data strip (K2), then the chalk canvas.
// Replaces the sidebar layout where `features.cockpitLook` is on (ES2). Same
// props as DashboardShell, so no page changes.

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import { isLevelAllowed, type DashboardScope, type OrgHierarchy } from "@/lib/dashboard/scope"
import { getSession, hasAdminAccess, logout, type Session } from "@/lib/auth"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EntityTree, type EntitySelection } from "@/components/dashboard/entity-tree"
import { UserMenuItems, sessionRoleLine } from "@/components/dashboard/user-menu-items"
import { SidebarProvider } from "@/components/ui/sidebar"
import { HeaderBand } from "./header-band"
import { SampleDataStrip } from "./sample-data-strip"

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"

export type CockpitShellProps = {
  baseScope: DashboardScope
  hierarchy: OrgHierarchy
  selection: EntitySelection | null
  onSelect: (selection: EntitySelection | null) => void
  breadcrumb: string
  /** Page title in the band; defaults to the breadcrumb. */
  title?: string
  tenant?: TenantConfig
  children: ReactNode
}

export function CockpitShell({
  baseScope,
  hierarchy,
  selection,
  onSelect,
  breadcrumb,
  title,
  tenant = getTenant(),
  children,
}: CockpitShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    setSession(getSession())
  }, [])

  const handleSignOut = () => {
    logout()
    setSession(null)
    router.replace("/login")
  }

  const copy = tenantCopy(tenant)
  const tabs = [
    { href: "/home", label: "My work" },
    ...(hasAdminAccess(session) ? [{ href: "/decisions", label: "Decision Center" }] : []),
    { href: "/submit", label: "Submit an idea" },
  ]
  const showPersonal = isLevelAllowed(baseScope, "personal") && baseScope.level !== "personal"

  const nav = (
    <nav aria-label="Primary" className="flex flex-wrap items-end gap-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname?.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-[3px] px-3 py-1.5 text-sm text-[var(--ks-chalk)] hover:bg-white/10 ${FOCUS} ${
              active ? "border-[var(--ks-amber)] font-semibold" : "border-transparent"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )

  const actions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`inline-flex items-center gap-1.5 border border-white/30 px-3 py-1.5 text-sm text-[var(--ks-chalk)] hover:bg-white/10 ${FOCUS}`}
        >
          {tenant.tierLabels.unit}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-0">
          {/* SidebarProvider only supplies the context EntityTree's buttons read; no sidebar renders. */}
          <SidebarProvider className="min-h-0 w-full">
            <div className="flex w-full flex-col gap-2 bg-sidebar p-2 text-sidebar-foreground">
              <span className="ks-microlabel px-2 text-sidebar-foreground/50">Organization</span>
              <EntityTree hierarchy={hierarchy} selected={selection} onSelect={onSelect} tenant={tenant} />
              {showPersonal && (
                <>
                  <span className="ks-microlabel px-2 pt-1 text-sidebar-foreground/50">My view</span>
                  <Link
                    href="/my-ideas"
                    title="Ideas you submitted"
                    className={`rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${FOCUS}`}
                  >
                    Personal
                  </Link>
                </>
              )}
            </div>
          </SidebarProvider>
        </DropdownMenuContent>
      </DropdownMenu>
      {session && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={`flex flex-col items-end text-right text-[var(--ks-chalk)] ${FOCUS}`}
          >
            <span className="inline-flex items-center gap-1 text-sm font-semibold">
              {session.name}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-xs">{sessionRoleLine(session, tenant)}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <UserMenuItems session={session} tenant={tenant} onSignOut={handleSignOut} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)]">
      <HeaderBand
        eyebrow={`${tenant.shortName} · ${breadcrumb}`.toUpperCase()}
        title={title ?? breadcrumb}
        nav={nav}
        actions={actions}
        background={tenant.theme.primary}
        className="sticky top-0 z-30"
      />
      {tenant.features.sampleDataStrip && copy.sampleDataTag && (
        <SampleDataStrip tag={copy.sampleDataTag} sentence={copy.sampleDataNotice} />
      )}
      <div className="min-w-0 flex-1 px-6 py-6 md:px-10 lg:px-14 lg:py-8">{children}</div>
    </div>
  )
}
