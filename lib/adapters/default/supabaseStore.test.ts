import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { supabaseStore } from "@/lib/adapters/default/supabaseStore"
import { setCachedSubmissions } from "@/lib/dataCache"
import { initialFormData } from "@/lib/steps"

// Issue #268: after a successful submit the detail page reads the submissions
// cache synchronously. The new record must already be in it, or the page says
// "Submission not found" until a reload.
describe("supabaseStore.saveSubmission — cache", () => {
  beforeEach(() => {
    setCachedSubmissions([])
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const idea = {
    ...initialFormData,
    submitterEmail: "Jane@Example.gov",
    submitterOffice: "census",
    useCaseTitle: "Closeout file checker",
  }

  it("makes the saved record readable straight away, ahead of older ones", async () => {
    setCachedSubmissions([{ id: "old", submittedAt: "2026-01-01T00:00:00Z", formData: {} }])
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))

    const saved = await supabaseStore.saveSubmission(idea)
    const found = supabaseStore.getSubmissions().find((s) => s.id === saved.id)

    expect(found?.formData.useCaseTitle).toBe("Closeout file checker")
    expect(found?.ownerEmail).toBe("jane@example.gov")
    expect(found?.businessUnit).toBe("census")
    expect(supabaseStore.getSubmissions()[0].id).toBe(saved.id)
    expect(supabaseStore.getSubmissions().map((s) => s.id)).toContain("old")
  })

  it("does not cache a record the server rejected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    vi.spyOn(console, "error").mockImplementation(() => {})

    const saved = await supabaseStore.saveSubmission(idea)

    expect(supabaseStore.getSubmissions().find((s) => s.id === saved.id)).toBeUndefined()
  })
})
