"use client"

import type { ReactNode } from "react"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { GLOSSARY, type GlossaryTermKey } from "@/lib/glossary"
import { cn } from "@/lib/utils"

/**
 * Renders a compliance term with a "?" affordance; hovering or focusing it
 * shows the plain-language definition from lib/glossary.ts. The formal term
 * stays on screen unchanged — this only annotates it, never replaces it.
 * Keyboard-accessible and dismissible via Esc (Radix Tooltip primitives).
 */
export function GlossaryTerm({
  term,
  children,
  className,
}: {
  term: GlossaryTermKey
  children?: ReactNode
  className?: string
}) {
  const entry = GLOSSARY[term]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2 cursor-help",
              className,
            )}
          >
            {children ?? entry.term}
            <HelpCircle className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{entry.definition}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
