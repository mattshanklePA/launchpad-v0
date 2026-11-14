// K3 SectionTitle: title, one context line beside it, an amber rule running
// to the right.

import { cn } from "@/lib/utils"

export function SectionTitle({
  title,
  context,
  className,
}: {
  title: string
  context?: string
  className?: string
}) {
  return (
    <div data-cockpit="section-title" className={cn("flex items-center gap-4", className)}>
      <h2 className="ks-section-head m-0 whitespace-nowrap text-[var(--ks-ink-900)]">{title}</h2>
      {context ? <span className="text-[13px] text-[var(--ks-ink-700)]">{context}</span> : null}
      <span aria-hidden="true" className="h-0.5 min-w-4 flex-1 bg-[var(--ks-amber)]" />
    </div>
  )
}
