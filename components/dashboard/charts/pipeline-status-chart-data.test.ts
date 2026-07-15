import { describe, it, expect } from "vitest"
import { pipelineStatusChartData } from "./pipeline-status-chart-data"
import { STATUS_ORDER, STATUS_LABEL } from "@/lib/reviewWorkflow"
import type { PipelineStatusCard } from "@/lib/dashboard/metrics"

describe("pipelineStatusChartData", () => {
  it("returns one row per status, in pipeline order, with the card's count", () => {
    const card: PipelineStatusCard = {
      counts: { draft: 1, submitted: 3, in_review: 2, needs_info: 0, approved: 5, rejected: 1 },
      total: 12,
    }
    const rows = pipelineStatusChartData(card)
    expect(rows.map((r) => r.status)).toEqual(STATUS_ORDER)
    expect(rows.find((r) => r.status === "submitted")).toEqual({
      status: "submitted",
      label: STATUS_LABEL.submitted,
      count: 3,
    })
  })

  it("defaults a missing status count to 0", () => {
    const card = { counts: {}, total: 0 } as unknown as PipelineStatusCard
    const rows = pipelineStatusChartData(card)
    expect(rows.every((r) => r.count === 0)).toBe(true)
  })
})
