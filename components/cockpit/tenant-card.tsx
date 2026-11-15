"use client"

// NL-11 (#312): drop-in for components/ui/card's Card on pages restyled for
// ES2. Under features.cockpitLook it is square with no shadow; every other
// tenant gets the unchanged Card. Does not edit components/ui/card.tsx.

import * as React from "react"
import { Card } from "@/components/ui/card"
import { getTenant } from "@/lib/tenant"
import { cn } from "@/lib/utils"

export const TenantCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    if (getTenant().features.cockpitLook) {
      return (
        <div
          ref={ref}
          className={cn("border border-[var(--ks-limestone-dark)] bg-white text-card-foreground", className)}
          {...props}
        />
      )
    }
    return <Card ref={ref} className={className} {...props} />
  },
)
TenantCard.displayName = "TenantCard"
