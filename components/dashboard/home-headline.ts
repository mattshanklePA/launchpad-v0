// NL-3 (#284): the headline the ES2 header band shows on "My work". It is the
// same "Today: N items need you" line the page printed above the action list
// (worklistSummaryLabel), built from the same calls CommandCenter makes, so
// the band and the list can never disagree. No new number.

import type { TenantConfig } from "@/lib/tenant"
import type { Submission } from "@/lib/submissions"
import type { DashboardScope } from "@/lib/dashboard/scope"
import { getDashboardMetrics } from "@/lib/dashboard/metrics"
import { getKpiDrilldown } from "@/lib/dashboard/drilldown"
import { getDashboardActions } from "@/lib/dashboard/actions"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { buildActionItems, worklistSummaryLabel } from "./department-dashboard-data"

/** `undefined` off ES2, so other tenants' shells are handed nothing new. */
export function homeBandTitle(scope: DashboardScope, submissions: Submission[], tenant: TenantConfig): string | undefined {
  if (!tenant.features.cockpitLook) return undefined
  const metrics = getDashboardMetrics(scope, submissions, tenant)
  const items = buildActionItems(
    metrics,
    tenantHasBureauTier(tenant),
    getDashboardActions(scope, submissions, tenant),
    tenant,
    getKpiDrilldown(scope, submissions, tenant),
  )
  return worklistSummaryLabel(items, scope.level !== "department")
}
