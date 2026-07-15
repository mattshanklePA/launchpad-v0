import type { TenantConfig } from "./types"
import { uspto } from "./uspto"
import { dow } from "./dow"
import { doc } from "./doc"

const TENANTS: Record<string, TenantConfig> = { uspto, dow, doc }

// Resolve the active tenant from the deployment env. Each org is its own
// Vercel deployment with NEXT_PUBLIC_TENANT set (so it is available on both
// server and client). Defaults to USPTO so existing behavior is unchanged.
export function getTenant(): TenantConfig {
  const id = (process.env.NEXT_PUBLIC_TENANT || "uspto").toLowerCase()
  return TENANTS[id] || uspto
}

// Resolves the org name to reference in wizard copy that names "the
// organization" (e.g. "Align with {orgName} priorities"): the submitter's
// bureau's own name (`UnitOption.label`) when their bureau declares its own
// strategic priorities (`UnitOption.focusAreas`, DoC-only — see
// getFocusAreasForUnit), otherwise the tenant's department-level `orgName`.
// Gating on `focusAreas` (rather than just matching `businessUnit`) is what
// keeps USPTO/DoW unaffected: their `unit.options` are business
// units/commands, not a bureau tier, and never declare `focusAreas`.
export function getOrgNameForUnit(businessUnit?: string | null): string {
  const tenant = getTenant()
  const unit = businessUnit ? tenant.unit.options.find((o) => o.value === businessUnit) : undefined
  return unit?.focusAreas?.length ? unit.label : tenant.orgName
}

// Whether the active tenant has a bureau tier below the department (DoC:
// Department -> Bureau -> Office, see doc.ts). Gated on `focusAreas` — the
// same signal getOrgNameForUnit uses — since USPTO/DoW's `unit.options` are
// business units/commands, not a bureau tier, and never declare `focusAreas`
// on the option itself. Used to gate bureau-specific landing-page copy (e.g.
// "cross-bureau duplicate detection") so it never leaks into USPTO/DoW.
export function tenantHasBureauTier(): boolean {
  return getTenant().unit.options.some((o) => !!o.focusAreas?.length)
}

export type { TenantConfig } from "./types"
