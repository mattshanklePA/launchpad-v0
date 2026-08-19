"use client"

// Command Center dashboard body (RD-1, issue #202) — the shared layout mocks
// 01/02 describe, rendered by both DepartmentDashboard (enterprise scope) and
// BureauDashboard (bureau/office scope) so the two entry files stay thin and
// never drift into two different layouts. Every count/predicate/drill-down
// list is computed by calling the same functions the pre-redesign dashboards
// used (buildKpiCards, buildActionItems, getKpiDrilldown, getDashboardActions,
// lib/dashboard/*) — this component only decides layout, never a number. The
// one enterprise-wide comparison a scoped view needs ("of N enterprise-wide")
// is the same call made again with `{ level: "department" }` (see the
// `department dashboard scope` guardrail note below), never a second metric.
//
// Design decision (not spelled out identically in the mocks and the issue
// prose): the hero only renders for the enterprise (department) scope. Mock
// 02's scoped view has no hero — the same critical duplicate-cluster item
// that would be a hero at enterprise scope appears as a normal alert-dot row
// instead, and the basalt banner (item 7) takes the hero's place at the top.
// Followed the mock, since docs/design/README.md names the numbered mocks the
// source of truth.

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/ui/status-pill"
import { PRIMARY_COLUMN_CLASS } from "@/lib/layoutTokens"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import type { Session } from "@/lib/auth"
import { hasAdminAccess } from "@/lib/auth"
import type { Submission } from "@/lib/submissions"
import type { DashboardScope } from "@/lib/dashboard/scope"
import type { EntitySelection } from "./entity-tree-data"
import { getDashboardMetrics, scopedSubmissions } from "@/lib/dashboard/metrics"
import { getKpiDrilldown } from "@/lib/dashboard/drilldown"
import { getDashboardActions } from "@/lib/dashboard/actions"
import { plumbLine } from "@/lib/dashboard/plumbLine"
import { decisionCenterCandidates } from "@/lib/decisionCenter"
import { tenantHasBureauTier, clusterDuplicates, isRationalizationPending } from "@/lib/rationalization"
import { buildKpiCards, buildActionItems, scopeLabel, worklistSummaryLabel } from "./department-dashboard-data"
import { KpiRailList } from "./kpi-card"
import { ActionCenter } from "./action-center"
import {
  buildHeroCluster,
  findHeroItem,
  rowItems,
  scopedSubmissionRow,
  splitLabelCode,
} from "./command-center-data"

const DEPARTMENT_SCOPE: DashboardScope = { level: "department" }

function scopeViewer(session: Session | null) {
  return session ? { role: session.role, email: session.email, businessUnit: session.businessUnit, office: session.office } : null
}

/** The org-tier word for the basalt "you are looking at one X" banner — the unit tier at bureau scope, the sub-unit tier at office scope. */
function scopedUnitWord(scope: DashboardScope, tenant: TenantConfig): string {
  return scope.level === "office" ? tenant.tierLabels.subUnit.toLowerCase() : tenant.tierLabels.unit.toLowerCase()
}

export function CommandCenter({
  tenant = getTenant(),
  session,
  scope,
  selection,
  onSelect,
  submissions,
}: {
  tenant?: TenantConfig
  session: Session | null
  scope: DashboardScope
  selection: EntitySelection | null
  onSelect: (selection: EntitySelection | null) => void
  submissions: Submission[]
}) {
  const bureauTier = tenantHasBureauTier(tenant)
  const rmfEnabled = !!tenant.features.rmf
  const admin = hasAdminAccess(session)
  const scoped = scope.level !== "department"

  const metrics = getDashboardMetrics(scope, submissions, tenant)
  const kpiCards = buildKpiCards(metrics, bureauTier, rmfEnabled, tenant)
  const kpiDrilldown = getKpiDrilldown(scope, submissions, tenant)
  const dashboardActions = getDashboardActions(scope, submissions, tenant)
  const actionItems = buildActionItems(metrics, bureauTier, dashboardActions, tenant, kpiDrilldown)

  // The one enterprise-wide comparison a scoped view needs — the same
  // functions, called again with department scope, never a second metric
  // (guardrail: "If a number needs to move, compute it by calling the same
  // function with department scope").
  const deptMetrics = scoped ? getDashboardMetrics(DEPARTMENT_SCOPE, submissions, tenant) : metrics
  const deptKpiCards = scoped ? buildKpiCards(deptMetrics, bureauTier, rmfEnabled, tenant) : kpiCards
  const deptActionItems = scoped
    ? buildActionItems(
        deptMetrics,
        bureauTier,
        getDashboardActions(DEPARTMENT_SCOPE, submissions, tenant),
        tenant,
        getKpiDrilldown(DEPARTMENT_SCOPE, submissions, tenant),
      )
    : actionItems
  const enterpriseKpiById: Record<string, (typeof deptKpiCards)[number]> = Object.fromEntries(
    deptKpiCards.map((c) => [c.id, c]),
  )

  const hero = !scoped ? findHeroItem(actionItems) : null
  const rows = rowItems(actionItems, hero)
  const heroCluster = hero
    ? buildHeroCluster(
        kpiDrilldown.duplicates.filter((d) => d.cardField === "Pending rationalization"),
        tenant,
      )
    : null

  const decisionCenterCount = decisionCenterCandidates(submissions, scopeViewer(session)).length

  const railEyebrow = scoped
    ? `${splitLabelCode(scopeLabel(scope, tenant)).code ?? scopeLabel(scope, tenant)} at a glance`
    : "Where the portfolio stands"

  const headerMeta = scoped
    ? `of ${deptActionItems.length} enterprise-wide`
    : `${scopeLabel(scope, tenant)} · all ${tenant.tierLabels.subUnitPlural.toLowerCase()}`

  // Scoped-view use-case list (mock 02) — every submission in this scope,
  // flagging pending cross-bureau duplicate-cluster members so their pill
  // reads "Blocked" instead of their raw status.
  const clusters = clusterDuplicates(submissions, tenant)
  const scopedRows = scoped
    ? scopedSubmissions(scope, submissions).map((s) => scopedSubmissionRow(s, isRationalizationPending(s, clusters)))
    : []

  const warningCount = actionItems.filter((i) => i.severity === "warning").length
  const plumb = plumbLine(!!hero, warningCount)

  return (
    <div className="flex flex-col gap-[22px] lg:flex-row lg:items-start">
      <div className={`min-w-0 flex-1 space-y-[22px] ${PRIMARY_COLUMN_CLASS}`}>
        {scoped && (
          <ScopedBanner scope={scope} tenant={tenant} selection={selection} onSelect={onSelect} metrics={metrics} deptMetrics={deptMetrics} />
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="ks-section-head text-foreground">{worklistSummaryLabel(actionItems, scoped)}</p>
          <span className="text-[13px] text-muted-foreground">{headerMeta}</span>
        </div>

        {heroCluster && (
          <div className="flex flex-col gap-8 rounded-lg bg-keystone-basalt600 p-7 text-keystone-chalk shadow-sm md:flex-row md:items-start">
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="ks-microlabel text-keystone-amberLight">Do this first</p>
              <h2 className="max-w-[24ch] font-heading text-[28px] font-black leading-[1.1] tracking-[-0.024em] text-white">
                {heroCluster.headline}
              </h2>
              <p className="max-w-[56ch] text-[14.5px] leading-relaxed text-white/75">{heroCluster.body}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-white/55">
                {heroCluster.officeLabels.map((label, i) => (
                  <span key={label} className="flex items-center gap-4">
                    {i > 0 && <span className="text-white/30">·</span>}
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 pt-1 md:w-[200px]">
              <Button asChild variant="chalk" className="h-auto py-3 text-[14.5px] font-semibold">
                <Link href={heroCluster.href}>Open the cluster</Link>
              </Button>
              <p className="text-[12px] leading-snug text-white/55">{heroCluster.hint}</p>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          <p className="ks-microlabel">Then, when you have time</p>
          <ActionCenter items={rows} />
        </div>

        {admin && (
          <div className="flex items-center gap-3.5 rounded-md border border-border-subtle bg-card p-4 hover:border-strong">
            <div className="min-w-0 flex-1">
              <p className="font-heading text-[15px] font-bold text-foreground">Decision Center</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {decisionCenterCount} candidate{decisionCenterCount === 1 ? "" : "s"} ready to compare. Generate an executive
                briefing.
              </p>
            </div>
            <Link href="/decisions" className="shrink-0 text-[13px] font-semibold text-primary hover:underline">
              Open
            </Link>
          </div>
        )}

        {scoped && (
          <div className="space-y-2.5">
            <p className="ks-microlabel">Use cases in this {tenant.tierLabels[scope.level === "office" ? "subUnit" : "unit"].toLowerCase()}</p>
            <div className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-card">
              {scopedRows.map((row) => (
                <div key={row.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-foreground">{row.title}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{row.meta}</p>
                  </div>
                  <StatusPill status={row.statusKeystone}>{row.statusLabel}</StatusPill>
                  <Link href={row.href} className="shrink-0 text-[13px] font-semibold text-primary hover:underline">
                    Open
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full shrink-0 space-y-3.5 border-t border-border-subtle pt-5 lg:w-[290px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <p className="ks-microlabel">{railEyebrow}</p>
        <KpiRailList
          cards={kpiCards}
          drilldown={kpiDrilldown}
          enterpriseCardsById={scoped ? enterpriseKpiById : undefined}
        />
        <p className="text-[12px] leading-relaxed text-foreground-faint">Every number opens the list behind it.</p>
        <Link href="/rollup" className="block text-[13px] font-semibold text-primary hover:underline">
          {tenant.unit.label} roll-up →
        </Link>

        <div className="flex flex-col gap-2.5 border-t border-border-subtle pt-4">
          <div className="flex items-start gap-2">
            <Image src="/keystone/plumb-assistant.svg" alt="" width={16} height={16} className="mt-0.5 shrink-0" />
            <div className="text-[13px] leading-relaxed text-foreground">
              <p className="ks-microlabel mb-0.5">Plumb</p>
              {plumb}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScopedBanner({
  scope,
  tenant,
  selection,
  onSelect,
  metrics,
  deptMetrics,
}: {
  scope: DashboardScope
  tenant: TenantConfig
  selection: EntitySelection | null
  onSelect: (selection: EntitySelection | null) => void
  metrics: ReturnType<typeof getDashboardMetrics>
  deptMetrics: ReturnType<typeof getDashboardMetrics>
}) {
  if (scope.level !== "bureau" && scope.level !== "office") return null

  // Resolved against the `tenant` prop, not the module-global `getTenant()`
  // `businessUnitLabel`/`officeLabel` (lib/reviewWorkflow.ts) read — the same
  // "tenant flows as an explicit param" discipline `scopeLabel`
  // (department-dashboard-data.ts) already follows, so this banner reads the
  // tenant CommandCenter was actually handed, not whichever one the runtime
  // env happens to resolve.
  const bureau = tenant.unit.options.find((o) => o.value === scope.businessUnit)
  const bureauLabel = bureau?.label || scope.businessUnit
  const office = scope.level === "office" ? bureau?.offices?.find((o) => o.value === scope.office) : undefined
  const title = scope.level === "office" ? office?.label || scope.office : bureauLabel
  const { code, name } = splitLabelCode(title)
  const parentLabel = scope.level === "office" ? bureauLabel : tenant.orgName
  const here = metrics.pipelineStatus.total
  const enterpriseTotal = deptMetrics.pipelineStatus.total

  const back =
    scope.level === "office"
      ? { label: `Back to ${splitLabelCode(bureauLabel).code ?? bureauLabel}`, target: { businessUnit: scope.businessUnit } }
      : selection
        ? { label: "Back to enterprise view", target: null }
        : null

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-keystone-basalt600 p-6 text-keystone-chalk shadow-sm md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <p className="ks-microlabel text-keystone-amberLight">You are looking at one {scopedUnitWord(scope, tenant)}</p>
        <h1 className="font-heading text-[27px] font-black leading-[1.1] tracking-[-0.024em] text-white">
          {code ? `${code} · ${name}` : name}
        </h1>
        <p className="text-[13.5px] text-white/72">
          {parentLabel} · {here} of the enterprise's {enterpriseTotal} use cases live here
        </p>
      </div>
      {back && (
        <button
          type="button"
          onClick={() => onSelect(back.target)}
          className="shrink-0 pb-0.5 text-[13px] font-semibold text-white/90 hover:text-white hover:underline"
        >
          {back.label}
        </button>
      )}
    </div>
  )
}
