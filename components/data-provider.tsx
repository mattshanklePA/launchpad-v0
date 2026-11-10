"use client"

// DataProvider — top-level context that fetches all shared app data
// (submissions, users, form config) from the API once on mount, populates
// the module-level cache (lib/dataCache.ts), and exposes a refetch function
// for mutations to call after they succeed.
//
// Layout placement: wrap the layouts that need shared data — landing,
// /submit, /admin. Login and confirmation pages don't strictly need it but
// it's cheap to include everywhere.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import {
  markCacheLoaded,
  setCachedFormConfig,
  setCachedSubmissions,
  setCachedUsers,
  subscribeToCache,
  isCacheLoaded,
  isSubmissionsTruncated,
} from "@/lib/dataCache"
import { getSession, syncSessionFromServer, SESSION_CHANGED_EVENT } from "@/lib/auth"

type DataContextValue = {
  loaded: boolean
  /** Force a fresh fetch of all shared data. Call after a mutation succeeds. */
  refetch: () => Promise<void>
  /** Fetch only submissions — cheaper than full refetch when only that changed. */
  refetchSubmissions: () => Promise<void>
  /** Fetch only users. */
  refetchUsers: () => Promise<void>
  /** Fetch only form config. */
  refetchFormConfig: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

async function fetchJson<T = unknown>(url: string): Promise<T | null> {
  try {
    // Cache-bust with a unique timestamp param so no browser/CDN layer can
    // serve a stale copy of shared config or submission data.
    const sep = url.includes("?") ? "&" : "?"
    const bustedUrl = `${url}${sep}_=${Date.now()}`
    const res = await fetch(bustedUrl, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    })
    if (!res.ok) {
      console.error(`Fetch failed for ${url}: ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (error) {
    console.error(`Fetch threw for ${url}:`, error)
    return null
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [, forceRender] = useState(0)
  const [loaded, setLoaded] = useState(isCacheLoaded())

  // Re-render on any cache change so consumers reading via sync helpers see updates.
  useEffect(() => {
    return subscribeToCache(() => forceRender((n) => n + 1))
  }, [])

  const refetchSubmissions = useCallback(async () => {
    const json = await fetchJson<{ submissions: any[]; truncated?: boolean }>("/api/submissions")
    if (json?.submissions) setCachedSubmissions(json.submissions, json.truncated === true)
  }, [])

  const refetchUsers = useCallback(async () => {
    const json = await fetchJson<{ users: any[] }>("/api/users")
    if (json?.users) setCachedUsers(json.users)
  }, [])

  const refetchFormConfig = useCallback(async () => {
    const json = await fetchJson<{ config: any }>("/api/form-config")
    if (json?.config) setCachedFormConfig(json.config)
  }, [])

  const refetch = useCallback(async () => {
    await Promise.all([refetchSubmissions(), refetchUsers(), refetchFormConfig()])
  }, [refetchSubmissions, refetchUsers, refetchFormConfig])

  // Bootstrap on mount: seed-if-empty, then fetch everything in parallel.
  // Every data route now requires the signed session cookie (SEC-1), so the
  // bootstrap first confirms the session with the server and only then loads
  // data. Signed out → nothing to fetch; the login event re-runs this.
  useEffect(() => {
    let cancelled = false
    const bootstrap = async (reloadIfSessionLost: boolean) => {
      const hadLocalSession = !!getSession()
      const session = await syncSessionFromServer()
      if (!session) {
        // A leftover display cache with no valid cookie behind it (expired,
        // tampered, or from before cookies existed): reload once so pages
        // re-evaluate against the cleared session. No loop: the second load
        // has no cache to lose.
        if (reloadIfSessionLost && hadLocalSession) {
          window.location.reload()
          return
        }
      } else {
        if (session.role === "admin") {
          // Idempotent — only seeds if submissions table is empty. Admin-only
          // on the server, so only attempt it for an admin.
          await fetch("/api/seed", { method: "POST" }).catch(() => null)
        }
        await refetch()
      }
      if (!cancelled) {
        markCacheLoaded()
        setLoaded(true)
      }
    }
    bootstrap(true)
    const onSessionChanged = () => {
      bootstrap(false)
    }
    window.addEventListener(SESSION_CHANGED_EVENT, onSessionChanged)
    return () => {
      cancelled = true
      window.removeEventListener(SESSION_CHANGED_EVENT, onSessionChanged)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: DataContextValue = {
    loaded,
    refetch,
    refetchSubmissions,
    refetchUsers,
    refetchFormConfig,
  }

  return (
    <DataContext.Provider value={value}>
      {isSubmissionsTruncated() && (
        <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Showing the most recent records only. The list reached its safety limit, so older
          records are not included in these counts.
        </div>
      )}
      {children}
    </DataContext.Provider>
  )
}

export function useDataProvider(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) {
    throw new Error("useDataProvider must be used within a <DataProvider>")
  }
  return ctx
}
