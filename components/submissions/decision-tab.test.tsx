import { describe, it, expect } from "vitest"
import { plumbAgreementSentence } from "@/components/submissions/decision-tab"

const assist = {
  verdict: "Solid, decision-ready submission.",
  strengths: [],
  gaps: [],
  suggestedDisposition: "reject" as const,
  draftRequestInfo: "",
}

describe("plumbAgreementSentence", () => {
  it("returns null when there's no assist read to compare against", () => {
    expect(plumbAgreementSentence(null, "approved")).toBeNull()
  })

  it("names 'the reviewer's decision' when the recorded decision matches Plumb's recommendation", () => {
    const sentence = plumbAgreementSentence({ ...assist, suggestedDisposition: "reject" }, "rejected")
    expect(sentence).toBe("Plumb recommended rejecting; the reviewer's decision agrees.")
  })

  it("names 'the reviewer' (not 'the reviewer's decision') when the recorded decision disagrees (RD-8, issue #218)", () => {
    const sentence = plumbAgreementSentence({ ...assist, suggestedDisposition: "request_info" }, "rejected")
    expect(sentence).toBe("Plumb recommended requesting more info; the reviewer decided otherwise.")
    expect(sentence).not.toContain("the reviewer's decision decided otherwise")
  })
})
