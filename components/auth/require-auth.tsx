"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ensureSeeded, getSession, type Session } from "@/lib/auth"

type Props = {
  children: ReactNode
  /** Optional: restrict to specific roles. Omit to allow any authenticated user. */
  requireRole?: Array<"admin" | "reviewer" | "submitter">
}

/**
 * Client-side auth gate. Redirects to /login if there's no session,
 * preserving the original path in `?next=` so the user lands back where
 * they tried to go after signing in. Hides children until the check
 * completes to prevent a flash of unauthorized content.
 */
export function RequireAuth({ children, requireRole }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
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
    setChecked(true)
  }, [router, pathname, requireRole])

  if (!checked) {
    return <div className="min-h-screen bg-gray-50" />
  }
  return <>{children}</>
}
