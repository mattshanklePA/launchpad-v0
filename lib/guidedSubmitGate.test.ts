import { describe, it, expect } from "vitest"
import { findPlaceholders } from "@/lib/placeholderCheck"
import { getGuidedSubmitGate } from "@/lib/guidedSubmitGate"
import { getSubmissionReadiness } from "@/lib/submissionReadiness"
import { initialFormData, type FormData } from "@/lib/steps"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import { es2 } from "@/lib/tenant/es2"
import { dow } from "@/lib/tenant/dow"
import type { TenantConfig } from "@/lib/tenant"

// Everything form mode requires, filled. The AI readiness score is deliberately
// absent: guided mode runs that assessment itself at submit time.
function complete(overrides: Partial<FormData> = {}): FormData {
  return {
    ...initialFormData,
    submitterName: "Jane Doe",
    submitterEmail: "jane@example.gov",
    submitterRole: "product_owner",
    submitterOffice: "census",
    useCaseTitle: "Closeout file checker",
    useCaseDescription: "Flags incomplete closeout files before archiving.",
    isWithheld: "no",
    coreProblem: "Closeout files are checked by hand.",
    affectedBusinessUnits: ["cross_functional"],
    targetAudience: "product_owner",
    impactedUsersCount: "50_500",
    targetUserContext: "Specialists at field offices.",
    proposedSolution: "A model flags likely-incomplete files.",
    userValue: "Fewer files reopened.",
    businessValue: "Fewer audit findings.",
    ...overrides,
  }
}

describe("findPlaceholders — what counts as a placeholder", () => {
  it("matches bracketed capitals", () => {
    expect(findPlaceholders("We have [NUMBER] contracting officers")).toEqual(["[NUMBER]"])
    expect(findPlaceholders("Saves [QUANTIFY HOURS...] each week")).toEqual(["[QUANTIFY HOURS...]"])
    expect(findPlaceholders("[HOURS/WEEK] and [BUDGET $]")).toEqual(["[HOURS/WEEK]", "[BUDGET $]"])
  })

  it("ignores ordinary brackets in prose", () => {
    expect(findPlaceholders("as described earlier (see [1])")).toEqual([])
    expect(findPlaceholders("a [optional] note")).toEqual([])
    expect(findPlaceholders("the [Quantify later] note")).toEqual([])
    expect(findPlaceholders("array [0] and [A]")).toEqual([])
    expect(findPlaceholders("")).toEqual([])
    expect(findPlaceholders(undefined)).toEqual([])
  })
})

describe("getGuidedSubmitGate", () => {
  it("allows a complete idea", () => {
    const gate = getGuidedSubmitGate(complete(), doc)
    expect(gate.canSubmit).toBe(true)
    expect(gate.message).toBe("")
  })

  it("refuses with no title", () => {
    const gate = getGuidedSubmitGate(complete({ useCaseTitle: "  " }), doc)
    expect(gate.canSubmit).toBe(false)
    expect(gate.missing.map((m) => m.message)).toContain("Idea title")
  })

  it("refuses with no program office", () => {
    const gate = getGuidedSubmitGate(complete({ submitterOffice: "" }), doc)
    expect(gate.canSubmit).toBe(false)
    expect(gate.missing.map((m) => m.message)).toContain(doc.tierLabels.unit)
  })

  it("refuses when a required field still holds a [CAPITALS] placeholder, naming it", () => {
    const gate = getGuidedSubmitGate(complete({ userValue: "Saves [NUMBER] hours a week." }), doc)
    expect(gate.canSubmit).toBe(false)
    expect(gate.placeholders).toEqual([
      expect.objectContaining({ field: "userValue", tokens: ["[NUMBER]"] }),
    ])
    expect(gate.message).toContain("[NUMBER]")
  })

  it("does not refuse on ordinary brackets", () => {
    const gate = getGuidedSubmitGate(complete({ userValue: "Saves time (see [1]) [optional]" }), doc)
    expect(gate.canSubmit).toBe(true)
  })

  it("treats the guided problem and solution drafts as the required problem and solution", () => {
    const gate = getGuidedSubmitGate(
      complete({ coreProblem: "", proposedSolution: "", problemDefinition: "Checked by hand.", solutionSummary: "A model flags files." }),
      doc,
    )
    expect(gate.canSubmit).toBe(true)
  })

  it("catches a placeholder in a guided draft", () => {
    const gate = getGuidedSubmitGate(
      complete({ coreProblem: "", problemDefinition: "[NUMBER] officers check by hand." }),
      doc,
    )
    expect(gate.canSubmit).toBe(false)
    // Reported against the required field the draft fills.
    expect(gate.placeholders.map((p) => p.field)).toContain("coreProblem")
    expect(gate.message).toContain("[NUMBER]")
  })

  it.each([["uspto", uspto], ["doc", doc], ["dow", dow], ["es2", es2]] as [string, TenantConfig][])(
    "%s: allowed exactly when form mode's readiness allows it (ignoring the AI score run at submit)",
    (_id, tenant) => {
      const cases: Partial<FormData>[] = [
        {},
        { useCaseTitle: "" },
        { submitterOffice: "" },
        { coreProblem: "" },
        { affectedBusinessUnits: [] },
        { isWithheld: "" },
      ]
      for (const c of cases) {
        const fd = complete(c)
        const form = getSubmissionReadiness({ ...fd, readinessScore: "ready" }, tenant)
        expect(getGuidedSubmitGate(fd, tenant).canSubmit).toBe(form.canSubmit)
      }
    },
  )

  it("names the assistant from the tenant, not a hardcoded word", () => {
    const blocked = { useCaseTitle: "" }
    expect(getGuidedSubmitGate(complete(blocked), uspto).message).toContain("Scout")
    expect(getGuidedSubmitGate(complete(blocked), uspto).message).not.toContain("Plumb")
    for (const t of [doc, es2]) {
      expect(getGuidedSubmitGate(complete(blocked), t).message).toContain("Plumb")
    }
  })
})
