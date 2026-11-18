// @vitest-environment node
//
// F6-3 (#343): getOfficeDecisionTime loads the idea on the server, checks the
// caller may see it, works out the office's typical time to a decision from ALL
// ideas, and returns one number or one marker and nothing else.

import { describe, it, expect, beforeEach, vi } from "vitest"
import { signSession, SESSION_COOKIE_NAME } from "@/lib/session/token"

let jar: string | undefined
vi.mock("next/headers", () => ({
  cookies: () => ({ get: (n: string) => (n === SESSION_COOKIE_NAME && jar ? { value: jar } : undefined) }),
}))

type Row = { id: string; submitted_at: string; form_data: Record<string, unknown>; status: string | null; owner_email: string | null; business_unit: string | null; office: string | null }
let rows: Row[] = []
vi.mock("@/lib/supabaseClient", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: (_c: string, id: string) => ({ limit: async () => ({ data: rows.filter((r) => r.id === id), error: null }) }),
        order: () => ({ range: async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }) }),
      }),
    }),
  }),
}))

import { getOfficeDecisionTime } from "@/app/sent-actions"

const DAY = 86_400_000
const base = { userId: "u1", email: "me@x.gov", name: "Me", jobRole: "", businessUnit: "", office: "" }
const as = (role: "submitter" | "reviewer" | "admin", extra: Partial<typeof base> = {}) => signSession({ ...base, ...extra, role })

/** A decided idea in `unit`, signed off `ageDays` ago, taking `took` days. */
function decidedRow(id: string, unit: string, ageDays: number, took: number, title = `Title ${id}`): Row {
  const at = Date.now() - ageDays * DAY
  return {
    id,
    submitted_at: new Date(at - took * DAY).toISOString(),
    status: "approved",
    owner_email: "other@x.gov",
    business_unit: unit,
    office: null,
    form_data: { useCaseTitle: title, reviewStatus: "approved", bureauSignoff: { bureau: unit, decision: "approved", signedOffByName: "A", signedOffByEmail: "a@x.gov", signedOffAt: new Date(at).toISOString() } },
  }
}
const mine = (id = "mine", unit = "patents"): Row => ({
  id, submitted_at: new Date().toISOString(), status: null, owner_email: "me@x.gov", business_unit: unit, office: null,
  form_data: { useCaseTitle: "My idea", reviewStatus: "submitted" },
})

beforeEach(() => {
  process.env.KEYSTONE_SESSION_SECRET = "actions-secret-actions-secret"
  jar = as("submitter", { email: "me@x.gov", businessUnit: "patents" })
  rows = [mine()]
})

describe("getOfficeDecisionTime", () => {
  it("returns the median when three decisions in the office are in the last 90 days", async () => {
    rows.push(decidedRow("d1", "patents", 5, 3), decidedRow("d2", "patents", 10, 7), decidedRow("d3", "patents", 20, 12))
    expect(await getOfficeDecisionTime("mine")).toEqual({ status: "days", days: 7 })
  })

  it("returns not-enough for two decisions", async () => {
    rows.push(decidedRow("d1", "patents", 5, 3), decidedRow("d2", "patents", 10, 7))
    expect(await getOfficeDecisionTime("mine")).toEqual({ status: "not-enough" })
  })

  it("does not count a decision 91 days old", async () => {
    rows.push(decidedRow("d1", "patents", 5, 3), decidedRow("d2", "patents", 10, 7), decidedRow("d3", "patents", 91, 12))
    expect(await getOfficeDecisionTime("mine")).toEqual({ status: "not-enough" })
  })

  it("does not count another office's decisions", async () => {
    rows.push(decidedRow("d1", "trademarks", 5, 3), decidedRow("d2", "trademarks", 10, 7), decidedRow("d3", "trademarks", 20, 12))
    expect(await getOfficeDecisionTime("mine")).toEqual({ status: "not-enough" })
  })

  it("returns one number and nothing about any other idea", async () => {
    rows.push(decidedRow("d1", "patents", 5, 3, "SECRET ONE"), decidedRow("d2", "patents", 10, 7, "SECRET TWO"), decidedRow("d3", "patents", 20, 12, "SECRET THREE"))
    const r = await getOfficeDecisionTime("mine")
    expect(Object.keys(r).sort()).toEqual(["days", "status"])
    const text = JSON.stringify(r)
    for (const needle of ["SECRET", "d1", "d2", "d3", "other@x.gov", "count"]) expect(text).not.toContain(needle)
  })

  it("refuses an idea that is not the submitter's, with nothing about it", async () => {
    rows.push({ ...mine("theirs"), owner_email: "someone@x.gov" })
    expect(await getOfficeDecisionTime("theirs")).toEqual({ status: "refused" })
  })

  it("gives an unknown id the same refusal", async () => {
    expect(await getOfficeDecisionTime("nope")).toEqual({ status: "refused" })
  })

  it("rejects a call with no session", async () => {
    jar = undefined
    await expect(getOfficeDecisionTime("mine")).rejects.toMatchObject({ status: 401 })
  })
})
