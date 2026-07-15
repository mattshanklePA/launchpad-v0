// Pure selection-matching helpers for the entity tree, pulled out of
// entity-tree.tsx so they're unit-testable without rendering React.

import type { HierarchyBureau } from "@/lib/dashboard/scope"

export type EntitySelection = { businessUnit: string; office?: string }

/** Whether a bureau node (not one of its offices) is the active selection. */
export function isBureauSelected(bureau: HierarchyBureau, selected?: EntitySelection | null): boolean {
  return !!selected && selected.businessUnit === bureau.value && !selected.office
}

/** Whether one of a bureau's office nodes is the active selection. */
export function isOfficeSelected(
  bureau: HierarchyBureau,
  officeValue: string,
  selected?: EntitySelection | null,
): boolean {
  return !!selected && selected.businessUnit === bureau.value && selected.office === officeValue
}
