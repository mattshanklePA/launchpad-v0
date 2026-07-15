// KPI card grid — the Command Center's top row of at-a-glance metrics.
// Pure presentation: label, value, delta, and status all come from props
// (KpiCardData, kpi-card-data.ts); nothing here fetches or computes a metric.

import { AlertTriangle, TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  kpiStatusAccentClass,
  kpiStatusSurfaceClass,
  kpiIsActionable,
  kpiTrendTextClass,
  sortKpiCardsByPriority,
  type KpiCardData,
  type KpiTrendDirection,
} from "./kpi-card-data"

const TREND_ICON: Record<KpiTrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

export function KpiCard({ label, value, delta, status = "neutral" }: KpiCardData) {
  const TrendIcon = delta ? TREND_ICON[delta.direction] : null
  const actionable = kpiIsActionable(status)
  return (
    <Card
      className={cn(
        "shadow-none",
        actionable ? "border-l-4" : "border-l-[3px]",
        kpiStatusAccentClass(status),
        kpiStatusSurfaceClass(status),
      )}
    >
      <CardContent className="space-y-0.5 p-3">
        <p
          className={cn(
            "flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide",
            actionable ? "text-foreground/70" : "text-muted-foreground",
          )}
        >
          {status === "critical" && <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />}
          {label}
        </p>
        <p
          className={cn(
            "leading-tight",
            actionable ? "text-2xl font-bold text-foreground" : "text-xl font-semibold text-foreground/90",
          )}
        >
          {value}
        </p>
        {delta && TrendIcon && (
          <p className={cn("flex items-center gap-1 text-[11px] font-medium", kpiTrendTextClass(delta.direction))}>
            <TrendIcon className="h-3 w-3" />
            {delta.value}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function KpiCardGrid({ cards }: { cards: KpiCardData[] }) {
  if (cards.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {sortKpiCardsByPriority(cards).map((card) => (
        <KpiCard key={card.id} {...card} />
      ))}
    </div>
  )
}

export type { KpiCardData, KpiDelta, KpiTrendDirection, KpiStatus } from "./kpi-card-data"
