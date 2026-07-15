// Pure types + helpers for the health-score gauge, pulled out of
// health-gauge.tsx so band logic is unit-testable without rendering React.

export type HealthBand = "critical" | "watch" | "healthy"

export type HealthBandThresholds = { watch: number; healthy: number }

export const DEFAULT_HEALTH_THRESHOLDS: HealthBandThresholds = { watch: 50, healthy: 80 }

/** Clamps a score into the gauge's valid 0-100 range; NaN clamps to 0. */
export function clampHealthScore(score: number): number {
  if (Number.isNaN(score)) return 0
  return Math.min(100, Math.max(0, score))
}

/** Which color band a score falls into, against a (clamped) 0-100 scale. */
export function getHealthBand(
  score: number,
  thresholds: HealthBandThresholds = DEFAULT_HEALTH_THRESHOLDS,
): HealthBand {
  const clamped = clampHealthScore(score)
  if (clamped >= thresholds.healthy) return "healthy"
  if (clamped >= thresholds.watch) return "watch"
  return "critical"
}

const BAND_LABEL: Record<HealthBand, string> = {
  healthy: "Healthy",
  watch: "Needs attention",
  critical: "At risk",
}

/** Human-readable interpretation of a health band, used as the gauge's default label. */
export function healthBandLabel(band: HealthBand): string {
  return BAND_LABEL[band]
}
