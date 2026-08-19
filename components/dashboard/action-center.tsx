"use client"

// Executive Action Center — the "Then, when you have time" row list (RD-1,
// mock 01): a severity dot, the item's sentence with its leading count bold,
// and a right-aligned action. Presentation only. Three shapes, and no
// fourth (ES2-12 B):
//   - `drilldown` -> the link opens the KPI drill-down dialog listing the
//     records behind the count (`DrilldownDialogContent`, kpi-card.tsx), each
//     row linking to its submission. The same list the matching KPI card
//     opens — one mechanism, not two.
//   - `onAction` -> a pending spinner while it resolves and a success/failure
//     toast after (CC-5), matching the app's existing async-action pattern
//     (e.g. the Reset Demo Data button, app/admin/page.tsx).
//   - neither -> NO link. This row used to render a disabled button, which
//     told the reviewer there was something to click when nothing was wired.

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { STATUS_DOT_CLASS, type KeystoneStatus } from "@/lib/statusTokens"
import { DrilldownDialogContent } from "./kpi-card"
import { splitLeadingCount } from "./command-center-data"
import { sortActionItemsBySeverity, type ActionItem, type ActionSeverity } from "./action-center-data"

// Maps the Action Center's own info/warning/critical vocabulary onto the DS's
// healthy/attention/alert/neutral status colors (lib/statusTokens.ts) — the
// same dot vocabulary the KPI cards use, so a "critical" item is never a
// different red than a "critical" KPI card.
const SEVERITY_KEYSTONE: Record<ActionSeverity, KeystoneStatus> = {
  critical: "alert",
  warning: "attention",
  info: "neutral",
}

const LINK_CLASS = "shrink-0 text-[13px] font-semibold text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"

export function ActionCenter({ items, title }: { items: ActionItem[]; title?: string }) {
  const { toast } = useToast()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const sorted = sortActionItemsBySeverity(items)

  const runAction = async (item: ActionItem) => {
    if (!item.onAction) return
    setPendingId(item.id)
    try {
      const outcome = await item.onAction()
      toast({
        title: outcome.status === "sent" ? "Notification sent" : "Drafted, not sent",
        description: outcome.description,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: error instanceof Error ? error.message : "Something went wrong. Try again.",
      })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card className="shadow-none">
      {title && (
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {sorted.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">Nothing needs attention right now.</p>}
        {sorted.map((item, i) => {
          const severity = item.severity || "info"
          const pending = pendingId === item.id
          const [count, rest] = splitLeadingCount(item.title)
          return (
            <div
              key={item.id}
              data-action-row
              className={cn(
                "flex items-center gap-4 px-5 py-[15px] hover:bg-muted/30",
                i < sorted.length - 1 && "border-b border-border-subtle",
              )}
            >
              <span className={cn("h-[7px] w-[7px] shrink-0 rounded-full", STATUS_DOT_CLASS[SEVERITY_KEYSTONE[severity]])} aria-hidden="true" />
              <p className="min-w-0 flex-1 text-[14.5px] text-foreground">
                {count && <strong className="font-bold">{count}</strong>}
                {count && " "}
                {rest}
              </p>
              {item.drilldown ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className={LINK_CLASS}>
                      {item.actionLabel || "Review"}
                    </button>
                  </DialogTrigger>
                  <DrilldownDialogContent label={item.drilldown.label} items={item.drilldown.items} id={item.id} />
                </Dialog>
              ) : item.onAction ? (
                <button type="button" className={LINK_CLASS} disabled={pending} onClick={() => runAction(item)}>
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : item.actionLabel || "Review"}
                </button>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export type { ActionItem, ActionSeverity } from "./action-center-data"
