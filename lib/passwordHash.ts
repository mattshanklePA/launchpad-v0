// Password hashing with scrypt from Node's built-in crypto (no dependencies).
//
// Stored format: `scrypt$<salt hex>$<hash hex>`. Any stored value that does not
// start with `scrypt$` is treated as legacy plain text so existing demo
// accounts keep working; login upgrades them to a hash on first success.
//
// Server-only (node:crypto). scripts/rehash-passwords.mjs duplicates the
// format and parameters — keep them in sync.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

const PREFIX = "scrypt"
const KEY_LEN = 64
const SALT_LEN = 16

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LEN, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

export function isHashed(stored: string): boolean {
  return stored.startsWith(`${PREFIX}$`)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN)
  const key = await derive(password, salt)
  return `${PREFIX}$${salt.toString("hex")}$${key.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$")
  if (parts.length !== 3 || parts[0] !== PREFIX || !parts[1] || !parts[2]) return false
  try {
    const expected = Buffer.from(parts[2], "hex")
    if (expected.length !== KEY_LEN) return false
    const actual = await derive(password, Buffer.from(parts[1], "hex"))
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function plainEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Check a login attempt against a stored value (hash or legacy plain text).
 * `upgradedHash` is set only when a legacy plain-text value matched; the caller
 * should persist it.
 */
export async function verifyAndMaybeUpgrade(
  password: string,
  stored: string,
): Promise<{ ok: boolean; upgradedHash: string | null }> {
  if (!stored || !password) return { ok: false, upgradedHash: null }
  if (isHashed(stored)) {
    return { ok: await verifyPassword(password, stored), upgradedHash: null }
  }
  if (!plainEquals(password, stored)) return { ok: false, upgradedHash: null }
  return { ok: true, upgradedHash: await hashPassword(password) }
}
