// One-off: rehash plain-text passwords in ONE tenant's database.
// NOT run automatically. Dry run unless --apply is passed.
//
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/rehash-passwords.mjs [--apply]
//
// Run once per tenant with that tenant's env vars. Rows already hashed are
// skipped. Format/params must match lib/passwordHash.ts (scrypt$salt$hash).

import { randomBytes, scryptSync } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const apply = process.argv.includes("--apply")
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const hash = (pw) => {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString("hex")}$${scryptSync(pw, salt, 64).toString("hex")}`
}

const db = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await db.from("users").select("id,email,password")
if (error) throw error

let todo = 0
let done = 0
for (const u of data ?? []) {
  if (!u.password || u.password.startsWith("scrypt$")) continue
  todo++
  if (!apply) continue
  const { error: e } = await db.from("users").update({ password: hash(u.password) }).eq("id", u.id)
  if (e) console.error(`FAILED ${u.email}: ${e.message}`)
  else done++
}
console.log(`${url}: ${todo} plain-text row(s)${apply ? `, ${done} rehashed` : " (dry run; pass --apply)"}`)
