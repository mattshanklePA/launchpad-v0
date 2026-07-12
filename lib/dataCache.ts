// Module-level cache for shared app data.
//
// Why this exists: many existing call sites read state synchronously
// (isFieldEnabled is called inside step component render, getSubmissions is
// called inside DecisionCenter's useEffect, etc.). Moving the canonical
// store to Supabase made all reads inherently async. Rather than refactor
// every consumer into an async hook with Suspense, the DataProvider fetches
// once on mount and writes into this cache. Sync consumers read the cache.
//
// Tradeoff: there's a brief window between app mount and first fetch where
// the cache is empty and reads return defaults (typically "all enabled" or
// "no submissions"). The DataProvider gates children behind a "loaded" state
// so users never see this in-between, but the cache reads themselves don't
// throw if they happen during that gap.

export type CachedSubmission = {
  id: string
  submittedAt: string
  formData: Record<string, unknown>
  status?: string
  ownerEmail?: string
  businessUnit?: string
  office?: string
}

export type CachedUser = {
  id: string
  email: string
  name: string
  role: "admin" | "reviewer" | "submitter"
  jobRole?: string | null
  businessUnit?: string | null
  office?: string | null
  createdAt: string
}

export type CachedFormConfig = {
  enabled: Record<string, boolean>
  // OS/department admin "mandatory for all bureaus" overrides (DoC field-
  // config cascade, issue #57). Absent/empty for USPTO/DoW.
  mandatory?: Record<string, boolean>
  updatedAt: string
  updatedBy?: string | null
}

type Cache = {
  submissions: CachedSubmission[] | null
  users: CachedUser[] | null
  formConfig: CachedFormConfig | null
  loaded: boolean
}

const cache: Cache = {
  submissions: null,
  users: null,
  formConfig: null,
  loaded: false,
}

// Listeners — invoked when any slice of the cache is replaced. The
// DataProvider subscribes to these to trigger re-renders.
type Listener = () => void
const listeners = new Set<Listener>()
function notify() {
  for (const l of listeners) l()
}
export function subscribeToCache(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ─── Submissions ───
export function setCachedSubmissions(submissions: CachedSubmission[]) {
  cache.submissions = submissions
  notify()
}
export function getCachedSubmissions(): CachedSubmission[] {
  return cache.submissions || []
}

// ─── Users ───
export function setCachedUsers(users: CachedUser[]) {
  cache.users = users
  notify()
}
export function getCachedUsers(): CachedUser[] {
  return cache.users || []
}
export function getCachedUserByEmail(email: string): CachedUser | null {
  const target = email.trim().toLowerCase()
  return (cache.users || []).find((u) => u.email.toLowerCase() === target) || null
}
export function getCachedUserById(id: string): CachedUser | null {
  return (cache.users || []).find((u) => u.id === id) || null
}

// ─── Form config ───
export function setCachedFormConfig(cfg: CachedFormConfig) {
  cache.formConfig = cfg
  notify()
}
export function getCachedFormConfig(): CachedFormConfig {
  return cache.formConfig || { enabled: {}, updatedAt: new Date(0).toISOString() }
}

// ─── Loaded state ───
export function markCacheLoaded() {
  cache.loaded = true
  notify()
}
export function isCacheLoaded(): boolean {
  return cache.loaded
}
