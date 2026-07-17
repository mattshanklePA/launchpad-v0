import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { DecisionHeader } from "@/components/submissions/decision-header"

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

const approveAssist = {
  verdict: "Solid, decision-ready submission.",
  strengths: ["Clear problem statement"],
  gaps: [] as string[],
  suggestedDisposition: "approve" as const,
  draftRequestInfo: "",
}

const reviewAssist = {
  verdict: "A few gaps to close first.",
  strengths: ["Clear problem statement"],
  gaps: ["Success metrics are vague"],
  suggestedDisposition: "request_info" as const,
  draftRequestInfo: "Can you share success metrics?",
}

describe("DecisionHeader", () => {
  it("shows a loading state and a neutral primary action while the assistant is still reading", () => {
    const onApprove = vi.fn()
    const el = render(
      <DecisionHeader
        assistantName="Kestrel"
        assisting
        assist={null}
        blockingText={null}
        busy={false}
        onApprove={onApprove}
        onResolveBlocker={vi.fn()}
      />,
    )
    expect(el.textContent).toContain("Reading the submission")
    const button = Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Approve")
    expect(button).toBeTruthy()
  })

  it("offers \"Approve as recommended\" and calls onApprove when the assistant recommends approving and nothing blocks it", () => {
    const onApprove = vi.fn()
    const onResolveBlocker = vi.fn()
    const el = render(
      <DecisionHeader
        assistantName="Kestrel"
        assisting={false}
        assist={approveAssist}
        blockingText={null}
        busy={false}
        onApprove={onApprove}
        onResolveBlocker={onResolveBlocker}
      />,
    )
    expect(el.textContent).toContain("Nothing is blocking approval")
    const button = Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes("Approve as recommended"))!
    act(() => button.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(onApprove).toHaveBeenCalledTimes(1)
    expect(onResolveBlocker).not.toHaveBeenCalled()
  })

  it("offers \"Resolve the blocker\" and calls onResolveBlocker (not onApprove) when something blocks approval", () => {
    const onApprove = vi.fn()
    const onResolveBlocker = vi.fn()
    const el = render(
      <DecisionHeader
        assistantName="Kestrel"
        assisting={false}
        assist={reviewAssist}
        blockingText="Rationalization pending — this cross-bureau duplicate cluster must be decided before approval."
        busy={false}
        onApprove={onApprove}
        onResolveBlocker={onResolveBlocker}
      />,
    )
    expect(el.textContent).toContain("Rationalization pending")
    const button = Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes("Resolve the blocker"))!
    act(() => button.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(onResolveBlocker).toHaveBeenCalledTimes(1)
    expect(onApprove).not.toHaveBeenCalled()
  })

  it("keeps the assistant's strengths/gaps analysis collapsed until the reviewer opens it", () => {
    const el = render(
      <DecisionHeader
        assistantName="Kestrel"
        assisting={false}
        assist={reviewAssist}
        blockingText={null}
        busy={false}
        onApprove={vi.fn()}
        onResolveBlocker={vi.fn()}
      />,
    )
    expect(el.textContent).not.toContain("Success metrics are vague")
    const toggle = Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes("full analysis"))!
    act(() => toggle.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(el.textContent).toContain("Success metrics are vague")
  })
})
