import { describe, it, expect } from "vitest"

import { buildSubmissionContext, buildQuestionModeGuidance, exampleUserGroups } from "@/lib/scoutPrompt"
import { initialFormData, type FormData } from "@/lib/steps"
import { ALL_TENANTS } from "@/lib/tenant"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { es2 } from "@/lib/tenant/es2"

// ES2-9. Two defects, one file.
//
// 1. buildSubmissionContext() gated each block on the step being PAST
//    (`currentStep > 2`), so while coaching step 2 the co-pilot was handed none
//    of the problem statement and audience the submitter had just typed. It
//    then asked for monthly file volume, invented three ranges, and tagged one
//    "(Recommended)" — with an almost empty context to recommend from.
//
// 2. The QUESTION MODE example user groups were a hardcoded USPTO list
//    ("examiners, IT staff, OGC attorneys, applicants, the public, contract
//    admins"), shipped verbatim to every tenant including the Army instance.

function form(overrides: Partial<FormData> = {}): FormData {
  return { ...initialFormData, ...overrides }
}

const STEP_2 = {
  problemDefinition: "Contract closeout packets are assembled by hand and take 6 weeks.",
  targetUserSummary: "Contract specialists at the ACC field offices.",
}
const STEP_3 = {
  solutionSummary: "A retrieval model that assembles the closeout packet from the contract file.",
  userValue: "Specialists stop re-keying the same data into four systems.",
  businessValue: "Closeout backlog shrinks without adding headcount.",
}
const STEP_4 = { dependencies: "Reads from PIEE; needs an ATO before it touches live contract data." }

describe("buildSubmissionContext includes the step being coached (ES2-9 #1)", () => {
  it("gives the co-pilot the problem and target users while coaching step 2", () => {
    const context = buildSubmissionContext(form(STEP_2), 2, es2)
    expect(context).toContain(STEP_2.problemDefinition)
    expect(context).toContain(STEP_2.targetUserSummary)
  })

  it("falls back to coreProblem and targetUserContext on step 2", () => {
    const context = buildSubmissionContext(
      form({ coreProblem: "Manual triage of purchase requests.", targetUserContext: "KOs in the 419th." }),
      2,
      es2,
    )
    expect(context).toContain("Manual triage of purchase requests.")
    expect(context).toContain("KOs in the 419th.")
  })

  it("gives the co-pilot the solution and both benefits while coaching step 3", () => {
    const context = buildSubmissionContext(form({ ...STEP_2, ...STEP_3 }), 3, es2)
    expect(context).toContain(STEP_3.solutionSummary)
    expect(context).toContain(STEP_3.userValue)
    expect(context).toContain(STEP_3.businessValue)
    // Step 2 is now behind the submitter and must still carry through.
    expect(context).toContain(STEP_2.problemDefinition)
  })

  it("gives the co-pilot the constraints while coaching step 4", () => {
    const context = buildSubmissionContext(form({ ...STEP_2, ...STEP_3, ...STEP_4 }), 4, es2)
    expect(context).toContain(STEP_4.dependencies)
  })

  it("still reports no context when the submitter has typed nothing", () => {
    const context = buildSubmissionContext(form(), 2, es2)
    expect(context).toContain(es2.assistantName)
    expect(context).toContain("No prior context")
  })

  it("does not surface a later step's fields on an earlier step", () => {
    const context = buildSubmissionContext(form({ ...STEP_2, ...STEP_3, ...STEP_4 }), 2, es2)
    expect(context).toContain(STEP_2.problemDefinition)
    expect(context).not.toContain(STEP_3.solutionSummary)
    expect(context).not.toContain(STEP_4.dependencies)
  })
})

describe("buildSubmissionContext attributes the current step correctly (ES2-9 #2)", () => {
  it("labels step 2's block as an in-progress draft while coaching step 2", () => {
    const context = buildSubmissionContext(form(STEP_2), 2, es2)
    expect(context).toContain("- Problem (Step 2, in progress):")
    expect(context).toContain("- Target users (Step 2, in progress):")
    expect(context).not.toContain("from Step 2")
  })

  it("labels step 2's block as a completed previous answer once past it", () => {
    const context = buildSubmissionContext(form({ ...STEP_2, ...STEP_3 }), 3, es2)
    expect(context).toContain("- Problem (from Step 2):")
    expect(context).toContain("- Target users (from Step 2):")
    expect(context).toContain("- Proposed solution (Step 3, in progress):")
    expect(context).toContain("- Expected user benefit (Step 3, in progress):")
    expect(context).toContain("- Expected business benefit (Step 3, in progress):")
  })

  it("labels step 4's constraints as in-progress on step 4 and as prior on step 5", () => {
    const all = { ...STEP_2, ...STEP_3, ...STEP_4 }
    expect(buildSubmissionContext(form(all), 4, es2)).toContain("- Technical constraints (Step 4, in progress):")
    expect(buildSubmissionContext(form(all), 5, es2)).toContain("- Technical constraints (from Step 4):")
  })

  it("never labels the step being coached as a previous step's answer", () => {
    const all = { ...STEP_2, ...STEP_3, ...STEP_4 }
    for (const step of [2, 3, 4]) {
      const context = buildSubmissionContext(form(all), step, es2)
      expect(context, `step ${step}`).not.toContain(`from Step ${step}`)
    }
  })
})

describe("QUESTION MODE recommendation rule (ES2-9 #3)", () => {
  const guidance = buildQuestionModeGuidance(es2)

  it("keeps the one-recommendation rule", () => {
    expect(guidance).toContain("Mark exactly ONE option as isRecommended=true")
  })

  it("prohibits recommending an answer to a quantity question", () => {
    for (const term of ["quantity", "volume", "frequency", "duration", "headcount"]) {
      expect(guidance.toLowerCase(), term).toContain(term)
    }
    expect(guidance).toMatch(/NEVER mark an option as recommended/)
    expect(guidance).toMatch(/only the submitter can know/)
  })

  it("reserves recommendation for classification questions", () => {
    expect(guidance.toLowerCase()).toContain("classification question")
  })
})

describe("QUESTION MODE example user groups come from the tenant (ES2-9 #4)", () => {
  // These appear in no tenant's configuration. They were USPTO vocabulary
  // reaching every other instance through the prompt.
  const HARDCODED_USPTO = ["OGC attorneys", "contract admins", "the public", "examiners"]

  it("carries no hardcoded USPTO role list for any tenant", () => {
    for (const tenant of ALL_TENANTS) {
      const guidance = buildQuestionModeGuidance(tenant)
      expect(
        guidance,
        `${tenant.id} still lists hardcoded USPTO groups`,
      ).not.toContain('do NOT default to "examiners"')
      for (const term of ["OGC attorneys", "contract admins"]) {
        expect(guidance, `${tenant.id}: ${term}`).not.toContain(term)
      }
    }
  })

  it("names the Army instance's own groups, not USPTO's", () => {
    const guidance = buildQuestionModeGuidance(es2)
    expect(guidance).toContain("Contracting Officer")
    expect(guidance).toContain("Soldier / Trainee")
    expect(guidance).toContain("Training Developer")
    for (const term of HARDCODED_USPTO) {
      expect(guidance.toLowerCase(), term).not.toContain(term.toLowerCase())
    }
  })

  it("names each other tenant's own groups", () => {
    expect(buildQuestionModeGuidance(uspto)).toContain("Patent Examiner")
    expect(buildQuestionModeGuidance(doc)).toContain("Bureau Staff / Analyst")
    expect(buildQuestionModeGuidance(dow)).toContain("Operator / Warfighter")
  })

  it("keeps the do-not-default instruction, phrased generically", () => {
    for (const tenant of ALL_TENANTS) {
      expect(buildQuestionModeGuidance(tenant), tenant.id).toMatch(/do NOT default/)
    }
  })

  it("draws the groups from submitterRoles and the audience options, minus 'Other'", () => {
    for (const tenant of ALL_TENANTS) {
      const groups = exampleUserGroups(tenant)
      const configured = new Set([...tenant.targetAudiences, ...tenant.submitterRoles].map((o) => o.label))
      expect(groups.length, tenant.id).toBeGreaterThan(2)
      expect(new Set(groups).size, `${tenant.id} has duplicates`).toBe(groups.length)
      expect(groups, `${tenant.id} includes Other`).not.toContain("Other")
      for (const g of groups) expect(configured.has(g), `${tenant.id}: ${g}`).toBe(true)
    }
  })
})
