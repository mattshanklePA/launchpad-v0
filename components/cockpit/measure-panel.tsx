// K4 MeasurePanel and MeasureRow. Thin limestone border, colored top rule, no
// shadow. MeasureRow lays out 2 or 3 panels, lead panel wider (1.4 : 1 : 1),
// stacked on narrow screens.

import Link from "next/link"
import { Children, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type MeasureAccent = "amber" | "basalt" | "blue"

const ACCENT_CLASS: Record<MeasureAccent, string> = {
  amber: "border-t-[var(--ks-amber)]",
  basalt: "border-t-[var(--ks-basalt)]",
  blue: "border-t-[var(--ks-active-blue-dark)]",
}

export function MeasurePanel({
  number,
  title,
  tag,
  question,
  bigNumber,
  meaning,
  track,
  link,
  action,
  accent = "basalt",
  className,
}: {
  number: number | string
  title: string
  /** Usually a K6 SquareTag. */
  tag?: ReactNode
  question: string
  bigNumber: ReactNode
  meaning: ReactNode
  /** Usually a K6 Track. */
  track?: ReactNode
  link?: { href: string; label: string }
  /** Used instead of `link` when the drilldown opens a dialog rather than a page. */
  action?: ReactNode
  accent?: MeasureAccent
  className?: string
}) {
  return (
    <article
      data-cockpit="measure-panel"
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border border-t-[3px] border-[var(--ks-limestone-dark)] bg-white px-[22px] py-5",
        ACCENT_CLASS[accent],
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-[3px] bg-[var(--ks-basalt)] font-mono text-xs font-bold text-[var(--ks-chalk)]">
          {number}
        </span>
        <h3 className="m-0 font-[family-name:var(--font-head)] text-[17px] font-bold text-[var(--ks-ink-900)]">{title}</h3>
        {tag}
      </div>
      <p className="m-0 text-sm text-[var(--ks-ink-700)]">{question}</p>
      <div className="flex items-end gap-3.5">
        <span className="ks-big-number text-[var(--ks-ink-900)]" style={{ fontSize: 52 }}>
          {bigNumber}
        </span>
        <span className="pb-1 text-sm leading-[1.4] text-[var(--ks-ink-900)]">{meaning}</span>
      </div>
      {track}
      {action}
      {link ? (
      <Link
        href={link.href}
        className="w-fit text-sm font-semibold text-[var(--ks-active-blue-dark)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
      >
        {link.label}
      </Link>
      ) : null}
    </article>
  )
}

export function MeasureRow({ children, className }: { children: ReactNode; className?: string }) {
  const count = Children.count(children)
  return (
    <div
      data-cockpit="measure-row"
      className={cn(
        "grid grid-cols-1 gap-5",
        count === 2 ? "lg:grid-cols-[1.4fr_1fr]" : "lg:grid-cols-[1.4fr_1fr_1fr]",
        className,
      )}
    >
      {children}
    </div>
  )
}
