"use client"

import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { getTenant } from "@/lib/tenant"
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

  // NL-11 (#312), ES2 only: two square buttons side by side instead of a switch.
  if (getTenant().features.cockpitLook) {
    const options: { value: IntakeMode; label: string }[] = [
      { value: "guided", label: "Guided" },
      { value: "form", label: "As a form" },
    ]
    return (
      <div data-cockpit="mode-switch" className="inline-flex border border-[var(--ks-chalk)]" role="group" aria-label="Intake mode">
        {options.map((o) => {
          const active = mode === o.value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (!active) onChange(o.value)
              }}
              className={cn(
                "px-3.5 py-1.5 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]",
                active
                  ? "bg-[var(--ks-chalk)] font-bold text-[var(--ks-basalt)]"
                  : "bg-transparent font-semibold text-[var(--ks-chalk)] hover:underline",
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    )
  }

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
