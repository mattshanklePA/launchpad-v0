"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ensureSeeded, getSession, type Session } from "@/lib/auth"
import { DataProvider, useDataProvider } from "@/components/data-provider"

type Props = {
  children: ReactNode
  /** Optional: restrict to specific roles. Omit to allow any authenticated user. */
  requireRole?: Array<"admin" | "reviewer" | "submitter">
}

/**
 * Client-side auth gate. Redirects to /login if there's no session,
 * preserving the original path in `?next=` so the user lands back where
 * they tried to go after signing in.
 *
 * Wraps children in DataProvider so authenticated pages share submissions,
 * users, and form config across all visitors via Supabase.
 */
export function RequireAuth({ children, requireRole }: Props) {
  return (
    <DataProvider>
      <RequireAuthInner requireRole={requireRole}>{children}</RequireAuthInner>
    </DataProvider>
  )
}

function RequireAuthInner({ children, requireRole }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { loaded } = useDataProvider()
  const [, setSession] = useState<Session | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // No-op in the Supabase world — admin seed lives in the SQL migration.
    ensureSeeded()
    const s = getSession()
    const next = encodeURIComponent(pathname || "/")
    if (!s) {
      router.replace(`/login?next=${next}`)
      return
    }
    if (requireRole && !requireRole.includes(s.role)) {
      router.replace(`/login?next=${next}`)
      return
    }
    setSession(s)
    setAuthChecked(true)
  }, [router, pathname, requireRole])

  // Wait for both auth check AND data load before showing the page so the
  // app doesn't briefly render with empty cache (which would, e.g., show
  // every field as enabled for a moment before toggle config arrives).
  if (!authChecked || !loaded) {
    return <div className="min-h-screen bg-gray-50" />
  }
  return <>{children}</>
}
