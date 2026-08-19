// RD-3 (issue #204): the 10b compare screen — a compact table (Readiness,
// Risk, Users, Time saved, Cost saved, Complexity, Timeline, Strategic
// alignment, Feasibility) with one column per selected candidate, replacing
// the old briefing-first card + 19-field expando. The AI briefing itself
// (compareSubmissions) is unchanged and mocked out here.

import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ComparisonView } from "./comparison-view"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"

const compareSubmissions = vi.fn()
vi.mock("@/app/admin/compare-actions", () => ({
  compareSubmissions: (...args: unknown[]) => compareSubmissions(...args),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
  compareSubmissions.mockReset()
})

function render(ui: ReactElement) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(ui))
  return container
}

// status: "approved" — ComparisonView, like DecisionCenter, only ever
// receives submissions that already cleared lib/decisionCenter's status gate
// (issue #213 item 1). ComparisonView doesn't filter by status itself, so
// this doesn't change any assertion below — column counts are unaffected.
function buildSubmission(id: string, overrides: Partial<FormData>): Submission {
  return {
    id,
    submittedAt: "2026-08-18T00:00:00.000Z",
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

const ROW_LABELS = [
  "Readiness",
  "Risk",
  "Users",
  "Time saved",
  "Cost saved",
  "Complexity",
  "Timeline",
  "Strategic alignment",
  "Feasibility",
]

describe("ComparisonView table", () => {
  it("renders every row label and one column per selected candidate (2 candidates)", () => {
    const submissions = [
      buildSubmission("s1", { useCaseTitle: "Closeout completeness flagging" }),
      buildSubmission("s2", { useCaseTitle: "Clause recommendation from requirement text" }),
    ]
    const el = render(<ComparisonView submissions={submissions} onClose={vi.fn()} />)

    for (const label of ROW_LABELS) expect(el.textContent).toContain(label)
    expect(el.textContent).toContain("Closeout completeness flagging")
    expect(el.textContent).toContain("Clause recommendation from requirement text")

    // One data column per candidate, plus the row-label column.
    const table = el.querySelector(".border.border-border-subtle")!
    const headerRow = table.querySelector("div.grid")!
    expect(headerRow.children.length).toBe(1 + submissions.length)
  })

  it("adds a column per candidate for a 4-way comparison", () => {
    const submissions = ["s1", "s2", "s3", "s4"].map((id) => buildSubmission(id, {}))
    const el = render(<ComparisonView submissions={submissions} onClose={vi.fn()} />)
    const table = el.querySelector(".border.border-border-subtle")!
    const headerRow = table.querySelector("div.grid")!
    expect(headerRow.children.length).toBe(1 + submissions.length)
  })

  it("does not add the mock's per-candidate Plumb's read row (no source for it yet)", () => {
    const submissions = [buildSubmission("s1", {}), buildSubmission("s2", {})]
    const el = render(<ComparisonView submissions={submissions} onClose={vi.fn()} />)
    expect(el.textContent).not.toContain("Plumb")
  })

  it("calls onClose when Back to candidates is clicked", () => {
    const onClose = vi.fn()
    const submissions = [buildSubmission("s1", {}), buildSubmission("s2", {})]
    const el = render(<ComparisonView submissions={submissions} onClose={onClose} />)
    const back = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Back to candidates")!
    act(() => back.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("generates the executive briefing via the existing compareSubmissions action and renders it below the table", async () => {
    compareSubmissions.mockResolvedValue({
      recommendation: { fundId: "s1", headline: "Fund the closeout flagging tool first." },
      differ: "One is lower risk; the other overlaps another roadmap.",
      portfolioGap: "Neither has a finalized success metric.",
      perSubmission: [
        { id: "s1", title: "Closeout completeness flagging", verdict: "fund_now", oneLine: "Fastest, lowest risk.", gap: "Metrics TBD." },
        { id: "s2", title: "Clause recommendation from requirement text", verdict: "hold", oneLine: "Needs cleanup first.", gap: "Clause library gaps." },
      ],
    })
    const submissions = [
      buildSubmission("s1", { useCaseTitle: "Closeout completeness flagging" }),
      buildSubmission("s2", { useCaseTitle: "Clause recommendation from requirement text" }),
    ]
    const el = render(<ComparisonView submissions={submissions} onClose={vi.fn()} />)
    const generate = Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes("Generate Executive Briefing"))!
    await act(async () => {
      generate.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(compareSubmissions).toHaveBeenCalledWith(submissions)
    expect(el.textContent).toContain("Fund the closeout flagging tool first.")
    expect(el.textContent).toContain("Neither has a finalized success metric.")
  })
})
