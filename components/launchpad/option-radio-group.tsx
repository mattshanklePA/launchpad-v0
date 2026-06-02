"use client"

import { cn } from "@/lib/utils"

type Option = { value: string; label: string }

// Button-card radio group used for the wizard's short range/scale fields
// (users impacted, cost savings, timeline, complexity). Shows every option at
// once — no dropdown — which suits 3-4 choices and reads faster for reviewers.
export function OptionRadioGroup({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value?: string
  onChange: (value: string) => void
  options: Option[]
  ariaLabel?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
    >
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            type="button"
            key={opt.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center justify-center rounded-md border px-3 py-2 text-sm transition-colors",
              selected
                ? "border-uspto-blue-primary bg-uspto-blue-primary/5 font-medium text-uspto-blue-primary"
                : "border-input bg-background text-foreground hover:bg-muted/50",
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
