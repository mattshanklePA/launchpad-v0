// Pure assembly logic for the Bureau/Office Dashboard (CC-7) — the reviewer-
// and bureau/office-scoped analog of department-dashboard-data.ts. Split out
// so it's unit-testable without rendering React, the same pattern every
// other components/dashboard/* piece uses.
//
// Unlike the department dashboard (always department-scoped, free to drill
// into any bureau), this view's base scope is already bureau- or
// office-scoped — the guardrail is that nothing here may ever let a viewer's
// entity-tree selection escape to another bureau. `bureauHierarchy` restricts
// the sidebar tree to just the viewer's own bureau in the first place;
// `resolveBureauDrillScope` re-checks the businessUnit match itself too, so
// the guarantee doesn't depend solely on what the tree happens to render.

import type { TenantConfig } from "@/lib/tenant"
import type { DashboardScope, OrgHierarchy } from "@/lib/dashboard/scope"
import type { EntitySelection } from "./entity-tree-data"

/**
 * The sidebar hierarchy for a bureau/office-scoped viewer — just their own
 * bureau (and its offices, if any), never the full department tree, so the
 * entity tree can't expose another bureau's existence or be used to select
 * one. `{ bureaus: [] }` for any other scope (this view never renders for
 * department/personal scope).
 */
export function bureauHierarchy(scope: DashboardScope, tenant: TenantConfig): OrgHierarchy {
  if (scope.level !== "bureau" && scope.level !== "office") return { bureaus: [] }
  const bureau = tenant.unit.options.find((o) => o.value === scope.businessUnit)
  if (!bureau) return { bureaus: [] }
  return {
    bureaus: [
      {
        value: bureau.value,
        label: bureau.label,
        offices: (bureau.offices || []).map((o) => ({ value: o.value, label: o.label })),
      },
    ],
  }
}

/**
 * Drill-scope resolver for a bureau/office-scoped viewer's entity-tree
 * selection. A bureau-scoped viewer may narrow into one of their own offices;
 * an office-scoped viewer is already at the narrowest level the guardrails
 * allow, so every selection is ignored (acceptance: "an office-scoped
 * reviewer is narrowed to their office"). A selection naming a different
 * business unit is always ignored, regardless of what the tree renders —
 * this is what actually prevents a cross-bureau escape, not just the
 * restricted hierarchy passed to the tree.
 */
export function resolveBureauDrillScope(base: DashboardScope, selection: EntitySelection | null): DashboardScope {
  if (base.level !== "bureau" && base.level !== "office") return base
  if (base.level === "office") return base
  if (!selection || selection.businessUnit !== base.businessUnit) return base
  return selection.office
    ? { level: "office", businessUnit: base.businessUnit, office: selection.office }
    : { level: "bureau", businessUnit: base.businessUnit }
}
