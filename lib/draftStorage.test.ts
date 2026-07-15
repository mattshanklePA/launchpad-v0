import { describe, it, expect, beforeEach } from "vitest"
import {
  DRAFT_FORM_KEY_BASE,
  DRAFT_STEP_KEY_BASE,
  DRAFT_SESSION_KEY_BASE,
  scopedDraftKey,
  migrateLegacyDraftKeys,
} from "./draftStorage"

describe("scopedDraftKey", () => {
  it("namespaces the key by user id", () => {
    expect(scopedDraftKey(DRAFT_FORM_KEY_BASE, "user-1")).toBe("aid-form-data:user-1")
    expect(scopedDraftKey(DRAFT_STEP_KEY_BASE, "user-2")).toBe("aid-current-step:user-2")
  })

  it("falls back to a fixed anonymous scope when there is no signed-in user", () => {
    expect(scopedDraftKey(DRAFT_FORM_KEY_BASE, null)).toBe("aid-form-data:anon")
    expect(scopedDraftKey(DRAFT_FORM_KEY_BASE, undefined)).toBe("aid-form-data:anon")
  })

  it("produces different keys for different users, preventing cross-account leakage", () => {
    const admin = scopedDraftKey(DRAFT_FORM_KEY_BASE, "admin-id")
    const reviewer = scopedDraftKey(DRAFT_FORM_KEY_BASE, "reviewer-id")
    expect(admin).not.toBe(reviewer)
  })

  it("does not scope the session-active flag differently than form/step (same helper)", () => {
    expect(scopedDraftKey(DRAFT_SESSION_KEY_BASE, "user-1")).toBe("aid-session-active:user-1")
  })
})

describe("migrateLegacyDraftKeys", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("moves a legacy unscoped draft under the current user's scoped key", () => {
    localStorage.setItem(DRAFT_FORM_KEY_BASE, JSON.stringify({ useCaseTitle: "Legacy draft" }))
    localStorage.setItem(DRAFT_STEP_KEY_BASE, "3")

    migrateLegacyDraftKeys("user-1")

    expect(localStorage.getItem(DRAFT_FORM_KEY_BASE)).toBeNull()
    expect(localStorage.getItem(DRAFT_STEP_KEY_BASE)).toBeNull()
    expect(localStorage.getItem(scopedDraftKey(DRAFT_FORM_KEY_BASE, "user-1"))).toBe(
      JSON.stringify({ useCaseTitle: "Legacy draft" }),
    )
    expect(localStorage.getItem(scopedDraftKey(DRAFT_STEP_KEY_BASE, "user-1"))).toBe("3")
  })

  it("does not overwrite an existing scoped draft with a legacy one", () => {
    localStorage.setItem(DRAFT_FORM_KEY_BASE, JSON.stringify({ useCaseTitle: "Legacy" }))
    localStorage.setItem(
      scopedDraftKey(DRAFT_FORM_KEY_BASE, "user-1"),
      JSON.stringify({ useCaseTitle: "Current" }),
    )

    migrateLegacyDraftKeys("user-1")

    expect(localStorage.getItem(scopedDraftKey(DRAFT_FORM_KEY_BASE, "user-1"))).toBe(
      JSON.stringify({ useCaseTitle: "Current" }),
    )
  })

  it("is a no-op when there is no legacy draft", () => {
    migrateLegacyDraftKeys("user-1")
    expect(localStorage.getItem(scopedDraftKey(DRAFT_FORM_KEY_BASE, "user-1"))).toBeNull()
  })

  it("never migrates one user's legacy draft into a different user's scope by accident", () => {
    localStorage.setItem(DRAFT_FORM_KEY_BASE, JSON.stringify({ useCaseTitle: "Whoever was here first" }))

    migrateLegacyDraftKeys("user-1")

    expect(localStorage.getItem(scopedDraftKey(DRAFT_FORM_KEY_BASE, "user-2"))).toBeNull()
  })
})
