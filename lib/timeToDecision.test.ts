import { describe, it, expect } from "vitest"
import { timeToDecision, medianTimeToDecision, getDecidedAt } from "@/lib/timeToDecision"
import type { Submission } from "@/lib/submissions"

// F3-3 (#270). Days are whole calendar days in the fixed display zone
// (America/New_York, #236), so the answer never depends on the viewer's zone.

function sub(opts: {
  submittedAt: string
  status?: string
  signedOffAt?: string
  statusChangedAt?: string
}): Submission {
  return {
    id: "s1",
    submittedAt: opts.submittedAt,
    status: opts.status,
    formData: {
      ...(opts.signedOffAt
        ? {
            bureauSignoff: {
              bureau: "x",
              decision: "approved",
              signedOffByName: "A",
              signedOffByEmail: "a@x.gov",
              signedOffAt: opts.signedOffAt,
            },
          }
        : {}),
      ...(opts.statusChangedAt ? { statusChangedAt: opts.statusChangedAt } : {}),
    },
  } as unknown as Submission
}

describe("timeToDecision", () => {
  it("is 0 days when submitted and decided on the same day", () => {
    const s = sub({ submittedAt: "2026-11-01T14:00:00Z", status: "approved", signedOffAt: "2026-11-01T20:00:00Z" })
    expect(timeToDecision(s)).toBe(0)
  })

  it("is 2 days from 1 Nov to 3 Nov", () => {
    const s = sub({ submittedAt: "2026-11-01T15:00:00Z", status: "approved", signedOffAt: "2026-11-03T15:00:00Z" })
    expect(timeToDecision(s)).toBe(2)
  })

  it("counts New York calendar days, not 24-hour blocks or UTC days", () => {
    // 11:30pm NY on 1 Nov is 04:30Z on 2 Nov (EDT ended 1 Nov 2026, so EST, UTC-5 => 04:30Z).
    // 12:30am NY on 2 Nov is 05:30Z. One hour apart, but different NY days.
    const s = sub({ submittedAt: "2026-11-02T04:30:00Z", status: "rejected", signedOffAt: "2026-11-02T05:30:00Z" })
    expect(timeToDecision(s)).toBe(1)
    // 8pm and 11pm NY on the same day are the next UTC day for both: still 0.
    const t = sub({ submittedAt: "2026-11-02T01:00:00Z", status: "approved", signedOffAt: "2026-11-02T04:00:00Z" })
    expect(timeToDecision(t)).toBe(0)
  })

  it("returns nothing for an undecided record, even with a sign-off time", () => {
    expect(timeToDecision(sub({ submittedAt: "2026-11-01T15:00:00Z", status: "in_review" }))).toBeUndefined()
    expect(
      timeToDecision(sub({ submittedAt: "2026-11-01T15:00:00Z", status: "needs_info", signedOffAt: "2026-11-03T15:00:00Z" })),
    ).toBeUndefined()
  })

  it("falls back to the most recent status-change time when there is no sign-off time", () => {
    const s = sub({ submittedAt: "2026-11-01T15:00:00Z", status: "approved", statusChangedAt: "2026-11-04T15:00:00Z" })
    expect(getDecidedAt(s)).toBe("2026-11-04T15:00:00Z")
    expect(timeToDecision(s)).toBe(3)
  })

  it("prefers the sign-off time over a status-change time", () => {
    const s = sub({
      submittedAt: "2026-11-01T15:00:00Z",
      status: "approved",
      signedOffAt: "2026-11-02T15:00:00Z",
      statusChangedAt: "2026-11-09T15:00:00Z",
    })
    expect(timeToDecision(s)).toBe(1)
  })

  it("returns nothing when decided with neither a sign-off nor a status-change time", () => {
    expect(timeToDecision(sub({ submittedAt: "2026-11-01T15:00:00Z", status: "approved" }))).toBeUndefined()
  })

  it("returns nothing for unparseable or reversed times", () => {
    expect(timeToDecision(sub({ submittedAt: "nope", status: "approved", signedOffAt: "2026-11-02T15:00:00Z" }))).toBeUndefined()
    expect(
      timeToDecision(sub({ submittedAt: "2026-11-05T15:00:00Z", status: "approved", signedOffAt: "2026-11-02T15:00:00Z" })),
    ).toBeUndefined()
  })
})

describe("medianTimeToDecision", () => {
  const decided = (days: number) =>
    sub({
      submittedAt: "2026-11-01T15:00:00Z",
      status: "approved",
      signedOffAt: new Date(Date.UTC(2026, 10, 1 + days, 15)).toISOString(),
    })

  it("returns nothing when there are no decisions", () => {
    expect(medianTimeToDecision([])).toBeUndefined()
    expect(medianTimeToDecision([sub({ submittedAt: "2026-11-01T15:00:00Z", status: "in_review" })])).toBeUndefined()
  })

  it("is the middle value for an odd count, ignoring undecided records", () => {
    const undecided = sub({ submittedAt: "2026-11-01T15:00:00Z", status: "in_review" })
    expect(medianTimeToDecision([decided(9), decided(1), undecided, decided(4)])).toBe(4)
  })

  it("uses the LOWER of the two middle values for an even count (rule: lower median)", () => {
    expect(medianTimeToDecision([decided(1), decided(2), decided(5), decided(9)])).toBe(2)
    expect(medianTimeToDecision([decided(0), decided(1)])).toBe(0)
  })
})
