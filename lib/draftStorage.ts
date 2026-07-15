// Scopes the submit-wizard draft to the signed-in user. localStorage is
// shared across every account that logs into the same browser, so an
// unscoped draft key leaks one user's in-progress draft to the next user who
// signs in on that machine (observed in the audit: an admin saw a reviewer's
// leftover draft). Every read/write of the draft goes through
// `scopedDraftKey` instead of the bare key so each account only ever sees
// its own draft.

const ANONYMOUS_SCOPE = "anon"

export const DRAFT_FORM_KEY_BASE = "aid-form-data"
export const DRAFT_STEP_KEY_BASE = "aid-current-step"
export const DRAFT_SESSION_KEY_BASE = "aid-session-active"

// Legacy, pre-scoping keys. Only used for one-time migration below.
const LEGACY_DRAFT_KEYS = [DRAFT_FORM_KEY_BASE, DRAFT_STEP_KEY_BASE]

export function scopedDraftKey(base: string, userId: string | null | undefined): string {
  return `${base}:${userId || ANONYMOUS_SCOPE}`
}

// One-time migration for browsers that still have a draft under the old,
// unscoped key from before this fix. Moves it under the current user's
// scoped key so an in-progress draft isn't silently lost, then removes the
// legacy key so it can't leak to a different account afterward.
export function migrateLegacyDraftKeys(userId: string | null | undefined): void {
  if (typeof window === "undefined") return
  try {
    for (const base of LEGACY_DRAFT_KEYS) {
      const scoped = scopedDraftKey(base, userId)
      if (localStorage.getItem(scoped) !== null) continue
      const legacy = localStorage.getItem(base)
      if (legacy === null) continue
      localStorage.setItem(scoped, legacy)
      localStorage.removeItem(base)
    }
  } catch {
    /* ignore */
  }
}
