"use client"

// UX #4: a dismissible first-run banner orienting a new admin/reviewer to how
// a use case moves from submitted to reported, shown above the worklist on
// the Department (CC-4) and Bureau/Office (CC-7) dashboards. Persisted via
// the same `usePersistentDisclosure` localStorage pattern the wizard's
// optional-detail disclosures use — once dismissed it stays dismissed on
// this browser, so it reads as "first-run," not "every time." Tenant-neutral:
// the stage list is generic pipeline language, not any tenant's own copy, and
// only adds "Bureau sign-off" for bureau-tier tenants (DoC) since that stage
// doesn't exist for the rest.

import { Compass, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTenant } from "@/lib/tenant"
import { usePersistentDisclosure } from "@/hooks/use-persistent-disclosure"

export function OrientationBanner({ bureauTier }: { bureauTier: boolean }) {
  const [dismissed, setDismissed] = usePersistentDisclosure("dashboard-orientation-banner", false)
  if (dismissed) return null

  const stages = bureauTier
    ? ["Submitted", "In review", "Approved", `${getTenant().tierLabels.unit} sign-off`, "OMB reportable"]
    : ["Submitted", "In review", "Approved", "OMB reportable"]

  return (
    <div className="flex items-start gap-3 rounded-lg border border-secondary/30 bg-secondary/5 p-3">
      <Compass className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">How a use case moves through review</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {stages.join(" → ")}. This dashboard tracks every use case in scope through each stage — the worklist
          below surfaces what needs you next, and the metrics further down summarize where things stand.
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Dismiss orientation banner</span>
      </Button>
    </div>
  )
}
