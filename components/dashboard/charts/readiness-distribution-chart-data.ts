// Pure card -> chart-slice mapping for the readiness-distribution chart,
// pulled out of readiness-distribution-chart.tsx so it's unit-testable
// without rendering React. Typed directly against CC-2's ReadinessDistributionCard.

import type { ReadinessBucket, ReadinessDistributionCard } from "@/lib/dashboard/metrics"

export type ReadinessChartDatum = { bucket: ReadinessBucket; label: string; count: number }

export const READINESS_BUCKET_ORDER: ReadinessBucket[] = ["ready", "needs_work", "early_stage", "not_assessed"]

export const READINESS_BUCKET_LABEL: Record<ReadinessBucket, string> = {
  ready: "Ready",
  needs_work: "Needs work",
  early_stage: "Early stage",
  not_assessed: "Not assessed",
}

/** Card counts -> non-zero chart slices, in a fixed bucket order. */
export function readinessDistributionChartData(card: ReadinessDistributionCard): ReadinessChartDatum[] {
  return READINESS_BUCKET_ORDER.map((bucket) => ({ bucket, label: READINESS_BUCKET_LABEL[bucket], count: card[bucket] })).filter(
    (d) => d.count > 0,
  )
}
