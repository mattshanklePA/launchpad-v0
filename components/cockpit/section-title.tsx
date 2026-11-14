// K3 SectionTitle: title, one context line beside it, an amber rule running
// to the right.

import type { ElementType } from "react"
import { cn } from "@/lib/utils"

export function SectionTitle({
  title,
  context,
  className,
  as: Title = "h2",
}: {
  /** The element or component that renders the title (a dialog passes its DialogTitle). */
  as?: ElementType
  title: string
  context?: string
  className?: string
}) {
  return (
    <div data-cockpit="section-title" className={cn("flex items-center gap-4", className)}>
      <Title className="ks-section-head m-0 whitespace-nowrap text-[var(--ks-ink-900)]">{title}</Title>
      {context ? <span className="text-[13px] text-[var(--ks-ink-700)]">{context}</span> : null}
      <span aria-hidden="true" className="h-0.5 min-w-4 flex-1 bg-[var(--ks-amber)]" />
    </div>
  )
}
