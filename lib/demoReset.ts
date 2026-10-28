// Clears unsubmitted wizard drafts when the admin "Reset Demo Data" runs.
//
// Drafts are stored only in each browser's localStorage (lib/draftStorage.ts),
// so wiping and re-seeding the database left every visitor's half-finished
// draft behind. The reset now stamps a server-side time (demo_state table,
// db/migrations/0007_demo_reset_stamp.sql). On load, each browser compares
// that stamp with the last one it acted on and, if the reset is newer, clears
// every draft it holds — once per reset — so a draft started after the reset
// is never touched.
//
// Pure functions take a Storage so they can be tested without a browser.

import { DRAFT_FORM_KEY_BASE, DRAFT_STEP_KEY_BASE, DRAFT_SESSION_KEY_BASE } from "@/lib/draftStorage"

/** localStorage key holding the reset stamp this browser last acted on. */
export const DRAFTS_RESET_SEEN_KEY = "launchpad-drafts-reset-seen"

const DRAFT_BASES = [DRAFT_FORM_KEY_BASE, DRAFT_STEP_KEY_BASE, DRAFT_SESSION_KEY_BASE]

function isDraftKey(key: string): boolean {
  return DRAFT_BASES.some((base) => key === base || key.startsWith(`${base}:`))
}

/** True when the server has a reset newer than the one this browser acted on. */
export function shouldClearDrafts(serverStamp: string | null, seenStamp: string | null): boolean {
  if (!serverStamp) return false
  const server = Date.parse(serverStamp)
  if (Number.isNaN(server)) return false
  if (!seenStamp) return true
  const seen = Date.parse(seenStamp)
  return Number.isNaN(seen) || server > seen
}

/** Remove every account's draft keys (scoped and legacy). Returns how many. */
export function clearAllDrafts(storage: Storage): number {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && isDraftKey(key)) keys.push(key)
  }
  for (const key of keys) storage.removeItem(key)
  return keys.length
}

/** Apply the server's reset stamp to this browser's drafts. */
export function syncDraftsWithDemoReset(serverStamp: string | null, storage: Storage): { cleared: number } {
  if (!shouldClearDrafts(serverStamp, storage.getItem(DRAFTS_RESET_SEEN_KEY))) return { cleared: 0 }
  const cleared = clearAllDrafts(storage)
  storage.setItem(DRAFTS_RESET_SEEN_KEY, serverStamp as string)
  return { cleared }
}
