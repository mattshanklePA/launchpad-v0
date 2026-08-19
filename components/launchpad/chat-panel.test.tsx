import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { initialFormData } from "@/lib/steps"
import type { ScoutResponse } from "@/app/actions"

const setFormData = vi.fn()
const mockUseForm = vi.fn()
const validateAndRefineInput = vi.fn()

vi.mock("@/context/form-context", () => ({
  useForm: () => mockUseForm(),
}))
vi.mock("@/app/actions", () => ({
  validateAndRefineInput: (...args: unknown[]) => validateAndRefineInput(...args),
}))

import { AIdChatPanel } from "@/components/launchpad/chat-panel"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
// jsdom doesn't implement scrollIntoView (used to keep the thread scrolled
// to its latest message) — stub it so mounting the panel doesn't throw.
Element.prototype.scrollIntoView = vi.fn()

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
  mockUseForm.mockReset()
  setFormData.mockReset()
  validateAndRefineInput.mockReset()
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
  if (!match) throw new Error(`no button containing "${text}" (saw: ${Array.from(el.querySelectorAll("button")).map((b) => b.textContent).join(" | ")})`)
  return match as HTMLButtonElement
}

async function click(b: HTMLElement) {
  await act(async () => {
    b.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()
  })
}

const Q1: ScoutResponse = {
  mode: "question",
  questionText: "How many closeout files go through this a month?",
  rationale: "Volume shapes the model's scope.",
  options: [
    { label: "100–500", isRecommended: false },
    { label: "500+", isRecommended: false },
    { label: "Other (let me type my own)", isRecommended: false },
    { label: "I have enough, give me the scaffold", isRecommended: false },
  ],
}

const Q2: ScoutResponse = {
  mode: "question",
  questionText: "Are the errors concentrated in certain file types, or spread evenly?",
  rationale: "If they cluster, the model can start narrow and prove itself faster.",
  options: [
    { label: "Concentrated", isRecommended: true },
    { label: "Spread evenly", isRecommended: false },
    { label: "Other (let me type my own)", isRecommended: false },
    { label: "I have enough, give me the scaffold", isRecommended: false },
  ],
}

const SCAFFOLD: ScoutResponse = {
  mode: "scaffold",
  summary: "Drafted from the thread.",
  fields: {
    problemDefinition: {
      value: "Contract specialists check [INSERT number] files a month before archiving.",
      rationale: "Ties the problem to the affected users.",
    },
  },
}

describe("AIdChatPanel — Plumb inline thread (RD-2)", () => {
  it("renders answered pairs, the live question with a Recommended tag, and both escape actions", async () => {
    mockUseForm.mockReturnValue({
      formData: { ...initialFormData, coreProblem: "Contract closeout files are checked by hand." },
      setFormData,
    })
    validateAndRefineInput.mockResolvedValueOnce(Q1)
    const el = render(<AIdChatPanel step={2} onApplySuggestion={vi.fn()} />)

    await click(buttonNamed(el, "Help Me with the Problem"))
    expect(el.textContent).toContain(Q1.questionText)

    validateAndRefineInput.mockResolvedValueOnce(Q2)
    await click(buttonNamed(el, "100–500"))

    // The first question is now an answered pair, not the live question.
    expect(el.textContent).toContain(Q1.questionText)
    expect(el.textContent).toContain("100–500")

    // The second question is live, with its rationale, a Recommended tag on
    // the model's suggested answer, and both escape actions.
    expect(el.textContent).toContain(Q2.questionText)
    expect(el.textContent).toContain(Q2.rationale)
    expect(el.textContent).toContain("Recommended")
    expect(() => buttonNamed(el, "Other (let me type my own)")).not.toThrow()
    expect(el.textContent).toContain("I have enough — write the summary")

    expect(el.textContent).toContain("1 answered")
  })

  it("shows the drafted summary with Apply/Edit actions and highlights bracketed placeholders", async () => {
    mockUseForm.mockReturnValue({
      formData: { ...initialFormData, coreProblem: "Contract closeout files are checked by hand." },
      setFormData,
    })
    const onApplySuggestion = vi.fn()
    validateAndRefineInput.mockResolvedValueOnce(Q1)
    const el = render(
      <AIdChatPanel
        step={2}
        onApplySuggestion={onApplySuggestion}
        summaryField={{ key: "problemDefinition", label: "Refined Problem & Users Summary", hint: "hint copy" }}
      />,
    )

    await click(buttonNamed(el, "Help Me with the Problem"))

    validateAndRefineInput.mockResolvedValueOnce(SCAFFOLD)
    await click(buttonNamed(el, "I have enough — write the summary"))

    expect(el.textContent).toContain("draft · not applied yet")
    expect(el.querySelector("mark")?.textContent).toBe("[INSERT number]")

    const applyButton = buttonNamed(el, "Apply to the field")
    await click(applyButton)
    expect(onApplySuggestion).toHaveBeenCalledWith({ problemDefinition: SCAFFOLD.fields.problemDefinition.value })
  })
})
