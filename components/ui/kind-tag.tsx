// Keystone DS "kind" tag (00 Components Sheet.dc.html) — mono uppercase pill
// for words that describe what something IS, not its review state: Idea, Use
// case, High-impact, Advisory, Reportable. Never a status — see StatusPill
// (components/ui/status-pill.tsx) for that.

import { cn } from "@/lib/utils"

export function KindTag({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-muted px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.08em] text-foreground/80",
        className,
      )}
    >
      {children}
    </span>
  )
}
