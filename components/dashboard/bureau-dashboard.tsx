"use client"

// Bureau/Office Dashboard (CC-7) — the bureau- or office-scoped Command
// Center entry a reviewer/bureau-admin sees. RD-1 (issue #202) replaced this
// file's body with the shared `CommandCenter` layout
// (components/dashboard/command-center.tsx), the same one
// department-dashboard.tsx renders — this file's own job is resolving the
// viewer's own bureau/office scope and mounting the shell + CommandCenter
// around it.
//
// Guardrail: every card CommandCenter renders is built on
// `getDashboardMetrics`/`getDashboardActions`/`scopedSubmissions`
// (lib/dashboard/*), which already hard-limit to the scope's bureau/office,
// so nothing on this screen can count or list another bureau's submissions.
// The one new risk this view introduces — the entity-tree sidebar could
// otherwise be used to select a different bureau — is closed by
// `bureauHierarchy` (only the viewer's own bureau is ever in the tree) and
// `resolveBureauDrillScope` (re-checks the businessUnit match itself, so the
// guarantee doesn't depend solely on what the tree renders).

import { useEffect, useState } from "react"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { getSession } from "@/lib/auth"
import { getTenant } from "@/lib/tenant"
import { getDashboardScope } from "@/lib/dashboard/scope"
import type { EntitySelection } from "@/components/dashboard/entity-tree"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { CommandCenter } from "@/components/dashboard/command-center"
import { scopeLabel } from "./department-dashboard-data"
import { bureauHierarchy, resolveBureauDrillScope } from "./bureau-dashboard-data"

export function BureauDashboard() {
  const { loaded } = useDataProvider()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selection, setSelection] = useState<EntitySelection | null>(null)

  useEffect(() => {
    if (loaded) setSubmissions(getSubmissions())
  }, [loaded])

  const tenant = getTenant()
  const session = getSession()
  const baseScope = getDashboardScope(session)
  const scope = resolveBureauDrillScope(baseScope, selection)
  const hierarchy = bureauHierarchy(baseScope, tenant)
  const currentScopeLabel = scopeLabel(scope, tenant)

  return (
    <DashboardShell baseScope={baseScope} hierarchy={hierarchy} selection={selection} onSelect={setSelection} breadcrumb={currentScopeLabel}>
      <CommandCenter tenant={tenant} session={session} scope={scope} selection={selection} onSelect={setSelection} submissions={submissions} />
    </DashboardShell>
  )
}
