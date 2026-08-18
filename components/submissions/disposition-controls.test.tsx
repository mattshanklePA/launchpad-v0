import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { DispositionControls, dispositionButtonVariant } from "@/components/submissions/disposition-controls"

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

function buttonNamed(el: HTMLElement, name: RegExp): HTMLButtonElement {
  const match = Array.from(el.querySelectorAll("button")).find((b) => name.test(b.textContent ?? ""))
  if (!match) throw new Error(`no button matching ${name}`)
  return match as HTMLButtonElement
}

// The `default` and `outline` variants of components/ui/button.tsx, as class
// tokens — `bg-primary` is the filled primary look, `bg-background` +
// `border-input` the outlined one.
function isDefaultVariant(b: HTMLButtonElement): boolean {
  return b.classList.contains("bg-primary") && !b.classList.contains("border-input")
}
function isOutlineVariant(b: HTMLButtonElement): boolean {
  return b.classList.contains("border-input") && b.classList.contains("bg-background") && !b.classList.contains("bg-primary")
}

describe("dispositionButtonVariant", () => {
  it("makes Reject the current control on a rejected record", () => {
    expect(dispositionButtonVariant("reject", "rejected")).toBe("default")
    expect(dispositionButtonVariant("approve", "rejected")).toBe("outline")
  })

  it("makes Approve the current control on an approved record", () => {
    expect(dispositionButtonVariant("approve", "approved")).toBe("default")
    expect(dispositionButtonVariant("reject", "approved")).toBe("outline")
  })

  // ISS-8 tuned the pre-decision look: Approve is the primary action while no
  // verdict has been recorded. That must not change.
  it("keeps Approve primary while no decision has been recorded", () => {
    for (const status of ["draft", "submitted", "in_review", "needs_info"] as const) {
      expect(dispositionButtonVariant("approve", status)).toBe("default")
      expect(dispositionButtonVariant("reject", status)).toBe("outline")
    }
  })
})

describe("DispositionControls", () => {
  // ES2-12 A: a rejected record used to render a bright blue Approve beside a
  // greyed-out Reject, reading as if Approve were the pending action.
  it("renders Reject filled and Approve outlined on a rejected submission, both enabled", () => {
    const el = render(
      <DispositionControls
        status="rejected"
        busy={false}
        blockReason={undefined}
        onApprove={vi.fn()}
        onRequestInfo={vi.fn()}
        onReject={vi.fn()}
      />,
    )
    const approve = buttonNamed(el, /Approve/)
    const reject = buttonNamed(el, /Reject/)
    expect(isDefaultVariant(reject)).toBe(true)
    expect(isOutlineVariant(approve)).toBe(true)
    expect(approve.disabled).toBe(false)
    expect(reject.disabled).toBe(false)
  })

  it("renders Approve filled and Reject outlined on an approved submission, both enabled", () => {
    const el = render(
      <DispositionControls
        status="approved"
        busy={false}
        blockReason={undefined}
        onApprove={vi.fn()}
        onRequestInfo={vi.fn()}
        onReject={vi.fn()}
      />,
    )
    const approve = buttonNamed(el, /Approve/)
    const reject = buttonNamed(el, /Reject/)
    expect(isDefaultVariant(approve)).toBe(true)
    expect(isOutlineVariant(reject)).toBe(true)
    expect(approve.disabled).toBe(false)
    expect(reject.disabled).toBe(false)
  })

  it("still lets a reviewer reverse a recorded decision", () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()
    const el = render(
      <DispositionControls
        status="rejected"
        busy={false}
        blockReason={undefined}
        onApprove={onApprove}
        onRequestInfo={vi.fn()}
        onReject={onReject}
      />,
    )
    act(() => buttonNamed(el, /Approve/).dispatchEvent(new MouseEvent("click", { bubbles: true })))
    act(() => buttonNamed(el, /Reject/).dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(onApprove).toHaveBeenCalledTimes(1)
    expect(onReject).toHaveBeenCalledTimes(1)
  })

  it("keeps the rationalization block on Approve only", () => {
    const el = render(
      <DispositionControls
        status="in_review"
        busy={false}
        blockReason="Resolve the duplicate cluster first."
        onApprove={vi.fn()}
        onRequestInfo={vi.fn()}
        onReject={vi.fn()}
      />,
    )
    expect(buttonNamed(el, /Approve/).disabled).toBe(true)
    expect(buttonNamed(el, /Approve/).getAttribute("title")).toBe("Resolve the duplicate cluster first.")
    expect(buttonNamed(el, /Reject/).disabled).toBe(false)
    expect(buttonNamed(el, /Request info/).disabled).toBe(false)
  })

  it("disables every control while a save is in flight", () => {
    const el = render(
      <DispositionControls
        status="in_review"
        busy
        blockReason={undefined}
        onApprove={vi.fn()}
        onRequestInfo={vi.fn()}
        onReject={vi.fn()}
      />,
    )
    for (const name of [/Approve/, /Request info/, /Reject/]) {
      expect(buttonNamed(el, name).disabled).toBe(true)
    }
  })

  it("leaves Request info outlined regardless of the recorded decision", () => {
    for (const status of ["approved", "rejected", "in_review"] as const) {
      const el = render(
        <DispositionControls
          status={status}
          busy={false}
          blockReason={undefined}
          onApprove={vi.fn()}
          onRequestInfo={vi.fn()}
          onReject={vi.fn()}
        />,
      )
      expect(isOutlineVariant(buttonNamed(el, /Request info/))).toBe(true)
      act(() => root!.unmount())
      container!.remove()
      root = null
      container = null
    }
  })
})
