// @vitest-environment node
// Saved Plumb reads (issue #272).

import { describe, it, expect, vi } from "vitest"
import { plumbReadFingerprint, resolvePlumbRead, type PlumbRead, type PlumbReadDeps, type SavedPlumbRead } from "@/lib/plumbRead"

const READ: PlumbRead = { verdict: "v", strengths: ["s"], gaps: ["g"], suggestedDisposition: "approve", draftRequestInfo: "d" }
const base = { useCaseTitle: "T", problemDefinition: "P", solutionSummary: "S" }

describe("plumbReadFingerprint", () => {
  it("is stable for the same content", () => {
    expect(plumbReadFingerprint({ ...base })).toBe(plumbReadFingerprint({ ...base }))
  })
  it("ignores fields Plumb does not read (e.g. review status)", () => {
    expect(plumbReadFingerprint({ ...base, reviewStatus: "approved" })).toBe(plumbReadFingerprint({ ...base }))
  })
  it.each([
    ["useCaseTitle", "T2"], ["problemDefinition", "P2"], ["solutionSummary", "S2"], ["businessValueSummary", "x"],
    ["costSavings", "x"], ["impactedUsersCount", "x"], ["alignmentSummary", "x"], ["implementationComplexity", "x"],
    ["metricsSummary", "x"], ["timelineForResults", "x"], ["involvesSensitiveData", "x"], ["aiModelSourcing", "x"],
    ["aiDecisionalImpact", "x"], ["aiHumanReview", "x"], ["readinessScore", "x"],
  ])("changes when %s changes", (field, value) => {
    expect(plumbReadFingerprint({ ...base, [field]: value })).not.toBe(plumbReadFingerprint({ ...base }))
  })
})

function deps(saved: SavedPlumbRead | null, over: Partial<PlumbReadDeps> = {}) {
  const produce = vi.fn().mockResolvedValue({ read: READ, ok: true })
  const save = vi.fn().mockResolvedValue(undefined)
  const load = vi.fn().mockResolvedValue(saved)
  return { produce, save, load, d: { load, save, produce, now: () => new Date("2026-11-14T00:00:00Z"), ...over } as PlumbReadDeps }
}
const savedFor = (fd: Record<string, unknown>, text = "old"): SavedPlumbRead => ({
  read: { ...READ, verdict: text }, fingerprint: plumbReadFingerprint(fd), savedAt: "2026-10-01T00:00:00.000Z",
})

describe("resolvePlumbRead", () => {
  it("decided record with a saved read makes no AI call", async () => {
    const fd = { ...base, reviewStatus: "approved" }
    const { d, produce } = deps(savedFor(fd))
    const r = await resolvePlumbRead({ submissionId: "s1", formData: fd }, d)
    expect(produce).not.toHaveBeenCalled()
    expect(r).toMatchObject({ source: "saved", savedAt: "2026-10-01T00:00:00.000Z" })
    expect(r.read?.verdict).toBe("old")
  })
  it("decided record shows the saved read even if content changed since", async () => {
    const fd = { ...base, reviewStatus: "rejected" }
    const { d, produce } = deps(savedFor({ ...base, problemDefinition: "other" }))
    const r = await resolvePlumbRead({ submissionId: "s1", formData: fd }, d)
    expect(produce).not.toHaveBeenCalled()
    expect(r.source).toBe("saved")
  })
  it("decided record with no saved read says none and makes no AI call", async () => {
    const { d, produce, save } = deps(null)
    const r = await resolvePlumbRead({ submissionId: "s1", formData: { ...base, reviewStatus: "approved" } }, d)
    expect(produce).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    expect(r).toEqual({ read: null, savedAt: null, source: "none" })
  })
  it("decided record with no saved read produces one when asked (button)", async () => {
    const { d, produce, save } = deps(null)
    const r = await resolvePlumbRead({ submissionId: "s1", formData: { ...base, reviewStatus: "approved" }, force: true }, d)
    expect(produce).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(r.source).toBe("new")
  })
  it("undecided record with matching fingerprint uses the saved read", async () => {
    const { d, produce } = deps(savedFor(base))
    const r = await resolvePlumbRead({ submissionId: "s1", formData: base }, d)
    expect(produce).not.toHaveBeenCalled()
    expect(r.source).toBe("saved")
  })
  it("changed content triggers a new read and saves it with the new fingerprint", async () => {
    const { d, produce, save } = deps(savedFor(base))
    const changed = { ...base, solutionSummary: "different" }
    const r = await resolvePlumbRead({ submissionId: "s1", formData: changed }, d)
    expect(produce).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith("s1", { read: READ, fingerprint: plumbReadFingerprint(changed), savedAt: "2026-11-14T00:00:00.000Z" })
    expect(r).toMatchObject({ source: "new", savedAt: "2026-11-14T00:00:00.000Z" })
  })
  it("no saved read triggers a new read and saves it", async () => {
    const { d, produce, save } = deps(null)
    await resolvePlumbRead({ submissionId: "s1", formData: base }, d)
    expect(produce).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledTimes(1)
  })
  it("does not save canned fallback text", async () => {
    const { d, save } = deps(null, { produce: vi.fn().mockResolvedValue({ read: READ, ok: false }) })
    const r = await resolvePlumbRead({ submissionId: "s1", formData: base }, d)
    expect(save).not.toHaveBeenCalled()
    expect(r.savedAt).toBeNull()
  })
  it("a failing save still returns the new read", async () => {
    const { d } = deps(null, { save: vi.fn().mockRejectedValue(new Error("x")) })
    const r = await resolvePlumbRead({ submissionId: "s1", formData: base }, d)
    expect(r.read).toEqual(READ)
  })
})
