"use client"

// Executive Action Center — a scoped list of surfaced action items with a
// call-to-action button per item. Presentation only: an item without an
// `onAction` (e.g. purely informational) renders a disabled button; an item
// with one gets a pending spinner while it resolves and a success/failure
// toast after (CC-5), matching the app's existing async-action pattern (e.g.
// the Reset Demo Data button, app/admin/page.tsx).

import { useState } from "react"
import { AlertTriangle, Info, Loader2, OctagonAlert, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { sortActionItemsBySeverity, type ActionItem, type ActionSeverity } from "./action-center-data"

const SEVERITY_ICON: Record<ActionSeverity, LucideIcon> = {
  critical: OctagonAlert,
  warning: AlertTriangle,
  info: Info,
}

const SEVERITY_ICON_CLASS: Record<ActionSeverity, string> = {
  critical: "text-red-600",
  warning: "text-amber-600",
  info: "text-blue-600",
}

const SEVERITY_BADGE_CLASS: Record<ActionSeverity, string> = {
  critical: "bg-red-100 text-red-800 border-red-300",
  warning: "bg-amber-100 text-amber-800 border-amber-300",
  info: "bg-blue-100 text-blue-800 border-blue-300",
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>}
        {sorted.map((item) => {
          const severity = item.severity || "info"
          const SeverityIcon = SEVERITY_ICON[severity]
          const pending = pendingId === item.id
          return (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="flex items-start gap-2">
                <SeverityIcon className={cn("mt-0.5 h-4 w-4 shrink-0", SEVERITY_ICON_CLASS[severity])} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <Badge variant="outline" className={SEVERITY_BADGE_CLASS[severity]}>
                      {severity}
                    </Badge>
                  </div>
                  {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={!item.onAction || pending} onClick={() => runAction(item)}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : item.actionLabel || "Review"}
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export type { ActionItem, ActionSeverity } from "./action-center-data"
