import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { initialFormData } from "@/lib/steps"

const setFormData = vi.fn()
const mockUseForm = vi.fn()

vi.mock("@/context/form-context", () => ({
  useForm: () => mockUseForm(),
}))

import { Step1SubmitterInfo } from "@/components/steps/step-1-submitter-info"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
  mockUseForm.mockReset()
  setFormData.mockReset()
})

function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

describe("Step1SubmitterInfo — sponsor disclosure", () => {
  it("hides the sponsor fields behind a link when no sponsor value exists", () => {
    mockUseForm.mockReturnValue({ formData: { ...initialFormData }, setFormData })
    const el = render(<Step1SubmitterInfo />)

    expect(el.querySelector("#sponsorName")).toBeNull()
    const addSponsor = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Add sponsor")
    expect(addSponsor).toBeTruthy()

    act(() => addSponsor!.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(el.querySelector("#sponsorName")).toBeTruthy()
  })

  it("shows the sponsor fields by default when a sponsor value already exists", () => {
    mockUseForm.mockReturnValue({
      formData: { ...initialFormData, sponsorName: "Jonathan Smith" },
      setFormData,
    })
    const el = render(<Step1SubmitterInfo />)

    expect(el.querySelector("#sponsorName")).toBeTruthy()
    const addSponsor = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Add sponsor")
    expect(addSponsor).toBeFalsy()
  })

  it("shows the 'From your session' hint under Name", () => {
    mockUseForm.mockReturnValue({ formData: { ...initialFormData }, setFormData })
    const el = render(<Step1SubmitterInfo />)
    expect(el.textContent).toContain("From your session.")
  })
})
