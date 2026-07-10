import { describe, it, expect } from "vitest"
import { docSeedSubmissions } from "@/lib/seedSubmissionsDoc"
import { determineReportability } from "@/lib/ombReportability"
import { determineHighImpact } from "@/lib/highImpactDetermination"
import { determineConsolidation } from "@/lib/ombConsolidation"
import { findSimilar } from "@/lib/similarity"
import { STATUS_ORDER } from "@/lib/reviewWorkflow"
import { doc } from "@/lib/tenant/doc"
import type { Submission } from "@/lib/submissions"

// Golden-state shape test for the DoC one-click demo reset (see
// app/api/seed/route.ts and the admin "Reset Demo Data" tool). Asserts the
// seed always spreads across every status, includes a draft and a rejected
// idea, demonstrates all three OMB reportability outcomes, includes a
// high-impact example, and covers multiple bureaus/offices — regardless of
// how the individual submissions' copy evolves over time.

const asSubmissions: Submission[] = docSeedSubmissions

const validBureaus = new Set(doc.unit.options.map((o) => o.value))

describe("docSeedSubmissions golden state", () => {
  it("has deterministic, unique ids", () => {
    const ids = asSubmissions.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^doc-/)
  })

  it("spreads across every pipeline status, plus a draft", () => {
    const statuses = new Set(asSubmissions.map((s) => s.formData.reviewStatus))
    for (const st of STATUS_ORDER) expect(statuses.has(st)).toBe(true)
    expect(statuses.has("draft")).toBe(true)
  })

  it("does not stack every submission in one status", () => {
    const statuses = asSubmissions.map((s) => s.formData.reviewStatus)
    expect(new Set(statuses).size).toBeGreaterThan(1)
  })

  it("includes exactly one submitter-owned draft with an owner email", () => {
    const drafts = asSubmissions.filter((s) => s.formData.reviewStatus === "draft")
    expect(drafts.length).toBeGreaterThanOrEqual(1)
    for (const d of drafts) {
      expect(d.formData.submitterEmail).toBeTruthy()
    }
  })

  it("includes at least one rejected submission", () => {
    const rejected = asSubmissions.filter((s) => s.formData.reviewStatus === "rejected")
    expect(rejected.length).toBeGreaterThanOrEqual(1)
  })

  it("demonstrates all three OMB reportability outcomes", () => {
    const outcomes = new Set(asSubmissions.map((s) => determineReportability(s.formData).status))
    expect(outcomes.has("reportable")).toBe(true)
    expect(outcomes.has("excluded")).toBe(true)
    expect(outcomes.has("review")).toBe(true)
  })

  it("includes at least one high-impact example with its risk fields populated", () => {
    const highImpact = asSubmissions.filter((s) => s.formData.highImpact === "yes")
    expect(highImpact.length).toBeGreaterThanOrEqual(1)
    for (const s of highImpact) {
      expect(s.formData.hasATO).toBeTruthy()
      expect(s.formData.systemSource).toBeTruthy()
      expect(s.formData.aiModelSourcing).toBeTruthy()
      expect(s.formData.aiHumanReview).toBeTruthy()
      // High-impact risk-management fields (OMB M-25-21 minimum practices).
      expect(s.formData.aiImpactAssessment).toBeTruthy()
      expect(s.formData.preDeploymentTesting).toBeTruthy()
      expect(s.formData.ongoingMonitoringPlan).toBeTruthy()
      expect(s.formData.humanOversightAppeal).toBeTruthy()
      // The rule-based recommendation should agree with the self-reported flag.
      expect(determineHighImpact(s.formData).recommendation).toBe("yes")
    }
  })

  it("includes a comparison pair: two related submissions similar enough to surface in the Decision Center", () => {
    const matches = asSubmissions.flatMap((s) => findSimilar(s, asSubmissions))
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it("covers multiple bureaus, all valid for the doc tenant, including offices", () => {
    const bureaus = new Set(asSubmissions.map((s) => s.formData.submitterOffice))
    expect(bureaus.size).toBeGreaterThanOrEqual(6)
    for (const b of bureaus) expect(validBureaus.has(b as string)).toBe(true)

    const withOffice = asSubmissions.filter((s) => s.formData.submitterSubOffice)
    expect(withOffice.length).toBeGreaterThanOrEqual(2)
  })

  it("includes at least one fully-completed, approved submission for the finished-use-case walkthrough", () => {
    const polished = asSubmissions.filter(
      (s) =>
        s.formData.reviewStatus === "approved" &&
        s.formData.readinessScore === "ready" &&
        (s.formData.executiveSummary || "").length > 0,
    )
    expect(polished.length).toBeGreaterThanOrEqual(1)
  })

  describe("cross-bureau consolidated trio (issue #33)", () => {
    // These three ids are the money-shot demo case: independently submitted by
    // three different bureaus, all matching the same OMB "widely-used
    // commercial AI" category, so the bureau roll-up's consolidated-vs-
    // individual OMB reporting count actually collapses instead of reading
    // 1:1 with the submission count.
    const trioIds = ["doc-nist-meeting-transcription", "doc-noaa-ops-meeting-recap", "doc-ita-mission-debrief-transcription"]

    it("has all three trio submissions present, non-high-impact, across three different bureaus", () => {
      const trio = trioIds.map((id) => asSubmissions.find((s) => s.id === id))
      for (const s of trio) expect(s).toBeTruthy()

      const bureaus = new Set(trio.map((s) => s!.formData.submitterOffice))
      expect(bureaus.size).toBe(3)
      expect(bureaus).toEqual(new Set(["nist", "noaa", "ita"]))

      for (const s of trio) expect(s!.formData.highImpact).toBe("no")
    })

    it("classifies all three as Consolidated under the same OMB category", () => {
      const results = trioIds.map((id) => {
        const s = asSubmissions.find((sub) => sub.id === id)!
        return determineConsolidation(s.formData)
      })

      for (const r of results) expect(r.status).toBe("Consolidated")

      const categories = new Set(results.map((r) => r.category))
      expect(categories.size).toBe(1)
      expect(categories.has("meeting_transcription")).toBe(true)
    })

    it("spreads the trio across submitted / in review / approved statuses", () => {
      const statuses = trioIds.map((id) => asSubmissions.find((s) => s.id === id)!.formData.reviewStatus)
      expect(new Set(statuses)).toEqual(new Set(["submitted", "in_review", "approved"]))
    })

    it("collapses the department roll-up: 12 use cases consolidate to 10 OMB reportable entries", () => {
      expect(asSubmissions.length).toBe(12)

      const consolidated = asSubmissions.filter((s) => determineConsolidation(s.formData).status === "Consolidated")
      const categoryCount = new Set(
        consolidated.map((s) => determineConsolidation(s.formData).category),
      ).size
      const reportableEntries = asSubmissions.length - consolidated.length + categoryCount

      expect(reportableEntries).toBe(10)
    })
  })
})
