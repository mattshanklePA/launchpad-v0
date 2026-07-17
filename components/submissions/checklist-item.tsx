"use client"

// One numbered, status-tagged row in the reviewer detail view's guided
// decision checklist (components/submissions/submission-detail.tsx). Purely
// presentational — the caller supplies the status label/tone and the
// actionable content; this just gives every item the same numbered-row shape
// plus a scroll/focus target so the Decision Header's "Resolve the blocker"
// action can jump straight to the item that needs attention.

import { forwardRef, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const ChecklistItem = forwardRef<
  HTMLLIElement,
  {
    index: number
    title: ReactNode
    statusLabel: string
    statusClassName: string
    highlighted?: boolean
    children: ReactNode
  }
>(function ChecklistItem({ index, title, statusLabel, statusClassName, highlighted, children }, ref) {
  return (
    <li
      ref={ref}
      tabIndex={-1}
      className={cn(
        "scroll-mt-24 space-y-3 rounded-lg border bg-card p-4 text-card-foreground outline-none transition-shadow",
        highlighted && "ring-2 ring-secondary ring-offset-2 ring-offset-background",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
            aria-hidden="true"
          >
            {index}
          </span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <Badge variant="outline" className={statusClassName}>
          {statusLabel}
        </Badge>
      </div>
      {children}
    </li>
  )
})
