// Keystone DS StatusPill (.claude/skills/components/core/StatusPill.jsx) —
// the app's single status vocabulary: a dot + mono uppercase word, healthy
// (on-track green) / attention (amber) / alert (red) / neutral (ink). Status
// is always carried by color + text together, never color alone.

import { cn } from "@/lib/utils"
import { STATUS_DEFAULT_LABEL, STATUS_DOT_CLASS, type KeystoneStatus } from "@/lib/statusTokens"

export function StatusPill({
  status,
  children,
  className,
}: {
  status: KeystoneStatus
  children?: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground/80",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[status])} aria-hidden="true" />
      {children ?? STATUS_DEFAULT_LABEL[status]}
    </span>
  )
}
