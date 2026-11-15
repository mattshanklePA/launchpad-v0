// @vitest-environment node
//
// F5-5 (#322): Plumb's read of the portfolio. The action takes nothing from the
// browser but an optional office, loads only what the signed-in person may see,
// and never throws to the screen once the caller is allowed in. The assistant
// is mocked, so the tests can read exactly what is sent to it.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { signSession, SESSION_COOKIE_NAME } from "@/lib/session/token"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { getBusinessUnit, getStatus } from "@/lib/reviewWorkflow"

let jar: string | undefined
vi.mock("next/headers", () => ({
  cookies: () => ({ get: (n: string) => (n === SESSION_COOKIE_NAME && jar ? { value: jar } : undefined) }),
}))

const rows = es2SeedSubmissions.map((s) => ({
  id: s.id,
  submitted_at: s.submittedAt,
  form_data: s.formData as unknown as Record<string, unknown>,
  status: getStatus(s),
  owner_email: s.ownerEmail ?? null,
  business_unit: getBusinessUnit(s),
  office: s.office ?? null,
}))
vi.mock("@/lib/supabaseClient", () => ({ getSupabaseAdmin: () => ({}) }))
vi.mock("@/lib/fetchAllSubmissionRows", () => ({ fetchAllSubmissionRows: async () => ({ rows, truncated: false }) }))
vi.mock("@/lib/modelProvider", () => ({ getModel: () => "mock-model" }))
const generate = vi.fn()
vi.mock("@/lib/aiResilience", () => ({ generateObjectResilient: (...a: unknown[]) => generate(...a) }))

import { writePortfolioNote } from "@/app/report-actions"

const base = { userId: "u1", email: "u@es2.demo", name: "U", jobRole: "", businessUnit: "", office: "" }
const as = (role: "submitter" | "reviewer" | "admin", businessUnit = "") => signSession({ ...base, role, businessUnit })
const GOOD = "Three offices are each building the same thing. A leader decides whether to combine them."
const sent = () => {
  const args = generate.mock.calls[0][1] as { messages: { role: string; content: string }[] }
  return { system: args.messages[0].content, user: args.messages[1].content }
}

beforeEach(() => {
  process.env.KEYSTONE_SESSION_SECRET = "actions-secret-actions-secret"
  process.env.NEXT_PUBLIC_TENANT = "es2"
  jar = undefined
  generate.mockReset()
  generate.mockResolvedValue({ object: { note: GOOD } })
})
afterEach(() => {
  delete process.env.NEXT_PUBLIC_TENANT
})

describe("writePortfolioNote", () => {
  it("refuses a signed-out caller and never reaches the assistant", async () => {
    await expect(writePortfolioNote()).rejects.toMatchObject({ name: "SessionError", status: 401 })
    expect(generate).not.toHaveBeenCalled()
  })

  it("refuses a submitter and never reaches the assistant", async () => {
    jar = as("submitter")
    await expect(writePortfolioNote()).rejects.toMatchObject({ name: "SessionError", status: 403 })
    expect(generate).not.toHaveBeenCalled()
  })

  it("an admin gets a note with the time it was written", async () => {
    jar = as("admin")
    const before = Date.now()
    const r = await writePortfolioNote()
    expect(r.status).toBe("ok")
    if (r.status !== "ok") return
    expect(r.note).toBe(GOOD)
    expect(r.writtenAt).toBeGreaterThanOrEqual(before)
    expect(generate.mock.calls[0][0]).toBe("writePortfolioNote")
  })

  it("a reviewer limited to one office is sent that office's numbers and no other office", async () => {
    jar = as("reviewer", "atr")
    const r = await writePortfolioNote()
    expect(r.status).toBe("ok")
    const { user } = sent()
    const mine = es2SeedSubmissions.filter((s) => getBusinessUnit(s) === "atr")
    const others = es2SeedSubmissions.filter((s) => getBusinessUnit(s) !== "atr")
    expect(mine.length).toBeGreaterThan(0)
    expect(user).toContain(`${mine.length} ideas`)
    for (const s of others) expect(user).not.toContain(String(s.formData.useCaseTitle))
    for (const o of ["HR-FM", "LOG-FIN", "BTS", "C-ERP"]) expect(user).not.toContain(o)
  })

  it("a reviewer cannot ask for another office", async () => {
    jar = as("reviewer", "atr")
    const r = await writePortfolioNote("hrfm")
    expect(r).toEqual({ status: "unavailable" })
    expect(generate).not.toHaveBeenCalled()
  })

  it("an admin can pick one office and only that office is sent", async () => {
    jar = as("admin")
    await writePortfolioNote("hrfm")
    const { user } = sent()
    expect(user).toContain("HR-FM")
    // The office table holds this office only (an overlap line may still name the other office in a group).
    const table = user.slice(user.indexOf("By program office:"))
    expect(table).toContain("HR-FM")
    for (const o of ["LOG-FIN", "BTS", "C-ERP", "AT&R"]) expect(table).not.toContain(o)
  })

  it("sends the instruction: plain words, advice, only the numbers given", async () => {
    jar = as("admin")
    await writePortfolioNote()
    const { system } = sent()
    for (const phrase of ["two or three", "lines up with", "no em dashes", "Use only the numbers given", "never name an AI model"]) {
      expect(system.toLowerCase()).toContain(phrase.toLowerCase())
    }
  })

  it("a failed answer comes back as unavailable and does not throw", async () => {
    jar = as("admin")
    generate.mockRejectedValue(new Error("down"))
    await expect(writePortfolioNote()).resolves.toEqual({ status: "unavailable" })
  })

  it.each([
    ["empty", ""],
    ["whitespace", "   \n "],
    ["not text", 42],
    ["a JSON fragment", '{"note": "oops"}'],
    ["a code fence", "```json\n{}\n```"],
  ])("a garbled answer (%s) comes back as unavailable", async (_n, note) => {
    jar = as("admin")
    generate.mockResolvedValue({ object: { note } })
    await expect(writePortfolioNote()).resolves.toEqual({ status: "unavailable" })
  })

  it("an answer with no object comes back as unavailable", async () => {
    jar = as("admin")
    generate.mockResolvedValue({})
    await expect(writePortfolioNote()).resolves.toEqual({ status: "unavailable" })
  })

  it("swaps an em dash for a comma and cuts a long answer at a full sentence", async () => {
    jar = as("admin")
    const long = `Four offices hold six high-risk ideas — each needs a named person. ${"Another full sentence here. ".repeat(60)}`
    generate.mockResolvedValue({ object: { note: long } })
    const r = await writePortfolioNote()
    expect(r.status).toBe("ok")
    if (r.status !== "ok") return
    expect(r.note).not.toContain("—")
    expect(r.note.length).toBeLessThanOrEqual(700)
    expect(r.note.endsWith(".")).toBe(true)
  })
})
