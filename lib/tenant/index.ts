import type { TenantConfig } from "./types"
import { uspto } from "./uspto"
import { dow } from "./dow"
import { doc } from "./doc"
import { es2 } from "./es2"

const TENANTS: Record<string, TenantConfig> = { uspto, dow, doc, es2 }

// Every registered tenant, for checks that must hold across all of them (e.g.
// the tier-label convention pinned in tenant.test.ts). Derived from TENANTS so
// registering a new tenant above automatically brings it under those checks.
export const ALL_TENANTS: TenantConfig[] = Object.values(TENANTS)

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

// Slug of the tenant's own product name, for files this deployment hands a
// user (lib/pdfGenerator.ts's submission PDF). "LaunchPad" is USPTO's and
// DoW's product name, not a universal one — hardcoding it named a Keystone
// deployment's downloads after another org's product (ES2-11).
export function tenantFilePrefix(tenant: TenantConfig): string {
  return tenant.productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export type { TenantConfig } from "./types"
