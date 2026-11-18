import { describe, it, expect } from "vitest"
import { getBeforeYouSend } from "@/lib/guidedSubmitGate"
import { getGuidedSubmitGate } from "@/lib/guidedSubmitGate"
import { initialFormData, type FormData } from "@/lib/steps"
import { doc } from "@/lib/tenant/doc"
import { uspto } from "@/lib/tenant/uspto"
import { es2 } from "@/lib/tenant/es2"
import { dow } from "@/lib/tenant/dow"
import type { TenantConfig } from "@/lib/tenant"

const TENANTS: [string, TenantConfig][] = [["uspto", uspto], ["doc", doc], ["dow", dow], ["es2", es2]]

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

const missingIds = (r: ReturnType<typeof getBeforeYouSend>) => r.rows.filter((x) => !x.done).map((x) => x.id)

describe("getBeforeYouSend", () => {
  it("complete idea: five rows done, no sixth row, Ready to send", () => {
    const r = getBeforeYouSend(complete(), doc)
    expect(r.rows).toHaveLength(5)
    expect(r.rows.every((x) => x.done)).toBe(true)
    expect(r.blanks).toEqual([])
    expect(r.ready).toBe(true)
    expect(r.summary).toBe("Ready to send")
  })

  it("rows are in the issue's order", () => {
    expect(getBeforeYouSend(complete(), doc).rows.map((x) => x.id)).toEqual(["idea", "who", "problem", "audience", "proposal"])
  })

  it.each(TENANTS)("%s: ready exactly when the gate allows it", (_id, tenant) => {
    const cases: Partial<FormData>[] = [
      {}, { useCaseTitle: "" }, { submitterOffice: "" }, { coreProblem: "" }, { affectedBusinessUnits: [] },
      { isWithheld: "" }, { userValue: "Saves [NUMBER] hours" }, { targetUserContext: "" },
      { coreProblem: "", problemDefinition: "Checked by hand.", proposedSolution: "", solutionSummary: "A model." },
      { coreProblem: "", problemDefinition: "[NUMBER] check by hand." },
    ]
    for (const c of cases) {
      const fd = complete(c)
      const r = getBeforeYouSend(fd, tenant)
      expect(r.ready).toBe(getGuidedSubmitGate(fd, tenant).canSubmit)
      expect(r.rows.every((x) => x.done)).toBe(r.ready)
    }
  })

  it("10 Nov idea: two rows missing, three blanks, 2 things left", () => {
    const r = getBeforeYouSend(
      complete({ useCaseTitle: "", submitterOffice: "", userValue: "Saves [NUMBER] hours", businessValue: "Saves [BUDGET $]", targetUserContext: "[DESCRIBE USERS]" }),
      doc,
    )
    expect(r.blanks).toHaveLength(3)
    expect(r.blanks.map((b) => b.field).sort()).toEqual(["businessValue", "targetUserContext", "userValue"])
    // title + office rows missing; the three blanks sit in the audience and proposal rows too
    expect(missingIds(r)).toEqual(["idea", "who", "audience", "proposal"])
    expect(r.summary).toMatch(/^4 things left: /)
  })

  it("10 Nov idea with blanks inside the two missing rows: 2 things left", () => {
    const r = getBeforeYouSend(
      complete({ useCaseTitle: "", submitterOffice: "", useCaseDescription: "[DESCRIBE]", submitterRole: "", submitterName: "[NAME]", submitterEmail: "[EMAIL]" }),
      doc,
    )
    expect(r.blanks).toHaveLength(3)
    expect(missingIds(r)).toEqual(["idea", "who"])
    expect(r.summary).toMatch(/^2 things left: /)
  })

  it("one blank in any gate field marks its row missing", () => {
    const rows: [keyof FormData, string][] = [
      ["useCaseTitle", "idea"], ["useCaseDescription", "idea"],
      ["submitterName", "who"], ["submitterEmail", "who"],
      ["coreProblem", "problem"], ["targetUserContext", "audience"],
      ["proposedSolution", "proposal"], ["userValue", "proposal"], ["businessValue", "proposal"],
    ]
    for (const [field, id] of rows) {
      const r = getBeforeYouSend(complete({ [field]: "Needs [NUMBER] here" }), doc)
      expect(missingIds(r)).toEqual([id])
      expect(r.blanks.map((b) => b.field)).toEqual([field])
      expect(r.ready).toBe(false)
    }
  })

  it("two fields with the same blank text: both rows missing until both fixed", () => {
    const fd = complete({ userValue: "Saves [NUMBER]", targetUserContext: "Saves [NUMBER]" })
    const r = getBeforeYouSend(fd, doc)
    expect(missingIds(r)).toEqual(["audience", "proposal"])
    expect(r.blanks.map((b) => b.field).sort()).toEqual(["targetUserContext", "userValue"])
    const half = getBeforeYouSend({ ...fd, userValue: "Fewer files reopened." }, doc)
    expect(missingIds(half)).toEqual(["audience"])
  })

  it("a guided draft folded into its form field counts once", () => {
    const r = getBeforeYouSend(complete({ coreProblem: "", problemDefinition: "[NUMBER] check by hand." }), doc)
    expect(r.blanks).toHaveLength(1)
    expect(missingIds(r)).toEqual(["problem"])
  })

  it("each missing row carries the first field to fix", () => {
    const r = getBeforeYouSend(complete({ useCaseDescription: "", submitterRole: "", submitterOffice: "" }), doc)
    expect(r.rows.find((x) => x.id === "idea")!.fixField).toBe("useCaseDescription")
    expect(r.rows.find((x) => x.id === "who")!.fixField).toBe("submitterOffice")
    expect(r.rows.find((x) => x.id === "problem")!.fixField).toBeUndefined()
  })

  it("office row uses the tenant's word", () => {
    expect(getBeforeYouSend(complete(), doc).rows[1].label.toLowerCase()).toContain("bureau")
    expect(getBeforeYouSend(complete(), es2).rows[1].label.toLowerCase()).toContain("program office")
    expect(getBeforeYouSend(complete(), dow).rows[1].label.toLowerCase()).toContain("command")
  })

  it("a withheld reason that is not shown is not demanded", () => {
    const r = getBeforeYouSend(complete({ isWithheld: "no" }), doc)
    expect(r.rows[4].done).toBe(true)
  })

  it("early-stage rating on the draft: not Ready to send, shown as its own row", () => {
    const r = getBeforeYouSend(complete({ readinessScore: "early_stage" }), doc)
    expect(getGuidedSubmitGate(complete({ readinessScore: "early_stage" }), doc).canSubmit).toBe(true)
    expect(r.ready).toBe(false)
    expect(r.summary).not.toBe("Ready to send")
    expect(r.rows.at(-1)!.id).toBe("readiness")
    expect(r.rows.at(-1)!.done).toBe(false)
  })

  it("summary reads right for 1, 2 and 5 things left", () => {
    expect(getBeforeYouSend(complete({ useCaseTitle: "" }), doc).summary).toBe("1 thing left: idea title and short description.")
    const two = getBeforeYouSend(complete({ useCaseTitle: "", coreProblem: "" }), doc).summary
    expect(two).toBe("2 things left: idea title and short description, the problem in your words.")
    const five = getBeforeYouSend(
      complete({ useCaseTitle: "", submitterOffice: "", coreProblem: "", targetUserContext: "", userValue: "" }),
      doc,
    )
    expect(five.summary).toMatch(/^5 things left: .+, .+, .+, .+, .+\.$/)
  })
})
