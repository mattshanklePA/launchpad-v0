"use client"

// Department Dashboard (CC-4) — the first assembled Command Center screen.
// Assembles the CC-3 shell (components/dashboard/*) against CC-2 metrics
// (lib/dashboard/*) at department scope for an admin. Read-only insight +
// navigation only: the Executive Action Center renders but its buttons stay
// inert (see action-center.tsx) until CC-5 wires real handlers in.
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
import { tenantHasBureauTier } from "@/lib/rationalization"
import { KpiCardGrid } from "@/components/dashboard/kpi-card"
import { HealthGauge } from "@/components/dashboard/health-gauge"
import { EntityTree, type EntitySelection } from "@/components/dashboard/entity-tree"
import { ActionCenter } from "@/components/dashboard/action-center"
import { PipelineStatusChart } from "@/components/dashboard/charts/pipeline-status-chart"
import { ReadinessDistributionChart } from "@/components/dashboard/charts/readiness-distribution-chart"
import { BureauRollup } from "@/components/admin/bureau-rollup"
import { resolveDrillScope, scopeLabel, buildKpiCards, buildActionItems, computeHealthScore } from "./department-dashboard-data"

export function DepartmentDashboard() {
  const { loaded } = useDataProvider()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selection, setSelection] = useState<EntitySelection | null>(null)

  useEffect(() => {
    if (loaded) setSubmissions(getSubmissions())
  }, [loaded])

  const tenant = getTenant()
  const baseScope = getDashboardScope(getSession())
  const scope = resolveDrillScope(baseScope, selection)
  const hierarchy = getHierarchy(tenant)
  const bureauTier = tenantHasBureauTier(tenant)

  const metrics = getDashboardMetrics(scope, submissions, tenant)
  const kpiCards = buildKpiCards(metrics, bureauTier)
  const actionItems = buildActionItems(metrics, bureauTier)
  const healthScore = computeHealthScore(metrics)
  const rollupSubmissions = scopedSubmissions(scope, submissions)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-uspto-gray-text">Department Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{scopeLabel(scope, tenant)}</p>
      </div>

      <KpiCardGrid cards={kpiCards} />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="h-fit rounded-lg border bg-white p-3">
          <EntityTree hierarchy={hierarchy} selected={selection} onSelect={setSelection} tenant={tenant} />
        </div>

        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-uspto-gray-text">Pipeline by status</h2>
              <PipelineStatusChart card={metrics.pipelineStatus} />
            </div>
            <div className="rounded-lg border bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-uspto-gray-text">Readiness distribution</h2>
              <ReadinessDistributionChart card={metrics.readiness} />
            </div>
          </div>

          <div className="flex justify-center rounded-lg border bg-white p-4">
            <HealthGauge score={healthScore} label="Pipeline health" />
          </div>

          <ActionCenter items={actionItems} />

          <BureauRollup submissions={rollupSubmissions} />
        </div>
      </div>
    </div>
  )
}
