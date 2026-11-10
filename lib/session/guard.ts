// requireSession — the one server helper every route handler and server action
// uses (SEC-1). 401 = no/invalid/expired/tampered cookie, 403 = valid session
// but wrong role.
//
//   Route handler:   const g = requireSession(req, { role: "admin" })
//                    if (!g.ok) return g.response
//   Server action:   const session = requireActionSession({ role: REVIEWER_UP })

import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Role } from "@/lib/auth"
import { SESSION_COOKIE_NAME, verifySession, type SessionClaims } from "@/lib/session/token"

export const REVIEWER_UP: Role[] = ["reviewer", "admin"]
export const ADMIN_ONLY: Role[] = ["admin"]

export type GuardOptions = { role?: Role | Role[] }
export type GuardResult =
  | { ok: true; session: SessionClaims }
  | { ok: false; response: NextResponse }

export class SessionError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Unauthorized: sign in required" : "Forbidden: insufficient role")
    this.name = "SessionError"
  }
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(";")) {
    const i = part.indexOf("=")
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim()
  }
  return undefined
}

function check(session: SessionClaims | null, opts: GuardOptions): 401 | 403 | null {
  if (!session) return 401
  if (opts.role) {
    const allowed = Array.isArray(opts.role) ? opts.role : [opts.role]
    if (!allowed.includes(session.role)) return 403
  }
  return null
}

export function requireSession(req: Request, opts: GuardOptions = {}): GuardResult {
  const session = verifySession(readCookie(req.headers.get("cookie"), SESSION_COOKIE_NAME))
  const failure = check(session, opts)
  if (failure) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: failure === 401 ? "Sign in required" : "You do not have access to this" },
        { status: failure, headers: { "Cache-Control": "no-store" } },
      ),
    }
  }
  return { ok: true, session: session as SessionClaims }
}

/** For server actions (no Request in hand): reads the cookie via next/headers; throws SessionError. */
export function requireActionSession(opts: GuardOptions = {}): SessionClaims {
  const session = verifySession(cookies().get(SESSION_COOKIE_NAME)?.value)
  const failure = check(session, opts)
  if (failure) throw new SessionError(failure)
  return session as SessionClaims
}
