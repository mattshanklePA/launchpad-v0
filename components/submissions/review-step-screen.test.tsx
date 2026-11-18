// F7-3 (#346): the ES2 review step screen. Other tenants keep today's screens.

import { describe, it, expect, vi } from "vitest"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { ReviewProcess, type ReviewProcessProps } from "./review-process"
import { ReviewStepList } from "./review-step-list"
import { es2 } from "@/lib/tenant/es2"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { render } from "@/components/cockpit/test-utils"
import { initialFormData } from "@/lib/steps"
import { buildReviewSteps, type ReviewStep, type ReviewStepKey } from "@/lib/reviewSteps"
import { computeRmfProfile } from "@/lib/nistRmf"
import type { TenantConfig } from "@/lib/tenant"

vi.mock("@/lib/tenant", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/tenant")>()
  const { es2: tenant } = await import("@/lib/tenant/es2")
  return { ...real, getTenant: () => tenant }
})
vi.mock("@/app/actions", () => ({ draftGovernanceFields: async () => ({}) }))

const submission = { id: "es2-acws-thing", submittedAt: "2026-08-18T00:00:00.000Z", status: "in_review", formData: { ...initialFormData, useCaseTitle: "Supplier risk scoring", submitterName: "Andre Duval", problemDefinition: "Reports take weeks." } } as never

const steps = (hasCluster: boolean): ReviewStep[] =>
  buildReviewSteps({ hasCluster, clusterSettled: false, highImpactSettled: false, rmfEnabled: true, rmfSettled: false, governanceSettled: false, dispositionSettled: false })

function props(tenant: TenantConfig, key: ReviewStepKey, extra: Partial<ReviewProcessProps> = {}): ReviewProcessProps {
  const profile = computeRmfProfile({ ...initialFormData, stageOfDevelopment: "pilot" } as never, tenant)
  return {
    submission,
    tenant,
    status: "in_review",
    reviewerName: "Avery",
    busy: false,
    setBusy: () => {},
    assistantName: "Plumb",
    steps: steps(false),
    currentStepKey: key,
    onNavigateStep: () => {},
    clusterAllMembers: [],
    onClusterDecided: () => {},
    fd: initialFormData,
    highImpactRec: { recommendation: "yes", reasons: ["r1", "r2", "r3", "r4"] },
    onSetHighImpact: () => {},
    resolvedRmf: { profile: { ...profile, overall: "attention", flags: ["Measure: No plan for testing after launch."] }, effectiveOverall: "attention", isProposal: true },
    rmfOverriding: false,
    setRmfOverriding: () => {},
    rmfOverrideNote: "",
    setRmfOverrideNote: () => {},
    onConfirmRmf: () => {},
    onOverrideRmf: () => {},
    governanceApplicableCount: 3,
    draftedByPlumb: 2,
    confirmedByReviewer: 0,
    byName: "",
    byEmail: "",
    onGovernanceSaved: async () => {},
    onApprove: () => {},
    onRequestInfo: () => {},
    onReject: () => {},
    comment: "",
    onCommentChange: () => {},
    onSend: () => {},
    sendDisabled: true,
    onDraftWithPlumb: () => {},
    draftDisabled: true,
    onSaveHighImpactAnswer: async () => true,
    onSaveRmfAnswer: async () => true,
    ...extra,
  }
}

const radios = (el: Element) => Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
const button = (el: Element, text: string) => Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes(text))!
const click = (b: Element) => act(() => (b as HTMLElement).click())
async function clickAsync(b: Element) {
  await act(async () => (b as HTMLElement).click())
}

describe("ES2 review step screen: the frame", () => {
  it("high impact: Plumb's advice in its own box, 'Your answer' with nothing selected", () => {
    const el = render(<ReviewProcess {...props(es2, "high_impact")} />)
    expect(el.textContent).toContain("PLUMB ADVICE")
    expect(el.textContent).toContain("Suggests: Not high-impact")
    expect(el.querySelectorAll('[data-review="plumb-advice"] li')).toHaveLength(3)
    expect(el.textContent).toContain("Your answer")
    expect(el.textContent).toContain("Nothing is selected until you choose.")
    expect(el.textContent).toContain("Your reason (required if you disagree with Plumb)")
    expect(radios(el)).toHaveLength(3)
    expect(radios(el).some((r) => r.checked)).toBe(false)
  })

  it("risk framework: no radio selected, and what needs attention is shown", () => {
    const el = render(<ReviewProcess {...props(es2, "rmf")} />)
    expect(radios(el).length).toBeGreaterThan(0)
    expect(radios(el).some((r) => r.checked)).toBe(false)
    expect(el.querySelector('[data-review="needs-attention"]')!.textContent).toContain("Needs attention: No plan for testing after launch.")
  })

  it("risk framework: says so when the data does not say what needs attention", () => {
    const base = props(es2, "rmf")
    const el = render(<ReviewProcess {...base} resolvedRmf={{ ...base.resolvedRmf!, profile: { ...base.resolvedRmf!.profile, flags: [] } }} />)
    expect(el.querySelector('[data-review="needs-attention"]')!.textContent).toBe("Plumb could not tell what is missing. Read the submission.")
  })

  it("a saved answer shows as selected; nothing else does", () => {
    const el = render(<ReviewProcess {...props(es2, "high_impact", { fd: { ...initialFormData, highImpact: "not_high_impact" } })} />)
    expect(radios(el).filter((r) => r.checked).map((r) => r.value)).toEqual(["not_high_impact"])
  })

  it("inventory fields: the draft is advice; no field value is filled in", () => {
    const el = render(<ReviewProcess {...props(es2, "governance")} />)
    expect(el.textContent).toContain("PLUMB ADVICE")
    expect(el.textContent).toContain("Your answer")
    for (const input of Array.from(el.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])'))) expect(input.value).toBe("")
  })

  it("overlap step: keeps its own decision controls inside the frame", () => {
    const cluster = { memberIds: ["a", "b"], bureaus: ["x", "y"], maxSimilarity: 0.9 } as never
    const el = render(<ReviewProcess {...props(es2, "cluster", { steps: steps(true), cluster, clusterAllMembers: [submission, submission] })} />)
    expect(el.textContent).toContain("Are these one effort?")
    expect(el.textContent).toContain("Your answer")
    expect(el.textContent).toContain("PLUMB ADVICE")
  })

  it("step questions use the plain wording", () => {
    const titles: [ReviewStepKey, string][] = [
      ["high_impact", "Is this high impact?"],
      ["rmf", "Does the risk profile hold?"],
      ["governance", "Are the inventory fields right?"],
      ["disposition", "Decide"],
    ]
    for (const [key, title] of titles) {
      const el = render(<ReviewProcess {...props(es2, key)} />)
      expect(el.querySelector('[data-cockpit="section-title"]')!.textContent).toBe(title)
    }
  })

  it("shows no step counter and no record code", () => {
    for (const key of ["high_impact", "rmf", "governance", "disposition"] as ReviewStepKey[]) {
      const el = render(<ReviewProcess {...props(es2, key)} />)
      expect(el.textContent).not.toMatch(/Step \d+ of \d+/)
      expect(el.textContent).not.toMatch(/\bKS-\d+/)
      expect(el.textContent).not.toMatch(/\brequires?\b/i)
    }
  })
})

describe("ES2 review step screen: while Plumb reads", () => {
  const waiting = (extra: Partial<ReviewProcessProps> = {}) => ({ reading: true, governanceDone: false, recommendationDone: false, onSkipToSteps: () => {}, ...extra })

  it("keeps the same title and shows the waiting words in the advice box", () => {
    const reading = render(<ReviewProcess {...props(es2, "disposition", waiting())} />)
    const landed = render(<ReviewProcess {...props(es2, "disposition", { reading: false })} />)
    const title = (el: Element) => el.querySelector('[data-cockpit="section-title"]')!.textContent
    expect(title(reading)).toBe(title(landed))
    const box = reading.querySelector('[data-review="plumb-advice"]')!
    expect(box.textContent).toContain("Plumb is reading this idea. Advice, not a gate.")
    expect(box.textContent).toContain("Draft the inventory fields")
    expect(box.textContent).toContain("Write the advice")
    expect(reading.textContent).not.toMatch(/Step \d+ of \d+/)
    expect(landed.textContent).not.toContain("Plumb is reading this idea")
  })

  it("each line says Working or Done from its own call", () => {
    const lines = (el: Element) => Array.from(el.querySelectorAll('[data-review="wait-line"]')).map((l) => l.textContent)
    expect(lines(render(<ReviewProcess {...props(es2, "high_impact", waiting())} />))).toEqual([
      "Draft the inventory fieldsWorking",
      "Write the adviceWorking",
    ])
    // The read is back, the draft is not: still waiting, the draft line says Working.
    const half = render(<ReviewProcess {...props(es2, "high_impact", waiting({ recommendationDone: true }))} />)
    expect(lines(half)).toEqual(["Draft the inventory fieldsWorking", "Write the adviceDone"])
    expect(half.textContent).toContain("Plumb is reading this idea. Advice, not a gate.")
  })

  it("has no countdown, no 'seconds', no similar-ideas line", () => {
    const el = render(<ReviewProcess {...props(es2, "high_impact", waiting())} />)
    expect(el.textContent).not.toMatch(/seconds?/i)
    expect(el.textContent).not.toContain("Check for similar ideas")
  })

  it("shows the 'You don't have to wait' panel with the button, only while waiting", () => {
    const onSkip = vi.fn()
    const el = render(<ReviewProcess {...props(es2, "high_impact", waiting({ onSkipToSteps: onSkip }))} />)
    expect(el.textContent).toContain("You don't have to wait")
    expect(el.textContent).toContain("The submission is ready to read now, and your answer stays open. Plumb's read arrives as advice.")
    click(button(el, "Read the submission"))
    expect(onSkip).toHaveBeenCalled()
    expect(render(<ReviewProcess {...props(es2, "high_impact", { reading: false })} />).textContent).not.toContain("You don't have to wait")
  })

  it("the reviewer can choose and save a step while the read is pending", async () => {
    const save = vi.fn(async () => true)
    const go = vi.fn()
    const el = render(<ReviewProcess {...props(es2, "high_impact", waiting({ onSaveHighImpactAnswer: save, onNavigateStep: go }))} />)
    expect(radios(el)).toHaveLength(3)
    click(radios(el).find((r) => r.value === "not_high_impact")!)
    await clickAsync(button(el, "Save and go to step"))
    expect(save).toHaveBeenCalledWith("not_high_impact", undefined)
    expect(go).toHaveBeenCalled()
  })

  it("the read arriving keeps the chosen answer and the typed reason", () => {
    const base = props(es2, "high_impact", waiting())
    const c = document.createElement("div")
    document.body.appendChild(c)
    const root = createRoot(c)
    act(() => root.render(<ReviewProcess {...base} />))
    act(() => radios(c).find((r) => r.value === "high_impact")!.click())
    const input = c.querySelector<HTMLInputElement>("#high_impact-reason")!
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Touches benefits decisions")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    act(() => root.render(<ReviewProcess {...base} reading={false} governanceDone recommendationDone />))
    expect(c.textContent).not.toContain("Plumb is reading this idea")
    expect(radios(c).find((r) => r.value === "high_impact")!.checked).toBe(true)
    expect(c.querySelector<HTMLInputElement>("#high_impact-reason")!.value).toBe("Touches benefits decisions")
    act(() => root.unmount())
    c.remove()
  })

  it("a failed read shows the plain sentence and the step can still be saved", async () => {
    const save = vi.fn(async () => true)
    const el = render(<ReviewProcess {...props(es2, "high_impact", { reading: false, readFailed: true, onSaveHighImpactAnswer: save })} />)
    expect(el.querySelector('[data-review="plumb-advice"]')!.textContent).toContain("Plumb's read is not available right now. You can still review and decide.")
    expect(el.textContent).not.toContain("You don't have to wait")
    click(radios(el).find((r) => r.value === "not_high_impact")!)
    await clickAsync(button(el, "Save and go to step"))
    expect(save).toHaveBeenCalled()
  })

  it("doc ignores the waiting props: the step content shows, as today", () => {
    const el = render(<ReviewProcess {...props(doc, "high_impact", waiting())} />)
    expect(el.textContent).not.toContain("Plumb is reading this idea")
    expect(el.textContent).not.toContain("Draft the inventory fields")
  })
})

describe("ES2 review step screen: saving", () => {
  it("choosing differently from Plumb with no reason explains what is needed and saves nothing", async () => {
    const save = vi.fn(async () => true)
    const go = vi.fn()
    const el = render(<ReviewProcess {...props(es2, "high_impact", { onSaveHighImpactAnswer: save, onNavigateStep: go })} />)
    click(radios(el).find((r) => r.value === "high_impact")!)
    await clickAsync(button(el, "Save and go to step"))
    expect(save).not.toHaveBeenCalled()
    expect(go).not.toHaveBeenCalled()
    expect(el.querySelector('[role="status"]')!.textContent).toBe("Add a one-line reason when your answer differs from Plumb's.")
  })

  it("saves a differing choice with its reason, then goes to the next step", async () => {
    const save = vi.fn(async () => true)
    const go = vi.fn()
    const el = render(<ReviewProcess {...props(es2, "high_impact", { onSaveHighImpactAnswer: save, onNavigateStep: go })} />)
    click(radios(el).find((r) => r.value === "high_impact")!)
    const input = el.querySelector<HTMLInputElement>("#high_impact-reason")!
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!
      set.call(input, "No people are affected")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await clickAsync(button(el, "Save and go to step 2"))
    expect(save).toHaveBeenCalledWith("high_impact", "No people are affected")
    expect(go).toHaveBeenCalledWith("rmf")
  })

  it("saving a choice that matches Plumb needs no reason", async () => {
    const save = vi.fn(async () => true)
    const el = render(<ReviewProcess {...props(es2, "high_impact", { onSaveHighImpactAnswer: save })} />)
    click(radios(el).find((r) => r.value === "not_high_impact")!)
    await clickAsync(button(el, "Save and go to step"))
    expect(save).toHaveBeenCalledWith("not_high_impact", undefined)
  })

  it("does not move on when the save did not go through", async () => {
    const go = vi.fn()
    const el = render(<ReviewProcess {...props(es2, "high_impact", { onSaveHighImpactAnswer: async () => false, onNavigateStep: go })} />)
    click(radios(el).find((r) => r.value === "not_high_impact")!)
    await clickAsync(button(el, "Save and go to step"))
    expect(go).not.toHaveBeenCalled()
  })

  it("Back goes to the step before", () => {
    const go = vi.fn()
    const el = render(<ReviewProcess {...props(es2, "rmf", { onNavigateStep: go })} />)
    click(button(el, "Back to step 1"))
    expect(go).toHaveBeenCalledWith("high_impact")
  })
})

describe("ES2 review step screen: the decision step", () => {
  it("draws no decision button as the main one before a choice, and has no Save button", () => {
    const el = render(<ReviewProcess {...props(es2, "disposition")} />)
    for (const label of ["Approve", "Request info", "Reject"]) expect(button(el, label).className).not.toContain("bg-primary")
    expect(el.textContent).not.toContain("Save and go to step")
    expect(el.textContent).toContain("Back to step 3")
  })
})

describe("ES2 review step screen: one step list", () => {
  const render2 = (hasCluster: boolean, current: ReviewStepKey = "high_impact") =>
    render(<ReviewStepList steps={steps(hasCluster)} currentStepKey={current} onNavigateStep={() => {}} tenant={es2} submission={submission} status="in_review" />)

  it("an idea in an overlap group shows five steps; one outside shows four", () => {
    expect(render2(true).querySelectorAll("ol li")).toHaveLength(5)
    expect(render2(false).querySelectorAll("ol li")).toHaveLength(4)
  })

  it("gives each step a word as well as a mark, and marks the current one", () => {
    const el = render2(false, "rmf")
    const items = Array.from(el.querySelectorAll("ol li button"))
    expect(items.map((b) => b.textContent)).toEqual(["High impactTo do", "Risk frameworkCurrent", "Inventory fieldsTo do", "DecisionTo do"])
    expect(items[1].getAttribute("aria-current")).toBe("step")
    expect(el.textContent).not.toMatch(/Step \d+ of \d+/)
  })

  it("shows the submission summary without a record code", () => {
    const el = render2(false)
    expect(el.textContent).toContain("The submission")
    expect(el.textContent).toContain("Supplier risk scoring")
    expect(el.textContent).toContain("Problem")
    expect(el.textContent).toContain("Who uses it")
    expect(el.textContent).toContain("Read the full submission")
    expect(el.textContent).not.toMatch(/\bKS-\d+|es2-acws/)
  })
})

describe("the other tenants' review screens are unchanged", () => {
  it.each([
    ["uspto", uspto],
    ["doc", doc],
    ["dow", dow],
  ])("%s keeps the guided process and none of the new wording", (_name, tenant) => {
    expect(tenant.features.reviewerDecides).toBeFalsy()
    const el = render(<ReviewProcess {...props(tenant, "high_impact")} />)
    for (const word of ["PLUMB ADVICE", "Your answer", "Nothing is selected until you choose.", "Save and go to step"]) {
      expect(el.textContent).not.toContain(word)
    }
    expect(el.textContent).toContain("Step 1 of 4")
  })
})
