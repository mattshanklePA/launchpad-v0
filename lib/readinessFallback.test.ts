import { describe, it, expect } from "vitest"
import { readinessFallback } from "@/lib/readinessFallback"
import { initialFormData } from "@/lib/steps"

// ES2-14: assessReadiness falls back to this object when the model is
// unavailable. app/actions.ts is "use server" and outside the vitest include
// globs, so the fallback lives here and is unit-tested directly.
describe("readinessFallback", () => {
  it("returns a non-empty findings array whose steps are all 2, 3 or 5", () => {
    const result = readinessFallback({ ...initialFormData, useCaseTitle: "Invoice anomaly triage" })
    expect(result.findings.length).toBeGreaterThan(0)
    for (const finding of result.findings) {
      expect([2, 3, 5]).toContain(finding.step)
      expect(finding.message.trim()).not.toBe("")
    }
  })

  it("keeps the prose verdict it returned before", () => {
    const result = readinessFallback(initialFormData)
    expect(result.readinessScore).toBe("needs_work")
    expect(result.readinessSummary.trim()).not.toBe("")
    expect(result.executiveSummary.trim()).not.toBe("")
  })

  it("names the idea in the executive summary, or says Untitled Idea", () => {
    expect(
      readinessFallback({ ...initialFormData, useCaseTitle: "Invoice anomaly triage" }).executiveSummary,
    ).toContain("Invoice anomaly triage")
    expect(readinessFallback(initialFormData).executiveSummary).toContain("Untitled Idea")
  })
})
