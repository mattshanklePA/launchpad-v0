// Tests for lib/demoReset.ts — clearing unsubmitted wizard drafts when the
// admin "Reset Demo Data" runs. Drafts live only in each browser's
// localStorage (lib/draftStorage.ts), so a database reset alone left every
// visitor's half-finished draft in place (DoC demo, 2026-10-28). The reset now
// stamps a server-side time; each browser compares it with the last stamp it
// acted on and clears its drafts once per reset.

import { describe, it, expect, beforeEach } from "vitest"
import {
  shouldClearDrafts,
  clearAllDrafts,
  syncDraftsWithDemoReset,
  DRAFTS_RESET_SEEN_KEY,
} from "@/lib/demoReset"

describe("shouldClearDrafts", () => {
  it("does nothing when no reset has ever been stamped", () => {
    expect(shouldClearDrafts(null, null)).toBe(false)
    expect(shouldClearDrafts(null, "2026-10-28T18:00:00.000Z")).toBe(false)
  })

  it("clears when this browser has never acted on a reset", () => {
    expect(shouldClearDrafts("2026-10-28T18:00:00.000Z", null)).toBe(true)
  })

  it("clears when the server's reset is newer than the one this browser saw", () => {
    expect(shouldClearDrafts("2026-10-28T19:00:00.000Z", "2026-10-28T18:00:00.000Z")).toBe(true)
  })

  it("does not clear again for a reset this browser already acted on", () => {
    expect(shouldClearDrafts("2026-10-28T18:00:00.000Z", "2026-10-28T18:00:00.000Z")).toBe(false)
  })

  it("ignores an unreadable stamp rather than wiping drafts", () => {
    expect(shouldClearDrafts("not-a-date", null)).toBe(false)
  })
})

describe("clearAllDrafts", () => {
  beforeEach(() => localStorage.clear())

  it("removes every user's draft keys, scoped and legacy, and nothing else", () => {
    localStorage.setItem("aid-form-data:user-1", "{}")
    localStorage.setItem("aid-current-step:user-1", "3")
    localStorage.setItem("aid-session-active:user-1", "1")
    localStorage.setItem("aid-form-data:anon", "{}")
    localStorage.setItem("aid-form-data", "{}")
    localStorage.setItem("launchpad-session", '{"userId":"user-1"}')
    localStorage.setItem("aid-form-data-other", "keep")

    expect(clearAllDrafts(localStorage)).toBe(5)
    expect(localStorage.getItem("launchpad-session")).not.toBeNull()
    expect(localStorage.getItem("aid-form-data-other")).toBe("keep")
    expect(localStorage.length).toBe(2)
  })
})

describe("syncDraftsWithDemoReset", () => {
  beforeEach(() => localStorage.clear())

  it("clears drafts once per reset and remembers the reset it acted on", () => {
    localStorage.setItem("aid-form-data:user-1", "{}")
    const stamp = "2026-10-28T18:00:00.000Z"

    expect(syncDraftsWithDemoReset(stamp, localStorage)).toEqual({ cleared: 1 })
    expect(localStorage.getItem(DRAFTS_RESET_SEEN_KEY)).toBe(stamp)

    // A draft started after that reset survives the next page load.
    localStorage.setItem("aid-form-data:user-1", "{}")
    expect(syncDraftsWithDemoReset(stamp, localStorage)).toEqual({ cleared: 0 })
    expect(localStorage.getItem("aid-form-data:user-1")).toBe("{}")
  })

  it("leaves drafts alone when no reset has been stamped", () => {
    localStorage.setItem("aid-form-data:user-1", "{}")
    expect(syncDraftsWithDemoReset(null, localStorage)).toEqual({ cleared: 0 })
    expect(localStorage.getItem("aid-form-data:user-1")).toBe("{}")
  })
})
