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
  rmfCardLabel,
} from "./decision-center"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import type { ResolvedRmfProfile } from "@/lib/rmfProfileReview"

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

// status: "approved" — DecisionCenter itself only ever receives submissions
// that have already cleared lib/decisionCenter's status gate (issue #213
// item 1); these fixtures render the component directly, bypassing that
// gate, so the status field doesn't drive any assertion below, but it should
// still reflect what the component is actually handed in production.
function buildSubmission(id: string, overrides: Partial<FormData>, submittedAt = "2026-08-18T00:00:00.000Z"): Submission {
  return {
    id,
    submittedAt,
    status: "approved",
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

  // Renamed from "uses plural copy for zero candidates and shows the empty
  // state": issue #213 item 1 replaced the zero-candidate copy — the count
  // line no longer renders at all (there's nothing to count), and the empty
  // state says plainly that nothing is waiting, rather than a generic
  // "No submissions awaiting decision" that predates the approval gate.
  it("hides the count line and shows the plain empty state for zero candidates", () => {
    const el = render(<DecisionCenter submissions={[]} />)
    expect(el.textContent).not.toContain("candidates await a funding decision")
    expect(el.textContent).not.toContain("candidate awaits a funding decision")
    expect(el.textContent).toContain("Nothing is waiting on a funding decision.")
    expect(el.textContent).toContain("Use cases arrive here once a reviewer approves them.")
  })

  it("hides the Compare control for zero candidates", () => {
    const el = render(<DecisionCenter submissions={[]} />)
    expect(Array.from(el.querySelectorAll("button")).some((b) => b.textContent === "Compare selected")).toBe(false)
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

// Issue #213 item 2: the card used to collapse three RMF states into two
// strings ("RMF proposed · awaiting reviewer" / "RMF confirmed"), so an
// approved card could still claim a reviewer was awaited, and "confirmed"
// and "overridden" read identically. Driven purely by resolveRmfProfile's
// existing resolution — no new review logic.
describe("rmfCardLabel", () => {
  const baseProfile = { overall: "on_track", rationale: "", flags: [], functions: {} } as unknown as ResolvedRmfProfile["profile"]

  it("reads 'RMF profile not confirmed' when no review record exists yet", () => {
    const resolved: ResolvedRmfProfile = { profile: baseProfile, effectiveOverall: "on_track", review: undefined, isProposal: true }
    expect(rmfCardLabel(resolved)).toBe("RMF profile not confirmed")
  })

  it("reads 'RMF confirmed' when a review exists with no override", () => {
    const resolved: ResolvedRmfProfile = {
      profile: baseProfile,
      effectiveOverall: "on_track",
      review: { decision: "confirmed", proposedOverall: "on_track", byName: "Jane Doe", byEmail: "jane@example.gov", at: "2026-08-18T00:00:00.000Z" },
      isProposal: false,
    }
    expect(rmfCardLabel(resolved)).toBe("RMF confirmed")
  })

  it("reads 'RMF overridden by reviewer' when a review exists with an override", () => {
    const resolved: ResolvedRmfProfile = {
      profile: baseProfile,
      effectiveOverall: "at_risk",
      review: {
        decision: "overridden",
        proposedOverall: "on_track",
        overriddenOverall: "at_risk",
        byName: "Jane Doe",
        byEmail: "jane@example.gov",
        at: "2026-08-18T00:00:00.000Z",
      },
      isProposal: false,
    }
    expect(rmfCardLabel(resolved)).toBe("RMF overridden by reviewer")
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
