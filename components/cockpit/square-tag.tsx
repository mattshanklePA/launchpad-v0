// K6 SquareTag and Track. Square-cornered tag: a small icon plus a word (color
// is never the only signal). Tones map to the lib/statusTokens.ts meanings
// (healthy / attention / alert / neutral) plus `info` (active blue). Does not
// touch components/ui/status-pill.tsx or lib/statusTokens.ts exports.

import type { ReactNode } from "react"
import type { KeystoneStatus } from "@/lib/statusTokens"
import { cn } from "@/lib/utils"

export type SquareTagTone = KeystoneStatus | "info"

const TONE_CLASS: Record<SquareTagTone, string> = {
  healthy: "border-healthy text-healthy-foreground",
  attention: "border-[var(--ks-amber-dark)] text-[var(--ks-amber-dark)]",
  alert: "border-alert text-alert-foreground",
  neutral: "border-[var(--ks-limestone-dark)] text-[var(--ks-ink-900)]",
  info: "border-[var(--ks-active-blue-dark)] text-[var(--ks-active-blue-dark)]",
}

function ToneIcon({ tone }: { tone: SquareTagTone }) {
  const common = { width: 10, height: 10, viewBox: "0 0 10 10", "aria-hidden": true, className: "shrink-0" } as const
  switch (tone) {
    case "healthy":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="4" fill="var(--ks-on-track)" />
        </svg>
      )
    case "attention":
      return (
        <svg {...common}>
          <path d="M5 0.5l4.5 4.5-4.5 4.5-4.5-4.5z" fill="var(--ks-amber)" />
        </svg>
      )
    case "alert":
      return (
        <svg {...common}>
          <path d="M5 1l4 8H1z" fill="var(--ks-alert)" />
        </svg>
      )
    case "info":
      return (
        <svg {...common}>
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="var(--ks-active-blue-dark)" strokeWidth="1.5" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="7" height="7" fill="var(--ks-ink-700)" />
        </svg>
      )
  }
}

export function SquareTag({
  tone = "neutral",
  children,
  icon,
  className,
}: {
  tone?: SquareTagTone
  /** The word. Always rendered. */
  children: ReactNode
  /** Replaces the default tone icon. */
  icon?: ReactNode
  className?: string
}) {
  return (
    <span
      data-cockpit="square-tag"
      data-tone={tone}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] border bg-white px-[7px] py-[3px] font-mono text-[11px] font-bold tracking-[0.04em]",
        TONE_CLASS[tone],
        className,
      )}
    >
      {icon ?? <ToneIcon tone={tone} />}
      {children}
    </span>
  )
}

const clamp = (n: number) => Math.min(100, Math.max(0, n))

/** A line with a hollow dot for planned and a solid dot for actual; the text label carries the meaning. */
export function Track({
  label,
  actualPercent,
  plannedPercent,
  startLabel,
  endLabel,
  className,
}: {
  label: string
  /** 0 to 100 along the line. Omit to hide the solid dot. */
  actualPercent?: number
  /** 0 to 100 along the line. Omit to hide the hollow dot. */
  plannedPercent?: number
  startLabel?: string
  endLabel?: string
  className?: string
}) {
  return (
    <div data-cockpit="track" className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative h-5" aria-hidden="true">
        <div className="absolute inset-x-0 top-2 h-0.5 bg-[var(--ks-limestone-dark)]" />
        {actualPercent !== undefined ? (
          <div
            className="absolute left-0 top-2 h-0.5 bg-[var(--ks-basalt)]"
            style={{ width: `${clamp(actualPercent)}%` }}
          />
        ) : null}
        {plannedPercent !== undefined ? (
          <span
            data-track-dot="planned"
            className="absolute top-[3px] h-2.5 w-2.5 rounded-full border-2 border-[var(--ks-basalt)] bg-white"
            style={{ left: `calc(${clamp(plannedPercent)}% - 5px)` }}
          />
        ) : null}
        {actualPercent !== undefined ? (
          <span
            data-track-dot="actual"
            className="absolute top-[2px] h-3 w-3 rounded-full bg-[var(--ks-basalt)]"
            style={{ left: `calc(${clamp(actualPercent)}% - 6px)` }}
          />
        ) : null}
      </div>
      <div className="flex justify-between gap-3 font-mono text-[10px] text-[var(--ks-ink-700)]">
        {startLabel ? <span>{startLabel}</span> : null}
        <span data-track-label>{label}</span>
        {endLabel ? <span>{endLabel}</span> : null}
      </div>
    </div>
  )
}
