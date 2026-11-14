// Where a person lands after signing in with no `next` (F5-3, #320). With the
// portfolio report on (ES2), an admin with no program office of their own, the
// enterprise-wide view, lands on /report. Everyone else, and every other
// tenant, lands on /home. /home keeps working for everyone.

import type { TenantConfig } from "@/lib/tenant"
import { hasDepartmentTransparency } from "@/lib/bureauSignoff"

export function landingPathFor(
  session: { role: string; businessUnit?: string } | null,
  tenant: TenantConfig,
): "/report" | "/home" {
  return tenant.features.portfolioReport && hasDepartmentTransparency(session) ? "/report" : "/home"
}
