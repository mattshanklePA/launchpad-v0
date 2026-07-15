"use client"

// Hierarchy entity tree — Department -> Bureau -> Office navigation, driven
// by CC-1's org hierarchy (getHierarchy in lib/dashboard/scope.ts). A
// lightweight custom tree: the org taxonomy tops out at a couple dozen
// bureaus with a handful of offices each, well short of what would justify
// pulling in react-arborist. Presentation only — selecting a node calls back
// to the caller; CC-4 wires that into real scope navigation.

import { useState } from "react"
import { ChevronDown, ChevronRight, Building2, Landmark } from "lucide-react"
import { cn } from "@/lib/utils"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import type { OrgHierarchy } from "@/lib/dashboard/scope"
import { isBureauSelected, isOfficeSelected, type EntitySelection } from "./entity-tree-data"

export type EntityTreeProps = {
  hierarchy: OrgHierarchy
  selected?: EntitySelection | null
  onSelect?: (selection: EntitySelection | null) => void
  tenant?: TenantConfig
}

function nodeButtonClasses(active: boolean) {
  return cn(
    "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
    active ? "bg-accent font-medium text-accent-foreground" : "text-foreground",
  )
}

export function EntityTree({ hierarchy, selected, onSelect, tenant = getTenant() }: EntityTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (value: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })

  return (
    <div className="space-y-0.5">
      <button type="button" onClick={() => onSelect?.(null)} className={nodeButtonClasses(!selected)}>
        <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
        {tenant.orgName}
      </button>
      <div className="ml-3 space-y-0.5 border-l pl-2">
        {hierarchy.bureaus.map((bureau) => {
          const hasOffices = bureau.offices.length > 0
          const isExpanded = expanded.has(bureau.value)
          return (
            <div key={bureau.value}>
              <button
                type="button"
                onClick={() => {
                  onSelect?.({ businessUnit: bureau.value })
                  if (hasOffices) toggle(bureau.value)
                }}
                className={nodeButtonClasses(isBureauSelected(bureau, selected))}
              >
                {hasOffices ? (
                  isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )
                ) : (
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                {bureau.label}
              </button>
              {hasOffices && isExpanded && (
                <div className="ml-3 space-y-0.5 border-l pl-2">
                  {bureau.offices.map((office) => (
                    <button
                      key={office.value}
                      type="button"
                      onClick={() => onSelect?.({ businessUnit: bureau.value, office: office.value })}
                      className={nodeButtonClasses(isOfficeSelected(bureau, office.value, selected))}
                    >
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {office.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { EntitySelection } from "./entity-tree-data"
