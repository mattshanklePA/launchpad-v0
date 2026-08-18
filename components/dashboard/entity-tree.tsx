"use client"

// Hierarchy entity tree — Department -> Bureau -> Office navigation, driven
// by CC-1's org hierarchy (getHierarchy in lib/dashboard/scope.ts). A
// lightweight custom tree: the org taxonomy tops out at a couple dozen
// bureaus with a handful of offices each, well short of what would justify
// pulling in react-arborist. Presentation only — selecting a node calls back
// to the caller; CC-4 wires that into real scope navigation.

import { useState } from "react"
import { ChevronDown, ChevronRight, Building2, Landmark } from "lucide-react"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import type { OrgHierarchy } from "@/lib/dashboard/scope"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from "@/components/ui/sidebar"
import { SIDEBAR_ITEM_TEXT_CLASS } from "@/lib/layoutTokens"
import { isBureauSelected, isOfficeSelected, type EntitySelection } from "./entity-tree-data"

export type EntityTreeProps = {
  hierarchy: OrgHierarchy
  selected?: EntitySelection | null
  onSelect?: (selection: EntitySelection | null) => void
  tenant?: TenantConfig
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
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton isActive={!selected} tooltip={tenant.orgName} onClick={() => onSelect?.(null)} className={SIDEBAR_ITEM_TEXT_CLASS}>
          <Landmark />
          <span>{tenant.orgName}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {hierarchy.bureaus.map((bureau) => {
        const hasOffices = bureau.offices.length > 0
        const isExpanded = expanded.has(bureau.value)
        return (
          <SidebarMenuItem key={bureau.value}>
            <SidebarMenuButton
              isActive={isBureauSelected(bureau, selected)}
              tooltip={bureau.label}
              onClick={() => {
                onSelect?.({ businessUnit: bureau.value })
                if (hasOffices) toggle(bureau.value)
              }}
              className={SIDEBAR_ITEM_TEXT_CLASS}
            >
              {hasOffices ? isExpanded ? <ChevronDown /> : <ChevronRight /> : <Building2 />}
              <span>{bureau.label}</span>
            </SidebarMenuButton>
            {hasOffices && isExpanded && (
              <SidebarMenuSub>
                {bureau.offices.map((office) => (
                  <SidebarMenuSubItem key={office.value}>
                    <SidebarMenuSubButton
                      isActive={isOfficeSelected(bureau, office.value, selected)}
                      onClick={() => onSelect?.({ businessUnit: bureau.value, office: office.value })}
                      className={SIDEBAR_ITEM_TEXT_CLASS}
                    >
                      <Building2 />
                      <span>{office.label}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export type { EntitySelection } from "./entity-tree-data"
