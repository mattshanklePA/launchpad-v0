import { describe, it, expect } from "vitest"
import {
  proposeHighImpact,
  proposeTopicArea,
  proposeAiClassification,
  proposeIsWithheld,
  proposeHasPii,
} from "@/lib/ombAutofill"

describe("proposeHighImpact", () => {
  it("proposes high_impact with a rationale when a factor is flagged", () => {
    const proposal = proposeHighImpact({ highImpactFactors: ["rights"] })
    expect(proposal.value).toBe("high_impact")
    expect(proposal.rationale).toMatch(/rights/i)
  })

  it("proposes not_high_impact when no factor applies", () => {
    const proposal = proposeHighImpact({ highImpactFactors: [] })
    expect(proposal.value).toBe("not_high_impact")
    expect(proposal.rationale.length).toBeGreaterThan(0)
  })
})

describe("proposeTopicArea", () => {
  it("returns a proposal with rationale on a keyword match", () => {
    const proposal = proposeTopicArea({
      coreProblem: "Analysts spend hours triaging phishing alerts and intrusion attempts.",
    })
    expect(proposal).not.toBeNull()
    expect(proposal?.value).toBe("cybersecurity")
    expect(proposal?.rationale.length).toBeGreaterThan(0)
  })

  it("returns null (never a fabricated value) when nothing matches", () => {
    const proposal = proposeTopicArea({ coreProblem: "" })
    expect(proposal).toBeNull()
  })
})

describe("proposeAiClassification", () => {
  it("returns a proposal on a keyword match", () => {
    const proposal = proposeAiClassification({
      proposedSolution: "A chatbot backed by a large language model.",
    })
    expect(proposal?.value).toBe("generative_ai")
  })

  it("returns null when nothing matches", () => {
    const proposal = proposeAiClassification({ proposedSolution: "" })
    expect(proposal).toBeNull()
  })
})

describe("proposeIsWithheld", () => {
  it("defaults to 'no' (OMB's 'No') when no security signal is present", () => {
    const proposal = proposeIsWithheld({ nationalSecuritySystem: "no", securityClassification: "" })
    expect(proposal.value).toBe("no")
  })

  it("proposes disclosure-prohibited-by-law for a flagged National Security System use", () => {
    const proposal = proposeIsWithheld({ nationalSecuritySystem: "yes", securityClassification: "" })
    expect(proposal.value).toBe("yes_disclosure_prohibited")
    expect(proposal.rationale).toMatch(/national security/i)
  })

  it("proposes risk-to-disclosure for Controlled classification", () => {
    const proposal = proposeIsWithheld({ nationalSecuritySystem: "no", securityClassification: "controlled" })
    expect(proposal.value).toBe("yes_risk_to_disclosure")
  })
})

describe("proposeHasPii", () => {
  it("reuses the Department's involvesSensitiveData answer", () => {
    const proposal = proposeHasPii({ involvesSensitiveData: "yes" })
    expect(proposal?.value).toBe("yes")
    expect(proposal?.rationale).toMatch(/PII/i)
  })

  it("reuses a 'no' answer too", () => {
    const proposal = proposeHasPii({ involvesSensitiveData: "no" })
    expect(proposal?.value).toBe("no")
  })

  it("returns null until the earlier question has been answered", () => {
    const proposal = proposeHasPii({ involvesSensitiveData: "" })
    expect(proposal).toBeNull()
  })
})
