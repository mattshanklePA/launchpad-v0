// Health-score gauge — a single 0-100 scalar rendered as a semicircular arc,
// colored by band (critical/watch/healthy). Presentation only: the score and
// thresholds are props (health-gauge-data.ts); nothing here computes a score.

import { cn } from "@/lib/utils"
import {
  clampHealthScore,
  getHealthBand,
  healthBandLabel,
  DEFAULT_HEALTH_THRESHOLDS,
  type HealthBand,
  type HealthBandThresholds,
} from "./health-gauge-data"

const BAND_STROKE_CLASS: Record<HealthBand, string> = {
  healthy: "stroke-emerald-500",
  watch: "stroke-amber-500",
  critical: "stroke-red-500",
}

const BAND_TEXT_CLASS: Record<HealthBand, string> = {
  healthy: "text-emerald-600 dark:text-emerald-400",
  watch: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
}

// Semicircle arc geometry (0 0 100 55 viewBox, radius 42): arc length is
// pi * r, used both for the track and the score-proportional stroke offset.
const RADIUS = 42
const ARC_LENGTH = Math.PI * RADIUS

export type HealthGaugeProps = {
  score: number
  label?: string
  thresholds?: HealthBandThresholds
}

export function HealthGauge({ score, label, thresholds = DEFAULT_HEALTH_THRESHOLDS }: HealthGaugeProps) {
  const clamped = clampHealthScore(score)
  const band = getHealthBand(clamped, thresholds)
  const offset = ARC_LENGTH * (1 - clamped / 100)
  const interpretation = label ?? healthBandLabel(band)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 60"
        className="w-full max-w-[180px]"
        role="img"
        aria-label={`Pipeline health: ${Math.round(clamped)} out of 100, ${interpretation}`}
      >
        <path d="M 8 50 A 42 42 0 0 1 92 50" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-muted" />
        <path
          d="M 8 50 A 42 42 0 0 1 92 50"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-500", BAND_STROKE_CLASS[band])}
        />
        <text x="9" y="59" textAnchor="middle" className="fill-muted-foreground text-[6px]">0</text>
        <text x="91" y="59" textAnchor="middle" className="fill-muted-foreground text-[6px]">100</text>
        <text x="50" y="44" textAnchor="middle" className="fill-foreground text-[20px] font-semibold">
          {Math.round(clamped)}
        </text>
        <text x="50" y="52" textAnchor="middle" className="fill-muted-foreground text-[7px]">out of 100</text>
      </svg>
      <p className={cn("text-xs font-medium", BAND_TEXT_CLASS[band])}>{interpretation}</p>
    </div>
  )
}

export type { HealthBand, HealthBandThresholds } from "./health-gauge-data"
