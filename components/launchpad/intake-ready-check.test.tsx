import { describe, it, expect, afterEach, beforeEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { IntakeReadyCheckPanel } from "./intake-ready-check"
import { IntakeRecordPanel } from "./intake-record-panel"
import { getGuidedSubmitGate } from "@/lib/guidedSubmitGate"
import { initialFormData, type FormData } from "@/lib/steps"
import { es2 } from "@/lib/tenant/es2"
import { uspto } from "@/lib/tenant/uspto"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { tenantCopy } from "@/lib/tenant/copy"

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

function panel(fd: FormData, over: Partial<Parameters<typeof IntakeReadyCheckPanel>[0]> = {}) {
  return (
    <IntakeReadyCheckPanel
      formData={fd}
      onFieldChange={() => {}}
      gate={getGuidedSubmitGate(fd, es2)}
      isSubmitting={false}
      onSubmit={() => {}}
      onFixInChat={() => {}}
      {...over}
    />
  )
}

const buttons = (el: HTMLElement) => Array.from(el.querySelectorAll("button"))
const byText = (el: HTMLElement, t: string) => buttons(el).find((b) => b.textContent?.trim() === t)
const click = (b: HTMLElement | undefined) => act(() => b!.click())

describe("IntakeReadyCheckPanel (F6-2, ES2)", () => {
  it("two rows missing: two Missing rows with Fix, the summary line, a disabled send button", () => {
    const fd: FormData = { ...complete, submitterOffice: "", impactedUsersCount: "" }
    const el = render(panel(fd))
    const rows = Array.from(el.querySelectorAll('[data-testid="ready-row"]'))
    expect(rows.filter((r) => r.textContent?.includes("Missing"))).toHaveLength(2)
    expect(rows.filter((r) => r.textContent?.includes("Done"))).toHaveLength(3)
    expect(buttons(el).filter((b) => b.textContent?.trim() === "Fix")).toHaveLength(2)
    expect(el.textContent).toContain("2 things left:")
    expect((byText(el, "Send for review") as HTMLButtonElement).disabled).toBe(true)
    expect(el.textContent).toContain("Your idea so far")
    expect(el.textContent).toContain("Before you send")
  })

  it("Fix focuses the details field it names", () => {
    const fd = { ...complete, submitterOffice: "" }
    const el = render(panel(fd))
    click(byText(el, "Fix"))
    expect(document.activeElement?.id).toBe("details-submitterOffice")
  })

  it("Fix for a field the details form lacks hands off to the chat", () => {
    const onFixInChat = vi.fn()
    const fd = { ...complete, userValue: "", solutionSummary: "", proposedSolution: "" }
    const el = render(panel(fd, { onFixInChat }))
    click(byText(el, "Fix"))
    expect(onFixInChat).toHaveBeenCalledTimes(1)
  })

  it("shows a bracketed blank highlighted in place, one Fill this in card, and Use X replaces it", () => {
    const onFieldChange = vi.fn()
    const fd = { ...complete, useCaseDescription: "The tool checks each file for [NUMBER] items." }
    const el = render(
      panel(fd, { onFieldChange, guessFor: () => "14" }),
    )
    expect(el.querySelectorAll('[data-testid="fill-card"]')).toHaveLength(1)
    expect(el.querySelector("mark")?.textContent).toBe("[NUMBER]")
    expect(el.textContent).toContain("Fill this in")
    expect(el.textContent).toContain("Plumb's guess: 14")
    click(byText(el, "Use 14"))
    expect(onFieldChange).toHaveBeenCalledWith({ useCaseDescription: "The tool checks each file for 14 items." })
  })

  it("Type it opens an input; saving replaces the blank with what was typed", () => {
    const onFieldChange = vi.fn()
    const fd = { ...complete, useCaseDescription: "Checks [NUMBER] items." }
    const el = render(panel(fd, { onFieldChange }))
    expect(byText(el, "Use 14")).toBeUndefined()
    expect(el.textContent).not.toContain("Plumb's guess")
    click(byText(el, "Type it"))
    const input = el.querySelector('[data-testid="fill-input"]') as HTMLInputElement
    expect(input).toBeTruthy()
    act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!
      set.call(input, "9")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    click(byText(el, "Save"))
    expect(onFieldChange).toHaveBeenCalledWith({ useCaseDescription: "Checks 9 items." })
  })

  it("a blank copied into two fields is filled in both, so the card moves on", () => {
    const onFieldChange = vi.fn()
    const fd = { ...complete, coreProblem: "Costs [NUMBER] hours.", problemDefinition: "Costs [NUMBER] hours." }
    const el = render(panel(fd, { onFieldChange, guessFor: () => "5" }))
    click(byText(el, "Use 5"))
    expect(onFieldChange).toHaveBeenCalledWith({
      coreProblem: "Costs 5 hours.",
      problemDefinition: "Costs 5 hours.",
    })
  })

  it("when the gate passes, the button is enabled and sends once", () => {
    const onSubmit = vi.fn()
    const el = render(panel(complete, { onSubmit }))
    const send = byText(el, "Send for review") as HTMLButtonElement
    expect(send.disabled).toBe(false)
    expect(el.textContent).toContain("Ready to send")
    expect(el.querySelector('[data-testid="fill-card"]')).toBeNull()
    click(send)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("every state has a word as well as a mark", () => {
    const fd = { ...complete, submitterOffice: "" }
    const el = render(panel(fd))
    for (const r of Array.from(el.querySelectorAll('[data-testid="ready-row"]'))) {
      expect(r.textContent).toMatch(/Done|Missing/)
      expect(r.querySelector("[aria-hidden='true']")).toBeTruthy()
    }
  })

  it("keeps the send button disabled while sending", () => {
    const el = render(panel(complete, { isSubmitting: true }))
    expect(buttons(el).find((b) => b.textContent?.includes("Sending"))?.disabled).toBe(true)
  })
})

describe("F6-2 tenant parity", () => {
  it("only ES2 turns the ready check on, and only ES2 has its words", () => {
    expect(es2.features.readyCheck).toBe(true)
    for (const t of [uspto, doc, dow]) {
      expect(t.features.readyCheck).toBeFalsy()
      const c = tenantCopy(t)
      expect(c.readySendLabel).toBe("")
      expect(c.readyIdeaTitle).toBe("")
    }
    const c = tenantCopy(es2)
    expect(c.readySendLabel).toBe("Send for review")
    expect(c.readyIdeaTitle).toBe("Your idea so far")
    expect(c.readyFillTitle).toBe("Fill this in")
    expect(c.readyBeforeTitle).toBe("Before you send")
    expect(c.readyDone).toBe("Done")
    expect(c.readyMissing).toBe("Missing")
    expect(c.readyFix).toBe("Fix")
    expect(c.readyTypeIt).toBe("Type it")
  })

  for (const [id, t] of [["uspto", uspto], ["doc", doc], ["dow", dow]] as const) {
    it(`${id}: the guided record panel is the old one, with "Submit for Vetting"`, () => {
      process.env.NEXT_PUBLIC_TENANT = id
      const fd = { ...complete, useCaseTitle: "" }
      const el = render(
        <IntakeRecordPanel formData={fd} onFieldChange={() => {}} gate={getGuidedSubmitGate(fd, t)} isSubmitting={false} onSubmit={() => {}} />,
      )
      expect(buttons(el).some((b) => b.textContent?.includes("Submit for Vetting"))).toBe(true)
      expect(el.querySelector('[data-testid="submit-blocked-reason"]')).toBeTruthy()
      expect(el.textContent).not.toContain("Before you send")
      expect(el.textContent).not.toContain("Fill this in")
    })
  }
})
