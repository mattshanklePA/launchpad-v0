// Demo-grade auth — now backed by Supabase via /api/users* routes.
//
// Sessions remain in localStorage (per-user, not shared) so a login on
// Matt's laptop doesn't show as logged in on Ramesh's laptop. User records
// live in Supabase so admin lists + user management are consistent across
// all visitors.
//
// Production work item: swap the plaintext password flow for Supabase Auth
// (magic links, password hashing, session cookies, OAuth, etc.). Not in
// scope for the Wednesday demo.

import {
  getCachedUsers,
  getCachedUserByEmail,
  getCachedUserById,
  setCachedUsers,
} from "@/lib/dataCache"

// The seeded primary admin, protected from destructive role changes and
// deletion. An identity constant, never display text — kept here so the API
// route and the admin UI can't drift to two different addresses.
export const PRIMARY_ADMIN_EMAIL = "matt.shankle@uspto.gov"

export type Role = "admin" | "reviewer" | "submitter"

// Job role from the active tenant's `getTenant().submitterRoles` (e.g.
// "patent_examiner" for USPTO, "contracting_officer" for es2), or "" for not
// set. A free string, like `businessUnit` below, rather than a per-tenant
// union, since the set of valid values differs by tenant — a USPTO-shaped
// union left es2 with no role it could store (ES2-13).
export type JobRole = string

// Bureau/business-unit code from the active tenant's `getTenant().unit.options`
// (e.g. "patents" for USPTO, "census" for DoC). A free string, like `office`
// below, rather than a per-tenant union, since the set of valid values differs
// by tenant.
export type BusinessUnit = string

export type User = {
  id: string
  email: string
  name: string
  role: Role
  // password is no longer exposed via the API — `password` here is only set
  // during the initial create flow and then never round-trips back to the client.
  password?: string
  createdAt: string
  jobRole?: JobRole
  businessUnit?: BusinessUnit
  // Office sub-level under businessUnit (DoC bureaus that declare offices).
  // A free string like submitterSubOffice, rather than a per-tenant union,
  // since only some bureaus define offices.
  office?: string
}

export type Session = {
  userId: string
  email: string
  name: string
  role: Role
  loggedInAt: string
  jobRole?: JobRole
  businessUnit?: BusinessUnit
  office?: string
}

const SESSION_KEY = "launchpad-session"

// ─── ensureSeeded ─────────────────────────────────────────────
// In the old localStorage world this seeded the admin user on first load.
// Now the admin user is seeded by the SQL migration in Supabase. This is a
// no-op kept for API compatibility so callers don't break.
export function ensureSeeded(): void {
  // Intentional no-op. Admin seeded in Supabase via SQL migration.
}

// ─── Synchronous reads from cache (populated by DataProvider) ───
export function getAllUsers(): User[] {
  return getCachedUsers().map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    jobRole: (u.jobRole as JobRole) || undefined,
    businessUnit: (u.businessUnit as BusinessUnit) || undefined,
    office: u.office || undefined,
  }))
}

export function getUserByEmail(email: string): User | null {
  const u = getCachedUserByEmail(email)
  if (!u) return null
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    jobRole: (u.jobRole as JobRole) || undefined,
    businessUnit: (u.businessUnit as BusinessUnit) || undefined,
    office: u.office || undefined,
  }
}

// ─── Mutations (async — return promise; caller should refetch users) ───

export async function addUser(input: {
  email: string
  name: string
  role: Role
  password: string
  jobRole?: JobRole
  businessUnit?: BusinessUnit
  office?: string
}): Promise<User | { error: string }> {
  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const body = await res.json()
    if (!res.ok) return { error: body.error || "Failed to create user" }
    return body.user as User
  } catch (error) {
    return { error: String(error) }
  }
}

export async function removeUser(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.error || "Failed to delete user" }
    // If the deleted user is the active session, log them out client-side.
    const session = getSession()
    if (session && session.userId === id) logout()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export async function updateUserRole(
  id: string,
  role: Role,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.error || "Failed to update role" }
    // Sync the session if it's the active user.
    const session = getSession()
    if (session && session.userId === id) {
      setSession({ ...session, role })
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export async function updateUserProfile(
  id: string,
  patch: { jobRole?: JobRole; businessUnit?: BusinessUnit; office?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.error || "Failed to update profile" }
    // Sync session if it's the active user.
    const session = getSession()
    if (session && session.userId === id) {
      setSession({
        ...session,
        jobRole: (patch.jobRole as JobRole) ?? session.jobRole,
        businessUnit: (patch.businessUnit as BusinessUnit) ?? session.businessUnit,
        office: patch.office ?? session.office,
      })
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

// ─── Session (still localStorage — inherently per-user) ───
export function getSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    // Self-heal: if profile fields are missing from session but present on
    // the cached user record, backfill so wizard auto-fill works without
    // forcing a re-login.
    if (session.jobRole === undefined || session.businessUnit === undefined || session.office === undefined) {
      const user = getCachedUserById(session.userId)
      if (user && (user.jobRole !== undefined || user.businessUnit !== undefined || user.office !== undefined)) {
        const patched: Session = {
          ...session,
          jobRole: (user.jobRole as JobRole) ?? session.jobRole,
          businessUnit: (user.businessUnit as BusinessUnit) ?? session.businessUnit,
          office: user.office ?? session.office,
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(patched))
        return patched
      }
    }
    return session
  } catch {
    return null
  }
}

function setSession(s: Session): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

export async function login(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string; session?: Session }> {
  if (typeof window === "undefined") return { ok: false, error: "Server-side" }
  try {
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const body = await res.json()
    if (!res.ok || !body.session) {
      return { ok: false, error: body.error || "Login failed" }
    }
    setSession(body.session as Session)
    return { ok: true, session: body.session as Session }
  } catch (error) {
    return { ok: false, error: String(error) }
  }
}

export function logout(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
}

export function hasAdminAccess(session: Session | null): boolean {
  return !!session && (session.role === "admin" || session.role === "reviewer")
}

export function isAdmin(session: Session | null): boolean {
  return !!session && session.role === "admin"
}

// Re-export helper used by form-context.tsx so its self-heal logic still works.
// (Maintaining the old shape so callers don't need to change.)
export { setCachedUsers as _setCachedUsers }
