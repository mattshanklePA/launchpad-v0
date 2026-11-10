import { describe, expect, it } from "vitest"
import { hashPassword, isHashed, verifyPassword, verifyAndMaybeUpgrade } from "./passwordHash"

describe("hashPassword", () => {
  it("produces a scrypt$salt$hash string, never the plain text", async () => {
    const h = await hashPassword("demo1234")
    expect(h.startsWith("scrypt$")).toBe(true)
    expect(h.split("$")).toHaveLength(3)
    expect(h).not.toContain("demo1234")
  })

  it("uses a fresh salt each time", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"))
  })
})

describe("verifyPassword", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const h = await hashPassword("right-pass")
    expect(await verifyPassword("right-pass", h)).toBe(true)
    expect(await verifyPassword("wrong-pass", h)).toBe(false)
  })

  it("returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("x", "scrypt$onlytwo")).toBe(false)
    expect(await verifyPassword("x", "scrypt$$")).toBe(false)
  })
})

describe("isHashed", () => {
  it("distinguishes hashes from legacy plain text", async () => {
    expect(isHashed(await hashPassword("a"))).toBe(true)
    expect(isHashed("password123")).toBe(false)
  })
})

describe("verifyAndMaybeUpgrade (legacy plain-text path)", () => {
  it("hashed stored value: ok, no upgrade", async () => {
    const stored = await hashPassword("pw-123456")
    expect(await verifyAndMaybeUpgrade("pw-123456", stored)).toEqual({ ok: true, upgradedHash: null })
    expect(await verifyAndMaybeUpgrade("nope", stored)).toEqual({ ok: false, upgradedHash: null })
  })

  it("legacy plain text that matches: ok and returns a new hash that verifies", async () => {
    const r = await verifyAndMaybeUpgrade("demo-pass", "demo-pass")
    expect(r.ok).toBe(true)
    expect(r.upgradedHash).toBeTruthy()
    expect(isHashed(r.upgradedHash as string)).toBe(true)
    expect(await verifyPassword("demo-pass", r.upgradedHash as string)).toBe(true)
  })

  it("legacy plain text that does not match: rejected, no upgrade", async () => {
    expect(await verifyAndMaybeUpgrade("bad", "demo-pass")).toEqual({ ok: false, upgradedHash: null })
  })

  it("empty stored value never matches", async () => {
    expect(await verifyAndMaybeUpgrade("", "")).toEqual({ ok: false, upgradedHash: null })
  })
})
