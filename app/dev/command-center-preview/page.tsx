"use client"

// Minimal harness for the Command Center dashboard shell (CC-3). Not linked
// from any nav and not the real Department view — that wiring is CC-4. This
// page exists only so the components/dashboard/* components render against
// real CC-1/CC-2 shapes (getHierarchy(), and hand-built metric-shaped
// fixtures matching CC-2's exported types) ahead of that integration, and so
// dark/light can be exercised via theme-provider before it's wired globally.

import { useState } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { KpiCardGrid, type KpiCardData } from "@/components/dashboard/kpi-card"
import { HealthGauge } from "@/components/dashboard/health-gauge"
import { EntityTree, type EntitySelection } from "@/components/dashboard/entity-tree"
import { ActionCenter, type ActionItem } from "@/components/dashboard/action-center"
import { PipelineStatusChart } from "@/components/dashboard/charts/pipeline-status-chart"
import { ReadinessDistributionChart } from "@/components/dashboard/charts/readiness-distribution-chart"
import { getHierarchy } from "@/lib/dashboard/scope"
import type { PipelineStatusCard, ReadinessDistributionCard } from "@/lib/dashboard/metrics"
import { getTenant } from "@/lib/tenant"

const PIPELINE_FIXTURE: PipelineStatusCard = {
  counts: { draft: 2, submitted: 6, in_review: 4, needs_info: 1, approved: 8, rejected: 2 },
  total: 23,
}

const READINESS_FIXTURE: ReadinessDistributionCard = { ready: 9, needs_work: 6, early_stage: 5, not_assessed: 3, total: 23 }

const ACTION_ITEMS: ActionItem[] = [
  { id: "1", title: "3 items awaiting bureau sign-off", severity: "warning", actionLabel: "Review" },
  { id: "2", title: "1 cross-bureau duplicate cluster pending", severity: "critical", actionLabel: "Rationalize" },
  { id: "3", title: "2 submissions need an OMB reportability review", severity: "info", actionLabel: "Review" },
]

export default function CommandCenterPreviewPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const tenant = getTenant()
  const hierarchy = getHierarchy(tenant)
  const [selection, setSelection] = useState<EntitySelection | null>(null)

  const kpiCards: KpiCardData[] = [
    { id: "pipeline", label: "In pipeline", value: PIPELINE_FIXTURE.total, status: "neutral" },
    {
      id: "ready",
      label: "Ready",
      value: READINESS_FIXTURE.ready,
      delta: { value: `${READINESS_FIXTURE.ready}/${READINESS_FIXTURE.total}`, direction: "up" },
      status: "good",
    },
    { id: "signoff", label: "Awaiting sign-off", value: 3, status: "warning" },
    { id: "duplicates", label: "Duplicate clusters", value: 1, status: "critical" },
  ]

  return (
    <ThemeProvider attribute="class" forcedTheme={theme} enableSystem={false}>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-foreground">
              Command Center shell preview — {tenant.orgName}
            </h1>
            <Button size="sm" variant="outline" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? "Switch to dark" : "Switch to light"}
            </Button>
          </div>

          <KpiCardGrid cards={kpiCards} />

          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <div className="rounded-lg border bg-card p-3">
              <EntityTree hierarchy={hierarchy} selected={selection} onSelect={setSelection} tenant={tenant} />
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-4">
                  <h2 className="mb-2 text-sm font-semibold text-foreground">Pipeline by status</h2>
                  <PipelineStatusChart card={PIPELINE_FIXTURE} />
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <h2 className="mb-2 text-sm font-semibold text-foreground">Readiness distribution</h2>
                  <ReadinessDistributionChart card={READINESS_FIXTURE} />
                </div>
              </div>

              <div className="flex justify-center rounded-lg border bg-card p-4">
                <HealthGauge score={72} label="Pipeline health" />
              </div>

              <ActionCenter items={ACTION_ITEMS} />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
