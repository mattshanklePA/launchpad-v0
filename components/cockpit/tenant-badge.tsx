"use client"

// NL-11 (#312): drop-in for components/ui/badge on pages that are restyled for
// ES2. Where features.cockpitLook is on it renders a K6 square tag (tone read
// from the old color classes so call sites keep their meaning); every other
// tenant gets the unchanged Badge. Does not edit components/ui/badge.tsx.

import type { ComponentProps } from "react"
import { Badge } from "@/components/ui/badge"
import { getTenant } from "@/lib/tenant"
import { SquareTag, type SquareTagTone } from "./square-tag"

function toneFor(variant: string | null | undefined, className: string): SquareTagTone {
  if (variant === "destructive" || /\b(red|rose)-/.test(className)) return "alert"
  if (/\b(green|emerald)-/.test(className)) return "healthy"
  if (/\b(amber|yellow|orange)-/.test(className)) return "attention"
  if (/\b(blue|purple|primary|uspto-blue)/.test(className) || variant === "default") return "info"
  return "neutral"
}

export function TenantBadge({ variant, className = "", children, ...rest }: ComponentProps<typeof Badge>) {
  if (getTenant().features.cockpitLook) {
    return <SquareTag tone={toneFor(variant, className)}>{children}</SquareTag>
  }
  return (
    <Badge variant={variant} className={className} {...rest}>
      {children}
    </Badge>
  )
}
