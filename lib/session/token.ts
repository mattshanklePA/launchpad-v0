// Signed session token (SEC-1). Pure + server-only: node:crypto HMAC-SHA256,
// no I/O. The browser never sees the signing key; it only carries the opaque
// token in an httpOnly cookie.
//
// Format: base64url(JSON claims) + "." + base64url(HMAC(claims-part)).
//
// SSO seam: the ONLY step that should change when an identity provider is
// connected is whatever calls signSession() (today /api/users/login). Every
// reader goes through verifySession() / requireSession() in lib/session/guard.ts.

import { createHmac, timingSafeEqual } from "node:crypto"
import type { Role } from "@/lib/auth"

export const SESSION_COOKIE_NAME = "keystone_session"
export const SESSION_TTL_SECONDS = 8 * 60 * 60 // one working day

const FALLBACK_LABEL = "keystone-session-v1"
const ROLES: readonly string[] = ["admin", "reviewer", "submitter"]

export type SessionClaims = {
  userId: string
  email: string
  name: string
  role: Role
  jobRole?: string | null
  businessUnit?: string | null
  office?: string | null
  /** Issued-at / expiry, epoch seconds. */
  iat: number
  exp: number
}

export type SessionInput = Omit<SessionClaims, "iat" | "exp">

let warned = false
export function resetSigningKeyWarningForTests(): void {
  warned = false
}

/**
 * KEYSTONE_SESSION_SECRET when set. Otherwise a key derived from the existing
 * server-only SUPABASE_SERVICE_ROLE_KEY (HMAC with a fixed label, so the raw
 * service key is never used directly as the signing key), with one warning.
 * Null when neither exists — callers fail closed.
 */
export function resolveSigningKey(): Buffer | null {
  const secret = process.env.KEYSTONE_SESSION_SECRET
  if (secret) return Buffer.from(secret, "utf8")

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    if (!warned) {
      warned = true
      console.warn(
        "[session] KEYSTONE_SESSION_SECRET is not set; deriving the session signing key from the server-side service key. Set KEYSTONE_SESSION_SECRET for this tenant.",
      )
    }
    return createHmac("sha256", serviceKey).update(FALLBACK_LABEL).digest()
  }

  console.error("[session] No signing key available: set KEYSTONE_SESSION_SECRET.")
  return null
}

function mac(key: Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest()
}

export function signSession(input: SessionInput, nowMs: number = Date.now()): string {
  const key = resolveSigningKey()
  if (!key) throw new Error("Session signing key is not configured")
  const iat = Math.floor(nowMs / 1000)
  const claims: SessionClaims = { ...input, iat, exp: iat + SESSION_TTL_SECONDS }
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url")
  return `${payload}.${mac(key, payload).toString("base64url")}`
}

/** Claims for a genuine, unexpired token; null for anything else. Never throws. */
export function verifySession(
  token: string | undefined | null,
  nowMs: number = Date.now(),
): SessionClaims | null {
  try {
    if (!token) return null
    const parts = token.split(".")
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null
    const key = resolveSigningKey()
    if (!key) return null

    const expected = mac(key, parts[0])
    const given = Buffer.from(parts[1], "base64url")
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

    const claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as SessionClaims
    if (
      !claims ||
      typeof claims.userId !== "string" ||
      typeof claims.exp !== "number" ||
      !ROLES.includes(claims.role)
    ) {
      return null
    }
    if (claims.exp * 1000 <= nowMs) return null
    return claims
  } catch {
    return null
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  }
}
