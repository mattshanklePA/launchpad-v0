// F5-5 (#322): the note and the briefing live in browser memory only, per
// office view, and are gone when the session ends. No storage, no database.

import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  getNote, setNote, getBriefing, setBriefing, removeBriefing, subscribe, resetPortfolioReportSession, type SavedBriefing,
} from "@/lib/portfolioReportSession"

const BRIEF: SavedBriefing = {
  titles: ["A", "B"],
  writtenAt: 1,
  briefing: {
    recommendation: { fundId: "a", headline: "Fund A first." },
    differ: "d",
    portfolioGap: "g",
    perSubmission: [
      { id: "a", title: "A", verdict: "fund_now", oneLine: "o", gap: "x" },
      { id: "b", title: "B", verdict: "hold", oneLine: "o", gap: "y" },
    ],
  },
}

beforeEach(() => resetPortfolioReportSession())

describe("portfolio report session memory", () => {
  it("keeps a note per office view", () => {
    setNote("", { note: "all", writtenAt: 1 })
    setNote("hrfm", { note: "one", writtenAt: 2 })
    expect(getNote("")?.note).toBe("all")
    expect(getNote("hrfm")?.note).toBe("one")
    expect(getNote("atr")).toBeUndefined()
  })

  it("writing it again replaces the note", () => {
    setNote("", { note: "old", writtenAt: 1 })
    setNote("", { note: "new", writtenAt: 2 })
    expect(getNote("")).toEqual({ note: "new", writtenAt: 2 })
  })

  it("holds one briefing; remove takes it away", () => {
    expect(getBriefing()).toBeUndefined()
    setBriefing(BRIEF)
    expect(getBriefing()).toEqual(BRIEF)
    removeBriefing()
    expect(getBriefing()).toBeUndefined()
  })

  it("tells listeners on every change", () => {
    const fn = vi.fn()
    const off = subscribe(fn)
    setNote("", { note: "x", writtenAt: 1 })
    setBriefing(BRIEF)
    removeBriefing()
    expect(fn).toHaveBeenCalledTimes(3)
    off()
    setNote("", { note: "y", writtenAt: 2 })
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it("never touches browser storage", () => {
    const set = vi.spyOn(Storage.prototype, "setItem")
    setNote("", { note: "x", writtenAt: 1 })
    setBriefing(BRIEF)
    expect(set).not.toHaveBeenCalled()
    set.mockRestore()
  })
})
