"use client"

// Pipeline-by-status bar chart — presentation only, typed directly against
// CC-2's PipelineStatusCard (lib/dashboard/metrics.ts) so a chart can never
// disagree with the card it's built from.

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { PipelineStatusCard } from "@/lib/dashboard/metrics"
import { pipelineStatusChartData } from "./pipeline-status-chart-data"

export function PipelineStatusChart({ card }: { card: PipelineStatusCard }) {
  const data = pipelineStatusChartData(card)
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis allowDecimals={false} width={28} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export type { PipelineStatusChartDatum } from "./pipeline-status-chart-data"
