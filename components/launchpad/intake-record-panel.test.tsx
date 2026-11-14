import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { IntakeRecordPanel } from "./intake-record-panel"
import { getGuidedSubmitGate } from "@/lib/guidedSubmitGate"
import { initialFormData, type FormData } from "@/lib/steps"
import { es2 } from "@/lib/tenant/es2"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  process.env.NEXT_PUBLIC_TENANT = "es2"
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  container?.remove()
  container = null
  root = null
  delete process.env.NEXT_PUBLIC_TENANT
})

function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

const complete: FormData = {
  ...initialFormData,
  submitterName: "Jane Doe",
  submitterEmail: "jane@example.gov",
  submitterRole: "product_owner",
  submitterOffice: "atr",
  useCaseTitle: "Closeout file checker",
  useCaseDescription: "Flags incomplete closeout files.",
  isWithheld: "no",
  coreProblem: "Files are checked by hand.",
  problemDefinition: "Files are checked by hand.",
  affectedBusinessUnits: ["acws"],
  targetAudience: "product_owner",
  impactedUsersCount: "50_500",
  targetUserContext: "Specialists at field offices.",
  proposedSolution: "A model flags files.",
  solutionSummary: "A model flags files.",
  userValue: "Fewer reopened files.",
  businessValue: "Fewer findings.",
}

function submitButton(el: HTMLElement) {
  return Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes("Submit for Vetting")) as
    | HTMLButtonElement
    | undefined
}

describe("IntakeRecordPanel — submit gate (#268)", () => {
  it("disables Submit and says what is missing, in the tenant's assistant name", () => {
    const fd = { ...complete, useCaseTitle: "" }
    const onSubmit = vi.fn()
    const el = render(
      <IntakeRecordPanel formData={fd} onFieldChange={() => {}} gate={getGuidedSubmitGate(fd, es2)} isSubmitting={false} onSubmit={onSubmit} />,
    )
    expect(submitButton(el)?.disabled).toBe(true)
    const reason = el.querySelector('[data-testid="submit-blocked-reason"]')?.textContent ?? ""
    expect(reason).toContain("Plumb")
    expect(reason).toContain("Idea title")
  })

  it("names a placeholder and keeps Submit disabled", () => {
    const fd = { ...complete, userValue: "Saves [NUMBER] hours." }
    const el = render(
      <IntakeRecordPanel formData={fd} onFieldChange={() => {}} gate={getGuidedSubmitGate(fd, es2)} isSubmitting={false} onSubmit={() => {}} />,
    )
    expect(submitButton(el)?.disabled).toBe(true)
    expect(el.textContent).toContain("[NUMBER]")
  })

  it("enables Submit when the gate passes", () => {
    const el = render(
      <IntakeRecordPanel formData={complete} onFieldChange={() => {}} gate={getGuidedSubmitGate(complete, es2)} isSubmitting={false} onSubmit={() => {}} />,
    )
    expect(submitButton(el)?.disabled).toBe(false)
  })
})
