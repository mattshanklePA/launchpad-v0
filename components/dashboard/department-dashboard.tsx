"use client"

// Department Dashboard (CC-4) — the enterprise-scoped Command Center entry.
// RD-1 (issue #202) replaced this file's body with the shared
// `CommandCenter` layout (components/dashboard/command-center.tsx), which
// both this file and bureau-dashboard.tsx now render — this file's own job
// is just resolving the department admin's scope/hierarchy/session and
// mounting the shell + CommandCenter around it, so nothing that imports
// `DepartmentDashboard` itself needs to change.

import { useEffect, useState } from "react"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { getSession } from "@/lib/auth"
import { getTenant } from "@/lib/tenant"
import { getDashboardScope, getHierarchy } from "@/lib/dashboard/scope"
import type { EntitySelection } from "@/components/dashboard/entity-tree"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CommandCenter } from "@/components/dashboard/command-center"
import { resolveDrillScope, scopeLabel } from "./department-dashboard-data"

export function DepartmentDashboard() {
  const { loaded } = useDataProvider()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selection, setSelection] = useState<EntitySelection | null>(null)

  useEffect(() => {
    if (loaded) setSubmissions(getSubmissions())
  }, [loaded])

  const tenant = getTenant()
  const session = getSession()
  const baseScope = getDashboardScope(session)
  const scope = resolveDrillScope(baseScope, selection)
  const hierarchy = getHierarchy(tenant)
  const currentScopeLabel = scopeLabel(scope, tenant)

  return (
    <DashboardShell baseScope={baseScope} hierarchy={hierarchy} selection={selection} onSelect={setSelection} breadcrumb={currentScopeLabel}>
      <CommandCenter tenant={tenant} session={session} scope={scope} selection={selection} onSelect={setSelection} submissions={submissions} />
    </DashboardShell>
  )
}
