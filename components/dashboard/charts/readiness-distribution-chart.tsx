"use client"

// Readiness-distribution chart — presentation only, typed directly against
// CC-2's ReadinessDistributionCard (lib/dashboard/metrics.ts).

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { ReadinessBucket, ReadinessDistributionCard } from "@/lib/dashboard/metrics"
import { readinessDistributionChartData } from "./readiness-distribution-chart-data"

const BUCKET_COLOR: Record<ReadinessBucket, string> = {
  ready: "hsl(var(--chart-2))",
  needs_work: "hsl(var(--chart-4))",
  early_stage: "hsl(var(--chart-5))",
  not_assessed: "hsl(var(--muted-foreground))",
}

export function ReadinessDistributionChart({ card }: { card: ReadinessDistributionCard }) {
  const data = readinessDistributionChartData(card)

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No readiness data yet</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.bucket} fill={BUCKET_COLOR[d.bucket]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {data.map((d) => (
          <li key={d.bucket} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: BUCKET_COLOR[d.bucket] }} />
            {d.label} ({d.count})
          </li>
        ))}
      </ul>
    </div>
  )
}

export type { ReadinessChartDatum } from "./readiness-distribution-chart-data"
