"use client"

// Temporary preview route for the Command Center dashboards. Not linked from
// any nav and does NOT repoint /home — that cutover is CC-6. Renders the
// Department Dashboard (CC-4) for a department-scoped viewer (the Office of
// the Secretary, or a department-level admin/reviewer with no bureau
// assignment), the Bureau/Office Dashboard (CC-7) for a bureau- or
// office-scoped reviewer or admin, and the Personal Dashboard (CC-8) for a
// submitter — per `getDashboardScope` (lib/dashboard/scope.ts), the same
// roll-down rule `visibleSubmissions` applies, so a viewer here only ever
// sees their own scope.

import { useEffect, useState } from "react"
import { RequireAuth } from "@/components/auth/require-auth"
import { getSession } from "@/lib/auth"
import { getDashboardScope, type DashboardScope } from "@/lib/dashboard/scope"
import { DepartmentDashboard } from "@/components/dashboard/department-dashboard"
import { BureauDashboard } from "@/components/dashboard/bureau-dashboard"
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard"

function DashboardPreviewInner() {
  const [scope, setScope] = useState<DashboardScope | null>(null)

  useEffect(() => {
    setScope(getDashboardScope(getSession()))
  }, [])

  if (!scope) return <div className="min-h-svh bg-background" />

  if (scope.level === "personal") return <PersonalDashboard />
  return scope.level === "department" ? <DepartmentDashboard /> : <BureauDashboard />
}

export default function DashboardPreviewPage() {
  return (
    <RequireAuth requireRole={["admin", "reviewer", "submitter"]}>
      <DashboardPreviewInner />
    </RequireAuth>
  )
}
