"use client"

// Executive Action Center — a scoped list of surfaced action items with a
// call-to-action button per item. Presentation only. Three shapes, and no
// fourth (ES2-12 B):
//   - `drilldown` -> the button opens the KPI drill-down dialog listing the
//     records behind the count (`DrilldownDialogContent`, kpi-card.tsx), each
//     row linking to its submission. The same list the matching KPI card
//     opens — one mechanism, not two.
//   - `onAction` -> a pending spinner while it resolves and a success/failure
//     toast after (CC-5), matching the app's existing async-action pattern
//     (e.g. the Reset Demo Data button, app/admin/page.tsx).
//   - neither -> NO button. This row used to render a disabled one, which
//     told the reviewer there was something to click when nothing was wired.

import { useState } from "react"
import { AlertTriangle, Info, Loader2, OctagonAlert, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusPill } from "@/components/ui/status-pill"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { STATUS_BORDER_L_CLASS, type KeystoneStatus } from "@/lib/statusTokens"
import { DrilldownDialogContent } from "./kpi-card"
import { sortActionItemsBySeverity, type ActionItem, type ActionSeverity } from "./action-center-data"

const SEVERITY_ICON: Record<ActionSeverity, LucideIcon> = {
  critical: OctagonAlert,
  warning: AlertTriangle,
  info: Info,
}

// Maps the Action Center's own info/warning/critical vocabulary onto the DS's
// healthy/attention/alert/neutral status colors (lib/statusTokens.ts) — the
// same left-border-accent + badge/pill discipline as the KPI cards
// (components/dashboard/kpi-card-data.ts), so a "critical" item is never a
// different red than a "critical" KPI card.
const SEVERITY_KEYSTONE: Record<ActionSeverity, KeystoneStatus> = {
  critical: "alert",
  warning: "attention",
  info: "neutral",
}

const SEVERITY_ICON_CLASS: Record<ActionSeverity, string> = {
  critical: "text-alert",
  warning: "text-attention-foreground",
  info: "text-neutral-foreground",
}

const SEVERITY_LABEL: Record<ActionSeverity, string> = {
  critical: "Critical",
  warning: "Attention",
  info: "Info",
}

export function ActionCenter({ items, title = "Action Center" }: { items: ActionItem[]; title?: string }) {
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
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 p-3">
        {sorted.length === 0 && <p className="px-1 py-2 text-sm text-muted-foreground">Nothing needs attention right now.</p>}
        {sorted.map((item) => {
          const severity = item.severity || "info"
          const SeverityIcon = SEVERITY_ICON[severity]
          const pending = pendingId === item.id
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start justify-between gap-3 rounded-md border border-l-4 p-2.5",
                STATUS_BORDER_L_CLASS[SEVERITY_KEYSTONE[severity]],
              )}
            >
              <div className="flex items-start gap-2">
                <SeverityIcon className={cn("mt-0.5 h-4 w-4 shrink-0", SEVERITY_ICON_CLASS[severity])} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <StatusPill status={SEVERITY_KEYSTONE[severity]}>{SEVERITY_LABEL[severity]}</StatusPill>
                  </div>
                  {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
                </div>
              </div>
              {item.drilldown ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      {item.actionLabel || "Review"}
                    </Button>
                  </DialogTrigger>
                  <DrilldownDialogContent label={item.drilldown.label} items={item.drilldown.items} />
                </Dialog>
              ) : item.onAction ? (
                <Button size="sm" variant="outline" disabled={pending} onClick={() => runAction(item)}>
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : item.actionLabel || "Review"}
                </Button>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export type { ActionItem, ActionSeverity } from "./action-center-data"
