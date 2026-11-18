import { describe, it, expect } from "vitest"
import { officeDecisionTime } from "@/lib/officeDecisionTime"
import type { Submission } from "@/lib/submissions"

// F6-3 (#343). Typical time to a decision for ONE office, over the last 90 days,
// and nothing at all under three decisions.

const NOW = Date.parse("2026-11-18T12:00:00Z")
const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString()

/** An idea in `unit`, decided `ageDays` ago after taking `took` days. */
function decided(unit: string, ageDays: number, took: number, id = `${unit}-${ageDays}-${took}`): Submission {
  const decidedAt = NOW - ageDays * DAY
  return {
    id,
    submittedAt: iso(decidedAt - took * DAY),
    status: "approved",
    businessUnit: unit,
    formData: { bureauSignoff: { bureau: unit, decision: "approved", signedOffByName: "A", signedOffByEmail: "a@x.gov", signedOffAt: iso(decidedAt) } },
  } as unknown as Submission
}

describe("officeDecisionTime", () => {
  it("returns the median of three or more decisions in the office in the last 90 days", () => {
    const all = [decided("a", 5, 4), decided("a", 10, 9), decided("a", 20, 20), decided("a", 30, 30)]
    expect(officeDecisionTime(all, "a", NOW)).toEqual({ status: "days", days: 9 })
  })

  it("returns not-enough for two decisions", () => {
    expect(officeDecisionTime([decided("a", 5, 4), decided("a", 6, 9)], "a", NOW)).toEqual({ status: "not-enough" })
  })

  it("returns not-enough for none", () => {
    expect(officeDecisionTime([], "a", NOW)).toEqual({ status: "not-enough" })
  })

  it("does not count a decision 91 days old, but counts one 90 days old", () => {
    const base = [decided("a", 5, 4), decided("a", 6, 5)]
    expect(officeDecisionTime([...base, decided("a", 91, 3)], "a", NOW)).toEqual({ status: "not-enough" })
    expect(officeDecisionTime([...base, decided("a", 90, 3)], "a", NOW)).toEqual({ status: "days", days: 4 })
  })

  it("does not count another office's decisions", () => {
    const all = [decided("a", 5, 4), decided("a", 6, 5), decided("b", 5, 1), decided("b", 6, 1), decided("b", 7, 1)]
    expect(officeDecisionTime(all, "a", NOW)).toEqual({ status: "not-enough" })
  })

  it("does not count undecided ideas", () => {
    const open = { id: "o", submittedAt: iso(NOW - 3 * DAY), status: "submitted", businessUnit: "a", formData: {} } as unknown as Submission
    expect(officeDecisionTime([decided("a", 5, 4), decided("a", 6, 5), open], "a", NOW)).toEqual({ status: "not-enough" })
  })
})
