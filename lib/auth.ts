// Demo-grade auth + user management for USPTO LaunchPad.
// localStorage-backed — NOT secure for real use (plaintext passwords).
// Sufficient to demonstrate role separation in demos.

export type Role = "admin" | "reviewer" | "submitter"

export type User = {
  id: string
  email: string
  name: string
  role: Role
  password: string // demo only — stored plaintext
  createdAt: string
}

export type Session = {
  userId: string
  email: string
  name: string
  role: Role
  loggedInAt: string
}

const USERS_KEY = "launchpad-users"
const SESSION_KEY = "launchpad-session"

// ─── Seed admin user on first load ───
const SEED_ADMIN: User = {
  id: "admin-matt-001",
  email: "matt.shankle@uspto.gov",
  name: "Matt Shankle",
  role: "admin",
  password: "uspto12345!",
  createdAt: "2026-01-01T00:00:00.000Z",
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function ensureSeeded(): void {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify([SEED_ADMIN]))
      return
    }
    const users = JSON.parse(raw) as User[]
    // If admin user is missing for any reason, re-add
    if (!users.some((u) => u.email === SEED_ADMIN.email)) {
      users.unshift(SEED_ADMIN)
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
    }
  } catch (error) {
    console.error("ensureSeeded failed:", error)
    localStorage.setItem(USERS_KEY, JSON.stringify([SEED_ADMIN]))
  }
}

export function getAllUsers(): User[] {
  if (typeof window === "undefined") return []
  ensureSeeded()
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getUserByEmail(email: string): User | null {
  const all = getAllUsers()
  const lower = email.trim().toLowerCase()
  return all.find((u) => u.email.toLowerCase() === lower) ?? null
}

export function addUser(input: { email: string; name: string; role: Role; password: string }): User | { error: string } {
  if (typeof window === "undefined") return { error: "Server-side, no localStorage" }
  const email = input.email.trim().toLowerCase()
  if (!email || !email.includes("@")) return { error: "Invalid email" }
  if (!input.name.trim()) return { error: "Name is required" }
  if (!input.password || input.password.length < 6) return { error: "Password must be at least 6 characters" }

  const existing = getUserByEmail(email)
  if (existing) return { error: "A user with that email already exists" }

  const user: User = {
    id: genId("user"),
    email,
    name: input.name.trim(),
    role: input.role,
    password: input.password,
    createdAt: new Date().toISOString(),
  }
  const all = getAllUsers()
  all.push(user)
  localStorage.setItem(USERS_KEY, JSON.stringify(all))
  return user
}

export function removeUser(id: string): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "Server-side" }
  const all = getAllUsers()
  const target = all.find((u) => u.id === id)
  if (!target) return { ok: false, error: "User not found" }
  // Don't allow deleting the seed admin (safety)
  if (target.email === SEED_ADMIN.email) {
    return { ok: false, error: "Cannot delete the primary admin account" }
  }
  const filtered = all.filter((u) => u.id !== id)
  localStorage.setItem(USERS_KEY, JSON.stringify(filtered))
  // If deleted user is currently logged in, log them out
  const session = getSession()
  if (session && session.userId === id) {
    logout()
  }
  return { ok: true }
}

export function updateUserRole(id: string, role: Role): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "Server-side" }
  const all = getAllUsers()
  const target = all.find((u) => u.id === id)
  if (!target) return { ok: false, error: "User not found" }
  if (target.email === SEED_ADMIN.email && role !== "admin") {
    return { ok: false, error: "Cannot demote the primary admin account" }
  }
  target.role = role
  localStorage.setItem(USERS_KEY, JSON.stringify(all))
  // If updated user is logged in, refresh session
  const session = getSession()
  if (session && session.userId === id) {
    setSession({ ...session, role })
  }
  return { ok: true }
}

// ─── Session ───
export function getSession(): Session | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function setSession(s: Session): void {
  if (typeof window === "undefined") return
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

export function login(email: string, password: string): { ok: boolean; error?: string; session?: Session } {
  if (typeof window === "undefined") return { ok: false, error: "Server-side" }
  ensureSeeded()
  const user = getUserByEmail(email)
  if (!user) return { ok: false, error: "No account found for that email" }
  if (user.password !== password) return { ok: false, error: "Incorrect password" }
  const session: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    loggedInAt: new Date().toISOString(),
  }
  setSession(session)
  return { ok: true, session }
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
