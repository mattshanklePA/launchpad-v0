import { describe, it, expect } from "vitest"
import { readinessDistributionChartData, READINESS_BUCKET_LABEL } from "./readiness-distribution-chart-data"
import type { ReadinessDistributionCard } from "@/lib/dashboard/metrics"

describe("readinessDistributionChartData", () => {
  it("returns one slice per non-zero bucket, in bucket order", () => {
    const card: ReadinessDistributionCard = { ready: 4, needs_work: 2, early_stage: 0, not_assessed: 1, total: 7 }
    const rows = readinessDistributionChartData(card)
    expect(rows.map((r) => r.bucket)).toEqual(["ready", "needs_work", "not_assessed"])
    expect(rows[0]).toEqual({ bucket: "ready", label: READINESS_BUCKET_LABEL.ready, count: 4 })
  })

  it("omits zero-count buckets entirely", () => {
    const card: ReadinessDistributionCard = { ready: 0, needs_work: 0, early_stage: 0, not_assessed: 0, total: 0 }
    expect(readinessDistributionChartData(card)).toEqual([])
  })
})
