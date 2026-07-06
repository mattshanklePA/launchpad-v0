import { describe, it, expect } from "vitest"
import { determineReportability } from "@/lib/ombReportability"

describe("determineReportability", () => {
  it("is reportable when it's not NSS/IC, not research-only, and a stage is set", () => {
    const result = determineReportability({
      stageOfDevelopment: "pilot",
      nationalSecuritySystem: "no",
      researchOnly: "no",
      aiDecisionalImpact: "no",
    })
    expect(result.status).toBe("reportable")
    expect(result.reason).toMatch(/mission|service|public/i)
  })

  it("is reportable at every stage of development", () => {
    for (const stage of ["pre_deployment", "pilot", "deployed", "retired"] as const) {
      const result = determineReportability({
        stageOfDevelopment: stage,
        nationalSecuritySystem: "no",
        researchOnly: "no",
        aiDecisionalImpact: "no",
      })
      expect(result.status).toBe("reportable")
    }
  })

  it("is excluded for National Security System / Intelligence Community use", () => {
    const result = determineReportability({
      stageOfDevelopment: "deployed",
      nationalSecuritySystem: "yes",
      researchOnly: "no",
      aiDecisionalImpact: "no",
    })
    expect(result.status).toBe("excluded")
    expect(result.reason).toMatch(/National Security System/)
  })

  it("is excluded for research-only use", () => {
    const result = determineReportability({
      stageOfDevelopment: "pre_deployment",
      nationalSecuritySystem: "no",
      researchOnly: "yes",
      aiDecisionalImpact: "no",
    })
    expect(result.status).toBe("excluded")
    expect(result.reason).toMatch(/research-only/i)
  })

  it("special case: research-only AI that controls/influences a decision about individuals is still reportable", () => {
    const result = determineReportability({
      stageOfDevelopment: "pilot",
      nationalSecuritySystem: "no",
      researchOnly: "yes",
      aiDecisionalImpact: "yes",
    })
    expect(result.status).toBe("reportable")
    expect(result.reason).toMatch(/decision/i)
  })

  it("NSS exclusion takes precedence over the research-decisional special case", () => {
    const result = determineReportability({
      stageOfDevelopment: "pilot",
      nationalSecuritySystem: "yes",
      researchOnly: "yes",
      aiDecisionalImpact: "yes",
    })
    expect(result.status).toBe("excluded")
  })

  it("is 'review' when stage of development hasn't been answered yet", () => {
    const result = determineReportability({
      stageOfDevelopment: "",
      nationalSecuritySystem: "no",
      researchOnly: "no",
      aiDecisionalImpact: "no",
    })
    expect(result.status).toBe("review")
    expect(result.reason).toBe("err on the side of inclusion (OMB guidance)")
  })

  it("is 'review' when NSS/IC status hasn't been answered yet", () => {
    const result = determineReportability({
      stageOfDevelopment: "pilot",
      nationalSecuritySystem: "",
      researchOnly: "no",
      aiDecisionalImpact: "no",
    })
    expect(result.status).toBe("review")
    expect(result.reason).toBe("err on the side of inclusion (OMB guidance)")
  })

  it("is 'review' when research-only status hasn't been answered yet", () => {
    const result = determineReportability({
      stageOfDevelopment: "pilot",
      nationalSecuritySystem: "no",
      researchOnly: "",
      aiDecisionalImpact: "no",
    })
    expect(result.status).toBe("review")
    expect(result.reason).toBe("err on the side of inclusion (OMB guidance)")
  })
})
