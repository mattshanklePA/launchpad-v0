"use client"

// Bureau/Office Dashboard (CC-7) — the reviewer- and bureau/office-scoped
// landing view a bureau (or office-) scoped viewer sees, assembled from the
// same CC-STYLE shell and CC-2 metrics the Department Dashboard (CC-4) uses,
// just computed for a narrower `DashboardScope`. Mounted at `/home`
// (app/home/page.tsx, CC-6), which dispatches to this component whenever
// `getDashboardScope` resolves to "bureau" or "office" rather than
// "department".
//
// Guardrail: every card here is built on `getDashboardMetrics`/
// `getDashboardActions`/`scopedSubmissions` (lib/dashboard/*), which already
// hard-limit to the scope's bureau/office, so nothing on this screen can
// count or list another bureau's submissions. The one new risk this view
// introduces — the entity-tree sidebar could otherwise be used to select a
// different bureau — is closed by `bureauHierarchy` (only the viewer's own
// bureau is ever in the tree) and `resolveBureauDrillScope` (re-checks the
// businessUnit match itself, so the guarantee doesn't depend solely on what
// the tree renders).

import { useEffect, useState } from "react"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { getSession, hasAdminAccess } from "@/lib/auth"
import { getTenant } from "@/lib/tenant"
import { getDashboardScope } from "@/lib/dashboard/scope"
import { getDashboardMetrics, scopedSubmissions, officeRollupRowsForScope } from "@/lib/dashboard/metrics"
import { getKpiDrilldown } from "@/lib/dashboard/drilldown"
import { getDashboardActions } from "@/lib/dashboard/actions"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KpiCardGrid } from "@/components/dashboard/kpi-card"
import { HealthGauge } from "@/components/dashboard/health-gauge"
import type { EntitySelection } from "@/components/dashboard/entity-tree"
import { ActionCenter } from "@/components/dashboard/action-center"
import { WorklistSummary } from "@/components/dashboard/worklist-summary"
import { OrientationBanner } from "@/components/dashboard/orientation-banner"
import { PipelineStatusChart } from "@/components/dashboard/charts/pipeline-status-chart"
import { ReadinessDistributionChart } from "@/components/dashboard/charts/readiness-distribution-chart"
import { OfficeRollup } from "@/components/admin/office-rollup"
import { RationalizationPanel } from "@/components/admin/rationalization-panel"
import { ApprovalTransparency } from "@/components/admin/approval-transparency"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { QueueBoard } from "@/components/dashboard/queue-board"
import { DecisionCenterLink, AdminToolsSection } from "@/components/dashboard/dashboard-workspace-links"
import { scopeLabel, buildKpiCards, buildActionItems, computeHealthScore } from "./department-dashboard-data"
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
  const bureauTier = tenantHasBureauTier(tenant)

  const metrics = getDashboardMetrics(scope, submissions, tenant)
  const kpiCards = buildKpiCards(metrics, bureauTier, !!tenant.features.rmf, tenant)
  const kpiDrilldown = getKpiDrilldown(scope, submissions, tenant)
  const dashboardActions = getDashboardActions(scope, submissions, tenant)
  const actionItems = buildActionItems(metrics, bureauTier, dashboardActions, tenant, kpiDrilldown)
  const healthScore = computeHealthScore(metrics)
  const queue = scopedSubmissions(scope, submissions)
  const officeRows = officeRollupRowsForScope(scope, submissions, tenant)
  const currentScopeLabel = scopeLabel(scope, tenant)

  return (
    <DashboardShell baseScope={baseScope} hierarchy={hierarchy} selection={selection} onSelect={setSelection} breadcrumb={currentScopeLabel}>
      <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="ks-page-title text-foreground">{tenant.unit.label} Dashboard</h1>
          <p className="text-sm text-muted-foreground">{currentScopeLabel}</p>
        </div>
        <AdminToolsSection session={session} />
      </div>

      {hasAdminAccess(session) && <OrientationBanner bureauTier={bureauTier} />}

      <WorklistSummary items={actionItems} />

      <Tabs defaultValue="actions">
        <TabsList>
          <TabsTrigger value="actions">Action Center</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="actions">
          <ActionCenter items={actionItems} />
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <QueueBoard submissions={queue} />

          {scope.level === "bureau" && officeRows.length > 0 && (
            <Card className="shadow-none">
              <CardHeader className="border-b px-4 py-3">
                <CardTitle className="text-sm font-semibold">{tenant.tierLabels.subUnit} breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <OfficeRollup submissions={queue} bureau={scope.businessUnit} bureauLabel={currentScopeLabel} />
              </CardContent>
            </Card>
          )}

          <ApprovalTransparency submissions={submissions} />

          <RationalizationPanel submissions={queue} />
        </TabsContent>

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
                <CardTitle className="text-sm font-semibold">Decision readiness</CardTitle>
                <CardDescription className="text-xs">
                  Share of use cases ready for a decision. Ready counts in full, needs-work at half.
                </CardDescription>
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
      </Tabs>

      <DecisionCenterLink />

      <div className="space-y-2">
        <h2 className="ks-microlabel">Key metrics</h2>
        <KpiCardGrid cards={kpiCards} drilldown={kpiDrilldown} />
      </div>
      </div>
    </DashboardShell>
  )
}
