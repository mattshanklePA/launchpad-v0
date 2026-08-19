import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { initialFormData } from "@/lib/steps"

const setCurrentStep = vi.fn()
const mockUseForm = vi.fn()

vi.mock("@/context/form-context", () => ({
  useForm: () => mockUseForm(),
}))

import { StepHeader, formatSavedAgo } from "@/components/steps/step-frame"

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
  delete process.env.NEXT_PUBLIC_TENANT
})

function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

describe("StepHeader", () => {
  it("shows the eyebrow, title, and phase progress for step 2 of 6", () => {
    mockUseForm.mockReturnValue({
      currentStep: 2,
      setCurrentStep,
      formData: { ...initialFormData, submitterName: "Jane Doe" },
    })

    const el = render(<StepHeader />)

    expect(el.textContent).toContain("Step 2 of 6")
    expect(el.textContent).toContain("Business Problem & Opportunity")
    expect(el.textContent).toContain("What's the Problem or Opportunity?")
    expect(el.textContent).toContain("Phase 2 of 3")
    expect(el.textContent).toContain("of 6 done")
  })

  it("jumps to step 1 when the header's Edit link is clicked", () => {
    mockUseForm.mockReturnValue({
      currentStep: 3,
      setCurrentStep,
      formData: { ...initialFormData, submitterName: "Jane Doe" },
    })
    const el = render(<StepHeader />)
    const editButton = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Edit")
    expect(editButton).toBeTruthy()
    act(() => editButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(setCurrentStep).toHaveBeenCalledWith(1)
  })

  it("renders the Guided-mode link only when a handler is supplied", () => {
    mockUseForm.mockReturnValue({ currentStep: 2, setCurrentStep, formData: { ...initialFormData } })
    const withHandler = render(<StepHeader onSwitchToGuided={() => {}} />)
    expect(withHandler.textContent).toContain("Prefer a conversation? Guided mode")

    act(() => root!.unmount())
    container!.remove()
    const withoutHandler = render(<StepHeader />)
    expect(withoutHandler.textContent).not.toContain("Guided mode")
  })

  it("uses the mock's step 1 and step 6 header copy instead of the generic title/prompt", () => {
    mockUseForm.mockReturnValue({ currentStep: 1, setCurrentStep, formData: { ...initialFormData } })
    const step1 = render(<StepHeader />)
    expect(step1.textContent).toContain("Who are you?")
    expect(step1.textContent).toContain("Name and email come from your session. Confirm your role and office and go.")

    act(() => root!.unmount())
    container!.remove()

    mockUseForm.mockReturnValue({ currentStep: 6, setCurrentStep, formData: { ...initialFormData } })
    const step6 = render(<StepHeader />)
    expect(step6.textContent).toContain("Get Plumb's read before you submit.")
  })

  // Issue #213 item 6: an optional step (Technical Constraints, step 4) used
  // to count as done as soon as it was visited, with no content — the header
  // then disagreed with Review & Submit's own recap. `isStepComplete` now
  // reuses the same has-content rule for both (lib/wizardRecap.ts).
  it("reads '0 of 6 done' with no completed segment on a fresh, unvisited form", () => {
    mockUseForm.mockReturnValue({ currentStep: 1, setCurrentStep, formData: { ...initialFormData } })
    const el = render(<StepHeader />)

    expect(el.textContent).toContain("0 of 6 done")
    const segments = Array.from(el.querySelectorAll('[role="img"] > div'))
    expect(segments.length).toBe(6)
    expect(segments.some((s) => s.className.includes("bg-healthy"))).toBe(false)
  })

  it("counts the optional Technical Constraints step as done once it has content, not merely visited", () => {
    mockUseForm.mockReturnValue({
      currentStep: 1,
      setCurrentStep,
      formData: { ...initialFormData, dependencies: "Needs access to the authoritative records system." },
    })
    const el = render(<StepHeader />)

    expect(el.textContent).toContain("1 of 6 done")
    const segments = Array.from(el.querySelectorAll('[role="img"] > div'))
    expect(segments[3].className).toContain("bg-healthy") // step 4, zero-indexed
  })

  // Issue #213 item 7: the header printed the tenant's full option label
  // ("Acquisition, Training and Readiness (AT&R)"), which wrapped to two
  // lines and pushed the Edit link out of alignment. It should print the
  // short parenthetical form instead, same as decision-center.tsx's card meta.
  it("uses the tenant's short unit label in the header, not the full option label", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    mockUseForm.mockReturnValue({
      currentStep: 2,
      setCurrentStep,
      formData: { ...initialFormData, submitterName: "Jane Doe", submitterOffice: "atr" },
    })
    const el = render(<StepHeader />)

    expect(el.textContent).toContain("AT&R")
    expect(el.textContent).not.toContain("Acquisition, Training and Readiness")
  })
})

describe("formatSavedAgo", () => {
  it("reads 'Saved' before anything has persisted", () => {
    expect(formatSavedAgo(null, Date.now())).toBe("Saved")
  })

  it("reads 'Saved a moment ago' just after a save", () => {
    const now = 1_000_000
    expect(formatSavedAgo(now - 5_000, now)).toBe("Saved a moment ago")
  })

  it("reads minutes once enough time has passed", () => {
    const now = 1_000_000
    expect(formatSavedAgo(now - 4 * 60_000, now)).toBe("Saved 4m ago")
  })
})
