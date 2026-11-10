// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  signSession,
  verifySession,
  resolveSigningKey,
  resetSigningKeyWarningForTests,
  SESSION_TTL_SECONDS,
  type SessionClaims,
} from "@/lib/session/token"

const claims = {
  userId: "user-1",
  email: "a@b.gov",
  name: "A B",
  role: "reviewer" as const,
  jobRole: "patent_examiner",
  businessUnit: "patents",
  office: "oce",
}

const ENV_KEYS = ["KEYSTONE_SESSION_SECRET", "SUPABASE_SERVICE_ROLE_KEY"] as const
let saved: Record<string, string | undefined>

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))
  process.env.KEYSTONE_SESSION_SECRET = "test-secret-test-secret-1234"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-for-tests"
  resetSigningKeyWarningForTests()
})
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  vi.restoreAllMocks()
})

describe("session token sign/verify", () => {
  it("round-trips a valid token", () => {
    const now = 1_700_000_000_000
    const token = signSession(claims, now)
    const out = verifySession(token, now + 1000) as SessionClaims
    expect(out).toMatchObject(claims)
    expect(out.exp).toBe(Math.floor(now / 1000) + SESSION_TTL_SECONDS)
  })

  it("rejects a tampered payload (role edited to admin)", () => {
    const token = signSession(claims)
    const [payload, sig] = token.split(".")
    const forged = JSON.parse(Buffer.from(payload, "base64url").toString())
    forged.role = "admin"
    const forgedPayload = Buffer.from(JSON.stringify(forged)).toString("base64url")
    expect(verifySession(`${forgedPayload}.${sig}`)).toBeNull()
  })

  it("rejects a tampered signature", () => {
    const token = signSession(claims)
    expect(verifySession(token.slice(0, -2) + "xx")).toBeNull()
  })

  it("rejects a token signed with a different secret", () => {
    const token = signSession(claims)
    process.env.KEYSTONE_SESSION_SECRET = "a-completely-different-secret"
    expect(verifySession(token)).toBeNull()
  })

  it("rejects an expired token", () => {
    const now = 1_700_000_000_000
    const token = signSession(claims, now)
    expect(verifySession(token, now + (SESSION_TTL_SECONDS + 1) * 1000)).toBeNull()
  })

  it.each(["", "garbage", "a.b.c", ".", "abc."])("rejects malformed input %j", (bad) => {
    expect(verifySession(bad)).toBeNull()
  })

  it("rejects a missing token", () => {
    expect(verifySession(undefined)).toBeNull()
  })
})

describe("signing key resolution", () => {
  it("uses KEYSTONE_SESSION_SECRET when set, with no warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const key = resolveSigningKey()
    expect(key?.toString("utf8")).toBe("test-secret-test-secret-1234")
    expect(warn).not.toHaveBeenCalled()
  })

  it("falls back to a key derived from SUPABASE_SERVICE_ROLE_KEY and warns once", () => {
    delete process.env.KEYSTONE_SESSION_SECRET
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const a = resolveSigningKey()
    const b = resolveSigningKey()
    expect(a).not.toBeNull()
    expect(a!.equals(b!)).toBe(true)
    // Derived, never the raw service key.
    expect(a!.toString("utf8")).not.toContain("service-role-key-for-tests")
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain("KEYSTONE_SESSION_SECRET")
    expect(String(warn.mock.calls[0][0])).not.toContain("service-role-key-for-tests")
  })

  it("a token signed on the fallback path verifies on the fallback path", () => {
    delete process.env.KEYSTONE_SESSION_SECRET
    vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(verifySession(signSession(claims))).toMatchObject(claims)
  })

  it("the two paths do not accept each other's tokens", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const withSecret = signSession(claims)
    delete process.env.KEYSTONE_SESSION_SECRET
    expect(verifySession(withSecret)).toBeNull()
  })

  it("with neither variable set, signing throws and verifying returns null", () => {
    delete process.env.KEYSTONE_SESSION_SECRET
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(resolveSigningKey()).toBeNull()
    expect(() => signSession(claims)).toThrow()
    expect(verifySession("a.b")).toBeNull()
  })
})
