// Decided records are locked (#271). Pure, no I/O — shared by the server write
// guard (lib/serverAccess.ts) and the record screen so both agree on what
// "locked" means.
//
// A record is locked once it is approved or rejected AND the decision is final:
//  - tenants with a bureau tier (DoC, ES2): final once the bureau signs off.
//    Until then the decision stays reversible ("Reversible until sign-off").
//  - tenants with no bureau tier (USPTO, DoW): nothing is ever signed off
//    separately, so the decision itself is final.

export function isDecisionLocked(formData: Record<string, unknown> | undefined, hasBureauTier: boolean): boolean {
  const status = formData?.reviewStatus
  if (status !== "approved" && status !== "rejected") return false
  return hasBureauTier ? !!formData?.bureauSignoff : true
}

/**
 * Keys that may still change on a locked record (#271, FIX-1). Pure, shared by
 * the server write guard so the rule lives in one place.
 *  - `comments`: always.
 *  - `rationalization`: a reviewer or admin (the group decision is written onto
 *    every member, including ones already decided and signed off).
 *  - `departmentApproval`: only when the tenant has the department tier on AND
 *    the person has department transparency (`hasDepartmentTransparency` in
 *    lib/bureauSignoff.ts, the rule that shows the approval button).
 */
export function lockedWritableKeys(args: {
  role: string
  departmentFinalApproval: boolean
  hasDepartmentTransparency: boolean
}): Set<string> {
  const keys = new Set<string>(["comments"])
  if (args.role === "reviewer" || args.role === "admin") keys.add("rationalization")
  if (args.departmentFinalApproval && args.hasDepartmentTransparency) keys.add("departmentApproval")
  return keys
}
