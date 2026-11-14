// NL-10 (#311): guided shows the same six-step line as the form, and no band of its own.

import { describe, it, expect, afterEach, vi } from "vitest"
import { initialFormData } from "@/lib/steps"
import { BandHost, render } from "@/components/cockpit/test-utils"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {} }) }))
vi.mock("@/app/actions", () => ({
  assessReadiness: () => Promise.resolve({}),
  validateAndRefineInput: () => Promise.resolve({}),
}))
vi.mock("@/context/form-context", () => ({
  useForm: () => ({ formData: { ...initialFormData, submitterName: "Jane Doe" }, setFormData: () => {}, resetForm: () => {} }),
}))

import { ConversationalIntake } from "./conversational-intake"

Element.prototype.scrollIntoView = () => {}
class RO { observe() {} unobserve() {} disconnect() {} }
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= RO

const prev = process.env.NEXT_PUBLIC_TENANT
afterEach(() => {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
  else process.env.NEXT_PUBLIC_TENANT = prev
})

describe("ConversationalIntake step line (NL-10)", () => {
  it("es2: one band, six numbered steps, the Guided/Form switch on the band's right", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    const el = render(
      <BandHost>
        <ConversationalIntake modeToggle={<span data-testid="toggle">toggle</span>} />
      </BandHost>,
    )
    expect(el.querySelectorAll('[data-cockpit="header-band"]').length).toBe(1)
    expect(el.querySelector('[data-band="eyebrow"]')?.textContent).toBe("SUBMIT AN IDEA · STEP 2 OF 6")
    const items = Array.from(el.querySelectorAll('[data-cockpit="submit-progress"] li'))
    expect(items.length).toBe(6)
    expect(items.map((li) => li.textContent?.replace(/\s*\(done\)$/, ""))).toEqual([
      "1Who you are", "2The problem", "3Your solution", "4Constraints", "5Name it", "6Review and send",
    ])
    expect(el.querySelector('[data-band="right"] [data-testid="toggle"]')).toBeTruthy()
  })

  it("doc: none of this renders", () => {
    process.env.NEXT_PUBLIC_TENANT = "doc"
    const el = render(<ConversationalIntake />)
    expect(el.querySelector("[data-cockpit]")).toBeNull()
  })
})
