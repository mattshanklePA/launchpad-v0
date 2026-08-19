// RD-3 (issue #204): restyle of the Decision Center list into the Keystone
// system — the basalt page header's singular/plural count copy, the
// candidate card's five-number eyebrow row, and the Compare-selected button's
// 2-candidate floor. No change to readyForDecision's ranking, the selection
// rules (max 4), or any value shown — see decision-center.tsx.

import { describe, it, expect, afterEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import {
  DecisionCenter,
  readinessKeystoneStatus,
  readinessPillLabel,
  riskKeystoneStatus,
  riskPillLabel,
} from "./decision-center"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
})

function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

function buildSubmission(id: string, overrides: Partial<FormData>, submittedAt = "2026-08-18T00:00:00.000Z"): Submission {
  return {
    id,
    submittedAt,
    status: "submitted",
    formData: {
      ...initialFormData,
      useCaseTitle: `Use case ${id}`,
      submitterName: "Avery Lang",
      submitterOffice: "patents",
      readinessScore: "ready",
      impactedUsersCount: "50_500",
      userTimeSavings: "1_5",
      costSavings: "50k_250k",
      implementationComplexity: "medium",
      timelineForResults: "3_6",
      alignmentSummary: "Directly serves the audit-readiness objective.",
      feasibilitySummary: "Classical ML on structured records.",
      involvesSensitiveData: "no",
      aiDecisionalImpact: "no",
      aiModelSourcing: "american_built",
      aiHumanReview: "yes",
      ...overrides,
    } as FormData,
  }
}

describe("DecisionCenter header", () => {
  it("uses singular copy for exactly one candidate", () => {
    const el = render(<DecisionCenter submissions={[buildSubmission("s1", {})]} />)
    expect(el.textContent).toContain("1 candidate awaits a funding decision")
    expect(el.textContent).not.toContain("1 candidates")
  })

  it("uses plural copy and the real count for multiple candidates", () => {
    const el = render(
      <DecisionCenter submissions={[buildSubmission("s1", {}), buildSubmission("s2", {}), buildSubmission("s3", {})]} />,
    )
    expect(el.textContent).toContain("3 candidates await a funding decision")
  })

  it("uses plural copy for zero candidates and shows the empty state", () => {
    const el = render(<DecisionCenter submissions={[]} />)
    expect(el.textContent).toContain("0 candidates await a funding decision")
    expect(el.textContent).toContain("No submissions awaiting decision")
  })
})

describe("DecisionCenter candidate card", () => {
  it("shows all five eyebrows with their prettified values", () => {
    const el = render(<DecisionCenter submissions={[buildSubmission("s1", {})]} />)
    expect(el.textContent).toContain("Users")
    expect(el.textContent).toContain("50–500 users")
    expect(el.textContent).toContain("Time saved")
    expect(el.textContent).toContain("1–5 hrs/week")
    expect(el.textContent).toContain("Cost saved")
    expect(el.textContent).toContain("$50K–$250K")
    expect(el.textContent).toContain("Complexity")
    expect(el.textContent).toContain("Medium")
    expect(el.textContent).toContain("Timeline")
    expect(el.textContent).toContain("3–6 months")
  })

  it("shows a dash for an empty stat instead of blank", () => {
    const el = render(<DecisionCenter submissions={[buildSubmission("s1", { costSavings: "" })]} />)
    expect(el.textContent).toContain("—")
  })

  it("shows the readiness and risk pills restyled from the existing resolution", () => {
    const el = render(<DecisionCenter submissions={[buildSubmission("s1", {})]} />)
    expect(el.textContent).toContain("Ready")
    expect(el.textContent).toContain("Low risk")
  })
})

describe("DecisionCenter compare selection", () => {
  it("disables Compare selected below 2 selections and enables it at 2", () => {
    const el = render(
      <DecisionCenter submissions={[buildSubmission("s1", {}), buildSubmission("s2", {}), buildSubmission("s3", {})]} />,
    )
    const compareSelectedButton = () =>
      Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Compare selected")!

    expect(compareSelectedButton().disabled).toBe(true)

    const checkboxes = Array.from(el.querySelectorAll('button[role="checkbox"]'))
    expect(checkboxes.length).toBe(3)

    act(() => checkboxes[0].dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(compareSelectedButton().disabled).toBe(true)
    expect(el.textContent).toContain("1 selected")
    expect(el.textContent).toContain("pick 1 more to compare")

    act(() => checkboxes[1].dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(compareSelectedButton().disabled).toBe(false)
    expect(el.textContent).toContain("2 selected")
  })

  it("caps selection at 4 and shows the max hint", () => {
    const submissions = ["s1", "s2", "s3", "s4", "s5"].map((id) => buildSubmission(id, {}))
    const el = render(<DecisionCenter submissions={submissions} />)
    const checkboxes = Array.from(el.querySelectorAll('button[role="checkbox"]'))
    for (const cb of checkboxes) act(() => cb.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(el.textContent).toContain("4 selected")
    expect(el.textContent).toContain("max 4")
  })

  it("switches to the compare screen when Compare selected is clicked with 2+ selected", () => {
    const el = render(
      <DecisionCenter submissions={[buildSubmission("s1", {}), buildSubmission("s2", {})]} />,
    )
    const checkboxes = Array.from(el.querySelectorAll('button[role="checkbox"]'))
    act(() => checkboxes[0].dispatchEvent(new MouseEvent("click", { bubbles: true })))
    act(() => checkboxes[1].dispatchEvent(new MouseEvent("click", { bubbles: true })))
    const compareButton = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Compare selected")!
    act(() => compareButton.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(el.textContent).toContain("Decision Center · compare")
    expect(el.textContent).toContain("Back to candidates")
  })
})

describe("readiness/risk pill helpers", () => {
  it("maps readiness scores to the Keystone status vocabulary and restyled labels", () => {
    expect(readinessKeystoneStatus("ready")).toBe("healthy")
    expect(readinessPillLabel("ready")).toBe("Ready")
    expect(readinessKeystoneStatus("needs_work")).toBe("attention")
    expect(readinessPillLabel("needs_work")).toBe("Needs work")
    expect(readinessKeystoneStatus("early_stage")).toBe("alert")
    expect(readinessPillLabel("early_stage")).toBe("Early stage")
    expect(readinessKeystoneStatus(undefined)).toBe("neutral")
    expect(readinessPillLabel(undefined)).toBe("Not assessed")
  })

  it("maps risk levels to the Keystone status vocabulary and the mock's short labels", () => {
    expect(riskKeystoneStatus("low")).toBe("healthy")
    expect(riskPillLabel("low")).toBe("Low risk")
    expect(riskKeystoneStatus("medium")).toBe("attention")
    expect(riskPillLabel("medium")).toBe("Med risk")
    expect(riskKeystoneStatus("high")).toBe("alert")
    expect(riskPillLabel("high")).toBe("High risk")
    expect(riskKeystoneStatus("unknown")).toBe("neutral")
    expect(riskPillLabel("unknown")).toBe("Risk unassessed")
  })
})
