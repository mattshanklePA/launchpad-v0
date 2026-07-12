"use client"

// Submitter-facing "required by OMB/Department" badge (issue #60). Looks up
// `fieldKey` in the shared field registry so the level and the why-tooltip
// (`reasonToInclude`) always match the admin Form Configuration panel's
// badges (components/admin/form-config-panel.tsx) instead of drifting out of
// sync with a second, hand-maintained copy — renders nothing for an ordinary
// bureau-level field.

import { Landmark, Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { FIELD_REGISTRY_BY_KEY, fieldLevel } from "@/lib/fieldRegistry"
import type { FormData } from "@/lib/steps"

export function FieldRequirementBadge({ fieldKey }: { fieldKey: keyof FormData | string }) {
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  if (!def) return null
  const level = fieldLevel(def)
  if (level !== "omb" && level !== "department") return null

  const Icon = level === "omb" ? Landmark : Building2
  const label = level === "omb" ? "Required (OMB)" : "Required (Department)"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="ml-2 inline-flex items-center align-middle text-[10px] bg-amber-50 border-amber-300 text-amber-800 cursor-help"
          >
            <Icon className="h-2.5 w-2.5 mr-1" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{def.reasonToInclude}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
