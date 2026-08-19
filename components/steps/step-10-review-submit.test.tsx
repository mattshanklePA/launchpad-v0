import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { initialFormData, type FormData } from "@/lib/steps"
import { getSubmissionReadiness } from "@/lib/submissionReadiness"

const setCurrentStep = vi.fn()
const setFormData = vi.fn()
const mockUseForm = vi.fn()

vi.mock("@/context/form-context", () => ({
  useForm: () => mockUseForm(),
}))

import { Step10ReviewSubmit } from "@/components/steps/step-10-review-submit"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
  mockUseForm.mockReset()
  setCurrentStep.mockReset()
  setFormData.mockReset()
})

function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

function buttonNamed(el: HTMLElement, text: string): HTMLButtonElement {
  const match = Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes(text))
  if (!match) throw new Error(`no button containing "${text}"`)
  return match as HTMLButtonElement
}

function click(b: HTMLElement) {
  act(() => b.dispatchEvent(new MouseEvent("click", { bubbles: true })))
}

// A submission with every gate field filled in — the base every scenario
// below overrides just the piece it's testing.
const COMPLETE: FormData = {
  ...initialFormData,
  submitterName: "Jane Doe",
  submitterEmail: "jane@example.gov",
  submitterRole: "role-a",
  submitterOffice: "unit-a",
  coreProblem: "Contract closeout files are checked by hand.",
  affectedBusinessUnits: ["unit-a"],
  targetAudience: "audience-a",
  impactedUsersCount: "50_500",
  targetUserContext: "Contract specialists at field offices.",
  proposedSolution: "An anomaly model flags likely-incomplete files.",
  userValue: "Fewer files reopened after audit.",
  businessValue: "Fewer audit findings per quarter.",
  useCaseTitle: "AI-Assisted Closeout Review",
  useCaseDescription: "Flags incomplete contract closeout files before archiving.",
  isWithheld: "no",
}

function mount(overrides: Partial<FormData>) {
  const formData = { ...COMPLETE, ...overrides }
  mockUseForm.mockReturnValue({ formData, setCurrentStep, setFormData })
  return { formData, el: render(<Step10ReviewSubmit />) }
}

describe("Step10ReviewSubmit — vetting readiness + submit gate (RD-2)", () => {
  it("disables Submit and renders the one missing item first, tagged required, when one deterministic item is missing", () => {
    const { el } = mount({ readinessScore: "ready", useCaseDescription: "" })

    const submit = buttonNamed(el, "Submit for Vetting")
    expect(submit.disabled).toBe(true)

    // The missing item's message appears, immediately followed by a
    // "required" tag, ahead of the rest of the card's content.
    const idx = el.textContent!.indexOf("Idea description")
    expect(idx).toBeGreaterThan(-1)
    expect(el.textContent!.slice(idx, idx + 60)).toContain("required")
  })

  it("enables Submit and shows the 'submit now' hint when nothing is missing but the verdict is needs_work", () => {
    const { el, formData } = mount({
      readinessScore: "needs_work",
      readinessSummary: "The problem is grounded but benefit isn't quantified.",
      executiveSummary: "An anomaly model would flag incomplete files.",
      readinessFindings: [],
    })

    expect(getSubmissionReadiness(formData).canSubmit).toBe(true)
    const submit = buttonNamed(el, "Submit for Vetting")
    expect(submit.disabled).toBe(false)
    expect(el.textContent).toContain("You can submit now. Expect a request for the missing answers.")
  })

  // Renamed from "shows 'N of M checks passed'": the deterministic count is
  // required-field completeness, not Plumb's quality verdict, and printing it
  // as "checks passed" directly above a NEEDS WORK verdict read as a
  // contradiction (issue #213 item 4).
  it("shows 'N of M required fields complete' matching getSubmissionReadiness", () => {
    const { el, formData } = mount({ readinessScore: "ready" })
    const readiness = getSubmissionReadiness(formData)
    const passed = readiness.totalChecks - readiness.missing.length
    expect(el.textContent).toContain(`${passed} of ${readiness.totalChecks} required fields complete`)
  })

  // Item 3: composing ReadinessResult inside this card used to duplicate the
  // verdict pill, the verdict sentence, and the Re-assess control — each
  // should appear exactly once now that ReadinessResult renders with
  // chrome={false} here.
  it("renders the verdict pill, verdict sentence, and a Re-assess control exactly once after an assessment", () => {
    const { el } = mount({
      readinessScore: "needs_work",
      readinessSummary: "The problem is grounded but benefit isn't quantified.",
      executiveSummary: "An anomaly model would flag incomplete files.",
      readinessFindings: [],
    })

    const needsWorkNodes = Array.from(el.querySelectorAll("span")).filter((n) => n.textContent === "Needs work")
    expect(needsWorkNodes.length).toBe(1)

    const verdictSentenceMatches = (el.textContent!.match(/Close the items below, then submit\./g) || []).length
    expect(verdictSentenceMatches).toBe(1)

    const reassessButtons = Array.from(el.querySelectorAll("button")).filter((b) => /re-assess/i.test(b.textContent || ""))
    expect(reassessButtons.length).toBe(1)
    expect(reassessButtons[0].textContent).toContain("Re-assess")
  })

  it("keeps the recap rows collapsed by default and expands one on click", () => {
    const { el } = mount({ readinessScore: "ready" })

    expect(el.textContent).not.toContain("Contract closeout files are checked by hand.")

    const expandButtons = Array.from(el.querySelectorAll<HTMLButtonElement>('button[aria-label^="Expand Step"]'))
    expect(expandButtons.length).toBeGreaterThan(0)
    const step2Expand = expandButtons.find((b) => b.getAttribute("aria-label") === "Expand Step 2 details")!
    click(step2Expand)

    expect(el.textContent).toContain("Contract closeout files are checked by hand.")
  })
})
