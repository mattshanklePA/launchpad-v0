// KPI card grid — the Command Center's top row of at-a-glance metrics.
// Pure presentation: label, value, delta, and status all come from props
// (KpiCardData, kpi-card-data.ts); nothing here fetches or computes a metric.

import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { kpiStatusAccentClass, kpiTrendTextClass, type KpiCardData, type KpiTrendDirection } from "./kpi-card-data"

const TREND_ICON: Record<KpiTrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
}

export function KpiCard({ label, value, delta, status = "neutral" }: KpiCardData) {
  const TrendIcon = delta ? TREND_ICON[delta.direction] : null
  return (
    <Card className={cn("border-l-4", kpiStatusAccentClass(status))}>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {delta && TrendIcon && (
          <p className={cn("flex items-center gap-1 text-xs font-medium", kpiTrendTextClass(delta.direction))}>
            <TrendIcon className="h-3.5 w-3.5" />
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.id} {...card} />
      ))}
    </div>
  )
}

export type { KpiCardData, KpiDelta, KpiTrendDirection, KpiStatus } from "./kpi-card-data"
