"use client"

// Pipeline-by-status bar chart — presentation only, typed directly against
// CC-2's PipelineStatusCard (lib/dashboard/metrics.ts) so a chart can never
// disagree with the card it's built from.

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { PipelineStatusCard } from "@/lib/dashboard/metrics"
import { pipelineStatusChartData } from "./pipeline-status-chart-data"

export function PipelineStatusChart({ card }: { card: PipelineStatusCard }) {
  const data = pipelineStatusChartData(card)
  const summary = `Pipeline by status: ${data.map((d) => `${d.label} ${d.count}`).join(", ")}`

  return (
    <div>
      {/* recharts renders each bar as its own `<path role="img">` with no
          accessible name; hide the decorative SVG from the accessibility
          tree and expose one real summary on the container instead. */}
      <div role="img" aria-label={summary}>
        <div aria-hidden="true">
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
        </div>
      </div>
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.status}>
            {d.label}: {d.count}
          </li>
        ))}
      </ul>
    </div>
  )
}

export type { PipelineStatusChartDatum } from "./pipeline-status-chart-data"
