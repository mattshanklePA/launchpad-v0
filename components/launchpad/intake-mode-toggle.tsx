"use client"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import type { IntakeMode } from "@/hooks/use-intake-mode-preference"

// Labeled, keyboard-accessible (508) mode switch — Radix's Switch is a native
// button under the hood, so Space/Enter toggles it and it's tab-reachable
// with no extra wiring. Tenant-neutral: "Guided"/"Form" rather than any
// tenant's assistant name, so it reads the same on every deployment.
export function IntakeModeToggle({
  mode,
  onChange,
}: {
  mode: IntakeMode
  onChange: (mode: IntakeMode) => void
}) {
  const isForm = mode === "form"

  return (
    <div className="flex items-center gap-3" role="group" aria-label="Intake mode">
      <span className={cn("text-sm", !isForm ? "font-semibold text-foreground" : "text-muted-foreground")}>
        Guided
      </span>
      <Switch
        checked={isForm}
        onCheckedChange={(checked) => onChange(checked ? "form" : "guided")}
        aria-label={`Intake mode is ${isForm ? "Form" : "Guided"}. Switch to ${isForm ? "Guided" : "Form"} mode.`}
      />
      <span className={cn("text-sm", isForm ? "font-semibold text-foreground" : "text-muted-foreground")}>
        Form
      </span>
    </div>
  )
}
