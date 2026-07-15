"use client"

// Temporary preview route for the Command Center dashboards. Not linked from
// any nav and does NOT repoint /home — that cutover is CC-6. Renders the
// Department Dashboard (CC-4) for a department-scoped viewer (the Office of
// the Secretary, or a department-level admin/reviewer with no bureau
// assignment) and the Bureau/Office Dashboard (CC-7) for a bureau- or
// office-scoped reviewer or admin, per `getDashboardScope`
// (lib/dashboard/scope.ts) — the same roll-down rule `visibleSubmissions`
// applies, so a viewer here only ever sees their own scope. A submitter
// (personal scope) is redirected to /home; no personal dashboard exists yet.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RequireAuth } from "@/components/auth/require-auth"
import { getSession } from "@/lib/auth"
import { getDashboardScope, type DashboardScope } from "@/lib/dashboard/scope"
import { DepartmentDashboard } from "@/components/dashboard/department-dashboard"
import { BureauDashboard } from "@/components/dashboard/bureau-dashboard"

function DashboardPreviewInner() {
  const router = useRouter()
  const [scope, setScope] = useState<DashboardScope | null>(null)

  useEffect(() => {
    const session = getSession()
    const resolved = getDashboardScope(session)
    if (resolved.level === "personal") {
      router.replace("/home")
      return
    }
    setScope(resolved)
  }, [router])

  if (!scope) return <div className="min-h-svh bg-background" />

  return scope.level === "department" ? <DepartmentDashboard /> : <BureauDashboard />
}

export default function DashboardPreviewPage() {
  return (
    <RequireAuth requireRole={["admin", "reviewer"]}>
      <DashboardPreviewInner />
    </RequireAuth>
  )
}
