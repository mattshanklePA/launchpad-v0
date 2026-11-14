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
