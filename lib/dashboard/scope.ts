// Command Center dashboard scope — resolves which slice of the org hierarchy
// (department / bureau / office / personal) a signed-in viewer's dashboard
// cards should be computed over, and exposes the org hierarchy itself.
//
// Mirrors `visibleSubmissions`'s roll-down rule (lib/reviewWorkflow.ts)
// exactly, so a Command Center card and the existing pipeline/roll-up views
// never disagree about what's "in scope" for the same viewer: a submitter is
// personal; a reviewer, or an admin whose businessUnit isn't "os", is
// bureau-scoped (office-scoped once `office` is set); the Office of the
// Secretary and any viewer with no businessUnit (a department admin) get the
// department roll-up. Like `visibleSubmissions`, this is a view-model
// convenience, not a security boundary (see docs/ARCHITECTURE.md's RLS
// posture note).

import type { Session } from "@/lib/auth"
import { getTenant, type TenantConfig } from "@/lib/tenant"

export type DashboardScopeLevel = "department" | "bureau" | "office" | "personal"

export type DashboardScope =
  | { level: "personal"; email: string }
  | { level: "department" }
  | { level: "bureau"; businessUnit: string }
  | { level: "office"; businessUnit: string; office: string }

export type HierarchyOffice = { value: string; label: string }
export type HierarchyBureau = { value: string; label: string; offices: HierarchyOffice[] }
export type OrgHierarchy = { bureaus: HierarchyBureau[] }

/** The full department -> bureau -> office tree the active tenant declares. */
export function getHierarchy(tenant: TenantConfig = getTenant()): OrgHierarchy {
  return {
    bureaus: tenant.unit.options.map((bureau) => ({
      value: bureau.value,
      label: bureau.label,
      offices: (bureau.offices || []).map((office) => ({ value: office.value, label: office.label })),
    })),
  }
}

/** Resolves a signed-in viewer's dashboard scope from their session. */
export function getDashboardScope(session: Session | null): DashboardScope {
  if (!session) return { level: "department" }
  if (session.role === "submitter") return { level: "personal", email: session.email }

  const bureauScoped = session.role === "reviewer" || (session.role === "admin" && session.businessUnit !== "os")
  if (bureauScoped && session.businessUnit) {
    return session.office
      ? { level: "office", businessUnit: session.businessUnit, office: session.office }
      : { level: "bureau", businessUnit: session.businessUnit }
  }
  return { level: "department" }
}

/**
 * The bureau (and office, when scoped) constraint a scope's cards must apply.
 * `[]` for "department" (no constraint — every bureau is in view) and
 * "personal" (constrained by owner email instead, see `getDashboardScope`'s
 * submitter case — the same distinction `visibleSubmissions` draws).
 */
export function getScopeSubtree(scope: DashboardScope): { businessUnit: string; office?: string }[] {
  switch (scope.level) {
    case "department":
    case "personal":
      return []
    case "bureau":
      return [{ businessUnit: scope.businessUnit }]
    case "office":
      return [{ businessUnit: scope.businessUnit, office: scope.office }]
  }
}

const LEVEL_RANK: Record<DashboardScopeLevel, number> = { department: 0, bureau: 1, office: 2, personal: 3 }

/**
 * Whether a scope is broad enough to render a card aggregated at `level` —
 * department is the broadest (sees every level's cards down to personal),
 * personal is the narrowest (only ever sees its own level).
 */
export function isLevelAllowed(scope: DashboardScope, level: DashboardScopeLevel): boolean {
  return LEVEL_RANK[scope.level] <= LEVEL_RANK[level]
}
