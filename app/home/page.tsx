"use client"

// The Command Center dashboard shell (CC-STYLE) is the single /home landing
// for every role (CC-6 cutover) — this just resolves the viewer's
// DashboardScope (lib/dashboard/scope.ts) and mounts the matching scoped
// view: Department (CC-4) for a department/OS-scoped admin, Bureau/Office
// (CC-7) for a bureau- or office-scoped reviewer/admin, Personal (CC-8) for
// a submitter. Each view mounts its own DashboardShell (sidebar + header),
// which is now the primary in-app navigation for every role.

import { useEffect, useState } from "react"
import { RequireAuth } from "@/components/auth/require-auth"
import { getSession } from "@/lib/auth"
import { getDashboardScope, type DashboardScope } from "@/lib/dashboard/scope"
import { DepartmentDashboard } from "@/components/dashboard/department-dashboard"
import { BureauDashboard } from "@/components/dashboard/bureau-dashboard"
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard"

function HomeInner() {
  const [scope, setScope] = useState<DashboardScope | null>(null)

  useEffect(() => {
    setScope(getDashboardScope(getSession()))
  }, [])

  if (!scope) return <div className="min-h-svh bg-background" />

  if (scope.level === "personal") return <PersonalDashboard />
  return scope.level === "department" ? <DepartmentDashboard /> : <BureauDashboard />
}

export default function HomePage() {
  return (
    <RequireAuth requireRole={["admin", "reviewer", "submitter"]}>
      <HomeInner />
    </RequireAuth>
  )
}
