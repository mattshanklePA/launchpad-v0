"use client"

import { Sparkles, RefreshCw, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  // What Scout filled, e.g. "this section" or "your strategic alignment".
  what?: string
  onRerun?: () => void
  onDismiss?: () => void
  rerunning?: boolean
}

/**
 * Banner shown after Scout auto-populates fields from earlier context.
 * Tells the user the fields were pre-filled and to review/edit. Reusable
 * anywhere we auto-fill (strategic alignment today; other sections later).
 */
export function ScoutFilledBanner({ what = "this section", onRerun, onDismiss, rerunning }: Props) {
  return (
    <div className="rounded-lg border border-uspto-blue-primary/40 bg-uspto-blue-primary/5 p-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 mt-0.5 text-uspto-blue-primary flex-shrink-0" />
        <p className="text-sm text-foreground">
          <span className="font-semibold text-uspto-blue-primary">Scout filled in {what}</span> from your
          earlier answers. Please review and edit anything before continuing.
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onRerun && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRerun} disabled={rerunning}>
            {rerunning ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            )}
            Re-run
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDismiss} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
