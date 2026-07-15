// Pure card -> chart-row mapping for the pipeline-by-status chart, pulled
// out of pipeline-status-chart.tsx so it's unit-testable without rendering
// React. Typed directly against CC-2's PipelineStatusCard.

import { STATUS_ORDER, STATUS_LABEL, type SubmissionStatus } from "@/lib/reviewWorkflow"
import type { PipelineStatusCard } from "@/lib/dashboard/metrics"

export type PipelineStatusChartDatum = { status: SubmissionStatus; label: string; count: number }

/** Card counts -> chart rows, in pipeline order. */
export function pipelineStatusChartData(card: PipelineStatusCard): PipelineStatusChartDatum[] {
  return STATUS_ORDER.map((status) => ({ status, label: STATUS_LABEL[status], count: card.counts[status] || 0 }))
}
