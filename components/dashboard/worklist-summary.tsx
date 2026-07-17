"use client"

// UX #4: worklist-first orientation — a one-line "Today: N items need you"
// headline shown above the Action Center's Tabs (department-dashboard.tsx,
// bureau-dashboard.tsx), so an admin sees what needs them before scrolling
// to the (now secondary) KPI strip. Presentation only: `worklistSummaryLabel`
// (department-dashboard-data.ts) does the counting/pluralizing off the same
// `actionItems` the Action Center itself renders, so this line can never
// disagree with the list beneath it.

import { ListChecks, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { worklistSummaryLabel } from "./department-dashboard-data"
import type { ActionItem } from "./action-center-data"

export function WorklistSummary({ items }: { items: ActionItem[] }) {
  const label = worklistSummaryLabel(items)
  const Icon = items.length > 0 ? ListChecks : CheckCircle2

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium",
        items.length > 0 ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          // emerald-700, not -600: matches kpi-card-data.ts's kpiTrendTextClass,
          // the codebase's established WCAG-AA-clearing shade of "green" on white.
          items.length > 0 ? "text-secondary" : "text-emerald-700 dark:text-emerald-400",
        )}
        aria-hidden="true"
      />
      {label}
    </p>
  )
}
