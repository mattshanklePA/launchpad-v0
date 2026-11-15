// Where to send someone who may not see a page, or null if they may.
//
// Signed out: the login page, keeping where they were going.
// Signed in without the role: their home page. Never the login page: the login
// page sends a signed-in person straight on to `next`, so sending them there
// bounced them between the two pages forever and froze the browser (found on
// the ES2 preview, 14 Nov). Shared by every site.

type Role = "admin" | "reviewer" | "submitter"

export function accessRedirect(
  session: { role: string } | null,
  requireRole: readonly Role[] | undefined,
  pathname: string,
): string | null {
  if (!session) return `/login?next=${encodeURIComponent(pathname || "/")}`
  if (requireRole && !requireRole.includes(session.role as Role)) {
    return pathname === "/home" ? null : "/home"
  }
  return null
}
