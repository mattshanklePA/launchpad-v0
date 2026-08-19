"use client"

// Program Office roll-up page (RD-1, mock 03) — the "send me a status"
// answer, promoted from a tab inside department-dashboard.tsx/bureau-dashboard.tsx
// (pre-redesign) into its own route now that both dashboards render the
// shared CommandCenter body instead. Guarded like /decisions: RequireAuth's
// admin/reviewer role gate, no separate check here. Scoped like both
// dashboards' own former roll-up tab was — `scopedSubmissions` on the
// viewer's own DashboardScope, so a bureau-scoped reviewer sees their own
// bureau's roll-up, never the whole department's.

import { useEffect, useState } from "react"
import { RequireAuth } from "@/components/auth/require-auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { getSession } from "@/lib/auth"
import { getTenant } from "@/lib/tenant"
import { getDashboardScope, getHierarchy } from "@/lib/dashboard/scope"
import { getDashboardMetrics, scopedSubmissions } from "@/lib/dashboard/metrics"
import { getKpiDrilldown } from "@/lib/dashboard/drilldown"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { consolidatedReportableEntryCount } from "@/lib/ombConsolidation"
import { buildKpiCards, buildActionItems } from "@/components/dashboard/department-dashboard-data"
import { kpiDrilldownEntryHref } from "@/components/dashboard/kpi-card-data"
import { formatKeystoneDate } from "@/components/dashboard/command-center-data"
import { determineConsolidation } from "@/lib/ombConsolidation"
import { BureauRollup } from "@/components/admin/bureau-rollup"
import { ApprovalTransparency } from "@/components/admin/approval-transparency"
import { RationalizationPanel } from "@/components/admin/rationalization-panel"
import { Button } from "@/components/ui/button"

function RollupPageInner() {
  const { loaded } = useDataProvider()
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])

  useEffect(() => {
    if (loaded) setAllSubmissions(getSubmissions())
  }, [loaded])

  const tenant = getTenant()
  const session = getSession()
  const scope = getDashboardScope(session)
  const hierarchy = getHierarchy(tenant)
  const bureauTier = tenantHasBureauTier(tenant)

  const submissions = scopedSubmissions(scope, allSubmissions)
  // Same reportable-entry count BureauRollup's own summary line renders
  // below, so the two can't disagree (issue #218).
  const reportableEntries = consolidatedReportableEntryCount(submissions)
  const hasConsolidated = submissions.some((s) => determineConsolidation(s.formData).status === "Consolidated")
  const kpiDrilldown = getKpiDrilldown(scope, allSubmissions, tenant)
  const metrics = getDashboardMetrics(scope, allSubmissions, tenant)
  const actionItems = buildActionItems(metrics, bureauTier, [], tenant, kpiDrilldown)
  const pendingClusterItem = actionItems.find((i) => i.id === "duplicates")
  const leadCluster = kpiDrilldown.duplicates.find((d) => d.cardField === "Pending rationalization")

  return (
    <DashboardShell baseScope={scope} hierarchy={hierarchy} selection={null} onSelect={() => {}} breadcrumb={`${tenant.unit.label} roll-up`}>
      <div className="space-y-[22px]">
        <div className="flex flex-col gap-2 rounded-lg bg-keystone-basalt600 p-6 text-keystone-chalk shadow-sm md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="ks-microlabel text-keystone-amberLight">{tenant.unit.label} roll-up</p>
            <h1 className="ks-page-title text-white">{tenant.unit.label} roll-up</h1>
            <p className="text-[13.5px] text-white/72">Every use case, by {tenant.unit.label.toLowerCase()} and status</p>
            <p className="text-[13.5px] text-white/72">
              {submissions.length} use case{submissions.length === 1 ? "" : "s"}
              {hasConsolidated
                ? ` · consolidates to ${reportableEntries} ${tenant.inventoryShortLabel} reportable ${reportableEntries === 1 ? "entry" : "entries"}`
                : ""}
              {" · as of "}{formatKeystoneDate(new Date().toISOString())}
            </p>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <a href="/api/export/approval">Export approval report</a>
          </Button>
        </div>

        <BureauRollup submissions={submissions} />

        {pendingClusterItem && leadCluster && (
          <div className="flex items-center gap-5 rounded-md border border-border-subtle border-l-[3px] border-l-attention bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-semibold text-foreground">{pendingClusterItem.title}</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{leadCluster.bureauLabel}</p>
            </div>
            <a href={kpiDrilldownEntryHref(leadCluster)} className="shrink-0 text-[13px] font-semibold text-primary hover:underline">
              Open the cluster
            </a>
          </div>
        )}

        <ApprovalTransparency submissions={allSubmissions} />

        <RationalizationPanel submissions={submissions} />
      </div>
    </DashboardShell>
  )
}

export default function RollupPage() {
  return (
    <RequireAuth requireRole={["admin", "reviewer"]}>
      <RollupPageInner />
    </RequireAuth>
  )
}
