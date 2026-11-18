import { describe, it, expect, afterEach, vi, beforeEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { es2 } from "@/lib/tenant/es2"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({ on: true }))
const patchSpy = vi.hoisted(() => vi.fn())
const draftSpy = vi.hoisted(() => vi.fn())

vi.mock("@/lib/tenant", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/tenant")>()
  return {
    ...real,
    getTenant: () => ({ ...real.getTenant(), ...es2, features: { ...es2.features, reviewerDecides: state.on } }),
  }
})
vi.mock("@/lib/submissions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/submissions")>()),
  patchSubmissionFormData: (...a: unknown[]) => patchSpy(...a),
}))
vi.mock("@/app/actions", () => ({ draftGovernanceFields: (...a: unknown[]) => draftSpy(...a) }))

import { GovernanceCapturePanel } from "@/components/submissions/governance-capture-panel"

let container: HTMLDivElement | null = null
let root: Root | null = null
beforeEach(() => {
  state.on = true
  patchSpy.mockReset()
  draftSpy.mockReset()
})
afterEach(() => {
  if (root) act(() => root!.unmount())
  container?.remove()
  container = null
  root = null
})
async function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => root!.render(ui))
  return container
}

const DRAFT = {
  stageOfDevelopment: { value: "pre_deployment", rationale: "Still in vetting." },
  highImpact: { value: "not_high_impact", rationale: "No factors." },
}
const sub = (fd: Partial<FormData> = {}): Submission => ({
  id: "s1",
  submittedAt: "2026-01-01",
  formData: { ...initialFormData, ...fd } as FormData,
})
const panel = (s: Submission, initialDraft?: unknown) => (
  <GovernanceCapturePanel
    submission={s}
    assistantName="Plumb"
    byName="Dana"
    byEmail="d@x.gov"
    busy={false}
    setBusy={() => {}}
    onSaved={async () => {}}
    initialDraft={initialDraft as never}
  />
)
const button = (c: HTMLElement, text: string) =>
  Array.from(c.querySelectorAll("button")).find((b) => b.textContent?.trim() === text) as HTMLButtonElement

describe("GovernanceCapturePanel, reviewer decides (F7-2)", () => {
  it("opens with a draft and no field holds the drafted value; highImpact is not shown", async () => {
    const c = await render(panel(sub(), DRAFT))
    expect(c.textContent).toContain("Plumb suggests:")
    expect(c.textContent).not.toContain("High-impact")
    expect(c.querySelector('[id="gov-highImpact"]')).toBeNull()
    expect(c.querySelector('[id^="gov-highImpact-"]')).toBeNull()
    expect(c.querySelector("button[role=combobox]")?.textContent).toContain("Select")
  })

  it("shows a saved value at once, before any draft arrives", async () => {
    const c = await render(panel(sub({ stageOfDevelopment: "deployed" } as Partial<FormData>), null))
    expect(c.querySelector("button[role=combobox]")?.textContent).toContain("Deployed")
  })

  it("Use on a field then Save writes exactly that field, as the reviewer's choice", async () => {
    const c = await render(panel(sub(), DRAFT))
    await act(async () => button(c, "Use").click())
    await act(async () => button(c, "Save governance fields").click())
    expect(patchSpy).toHaveBeenCalledTimes(1)
    const patch = patchSpy.mock.calls[0][1]
    expect(Object.keys(patch).sort()).toEqual(["governanceCaptureReview", "stageOfDevelopment"])
    expect(patch.governanceCaptureReview.entries[0]).toMatchObject({ field: "stageOfDevelopment", decision: "chosen", byName: "Dana" })
  })

  it("Save with nothing chosen writes no field value and no highImpact", async () => {
    const c = await render(panel(sub(), DRAFT))
    await act(async () => button(c, "Save governance fields").click())
    const patch = patchSpy.mock.calls[0][1]
    expect(Object.keys(patch)).toEqual(["governanceCaptureReview"])
    expect(patch.governanceCaptureReview.entries).toEqual([])
  })

  it("with no draft at all, Save is on and works", async () => {
    const c = await render(panel(sub(), {}))
    expect(button(c, "Save governance fields").disabled).toBe(false)
  })

  it("a failed draft call leaves the panel usable", async () => {
    draftSpy.mockRejectedValue(new Error("down"))
    const c = await render(panel(sub(), undefined))
    expect(button(c, "Save governance fields").disabled).toBe(false)
  })

  it("counts the fields left empty in the tenant's words", async () => {
    const c = await render(panel(sub(), DRAFT))
    expect(c.textContent).toMatch(/\d+ fields left empty/)
  })
})

describe("GovernanceCapturePanel, setting off", () => {
  it("fills the drafted value and shows no Use button or empty count", async () => {
    state.on = false
    const c = await render(panel(sub(), DRAFT))
    expect(c.textContent).toContain("Plumb proposes:")
    expect(button(c, "Use")).toBeUndefined()
    expect(c.textContent).not.toContain("left empty")
    expect(c.querySelector('[id="gov-highImpact-high_impact"]')).not.toBeNull()
  })
})
