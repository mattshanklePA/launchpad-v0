"use client"

// Department Dashboard (CC-4) — the first assembled Command Center screen.
// Assembles the CC-3 shell (components/dashboard/*) against CC-2 metrics
// (lib/dashboard/*) at department scope for an admin. Mostly read-only
// insight + navigation: the Executive Action Center (CC-5) now derives real,
// scoped action items (lib/dashboard/actions.ts) and wires two of them —
// sign-off nudge, request info — to the existing Notifier
// (app/dashboard-actions.ts -> lib/notifier.ts); everything else on
// this screen stays read-only.
//
// Entity-tree selection is local state; drilling into a bureau (then an
// office where the tenant has one) recomputes every card by feeding a
// narrower DashboardScope through the same lib/dashboard/metrics.ts
// functions the department view itself uses — a bureau/office admin's own
// dashboard (a later story) would compute identically for their scope.

import { useEffect, useState } from "react"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { getSession } from "@/lib/auth"
import { getTenant } from "@/lib/tenant"
import { getDashboardScope, getHierarchy } from "@/lib/dashboard/scope"
import { getDashboardMetrics, scopedSubmissions } from "@/lib/dashboard/metrics"
import { getDashboardActions } from "@/lib/dashboard/actions"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCardGrid } from "@/components/dashboard/kpi-card"
import { HealthGauge } from "@/components/dashboard/health-gauge"
import type { EntitySelection } from "@/components/dashboard/entity-tree"
import { ActionCenter } from "@/components/dashboard/action-center"
import { PipelineStatusChart } from "@/components/dashboard/charts/pipeline-status-chart"
import { ReadinessDistributionChart } from "@/components/dashboard/charts/readiness-distribution-chart"
import { BureauRollup } from "@/components/admin/bureau-rollup"
import { RationalizationPanel } from "@/components/admin/rationalization-panel"
import { ApprovalTransparency } from "@/components/admin/approval-transparency"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DecisionCenterLink, AdminToolsSection } from "@/components/dashboard/dashboard-workspace-links"
import { resolveDrillScope, scopeLabel, buildKpiCards, buildActionItems, computeHealthScore } from "./department-dashboard-data"

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
  const bureauTier = tenantHasBureauTier(tenant)

  const metrics = getDashboardMetrics(scope, submissions, tenant)
  const kpiCards = buildKpiCards(metrics, bureauTier)
  const dashboardActions = getDashboardActions(scope, submissions, tenant)
  const actionItems = buildActionItems(metrics, bureauTier, dashboardActions)
  const healthScore = computeHealthScore(metrics)
  const rollupSubmissions = scopedSubmissions(scope, submissions)
  const currentScopeLabel = scopeLabel(scope, tenant)

  return (
    <DashboardShell baseScope={baseScope} hierarchy={hierarchy} selection={selection} onSelect={setSelection} breadcrumb={currentScopeLabel}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Department Dashboard</h1>
          <p className="text-sm text-muted-foreground">{currentScopeLabel}</p>
        </div>
      </div>

      <KpiCardGrid cards={kpiCards} />

      <DecisionCenterLink />

      <AdminToolsSection session={session} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="actions">Action Center</TabsTrigger>
          <TabsTrigger value="rollup">{tenant.unit.label} roll-up</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-none lg:col-span-2">
              <CardHeader className="border-b px-4 py-3">
                <CardTitle className="text-sm font-semibold">Pipeline by status</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <PipelineStatusChart card={metrics.pipelineStatus} />
              </CardContent>
            </Card>
            <Card className="flex flex-col shadow-none">
              <CardHeader className="border-b px-4 py-3">
                <CardTitle className="text-sm font-semibold">Pipeline health</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 items-center justify-center p-3">
                <HealthGauge score={healthScore} />
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-none">
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-sm font-semibold">Readiness distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ReadinessDistributionChart card={metrics.readiness} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <ActionCenter items={actionItems} />
        </TabsContent>

        <TabsContent value="rollup" className="space-y-4">
          <BureauRollup submissions={rollupSubmissions} />
          <ApprovalTransparency submissions={submissions} />
          <RationalizationPanel submissions={rollupSubmissions} />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}
