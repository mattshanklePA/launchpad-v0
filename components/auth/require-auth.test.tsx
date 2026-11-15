// The loop that crashed Chrome on the ES2 preview (14 Nov): a signed-in
// submitter on a reviewer-only page was sent to /login?next=<page>, and the
// login page sent them straight back. RequireAuth must send them home instead.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"

const replace = vi.fn()
let session: { role: string; email: string } | null = null

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/decisions" }))
vi.mock("@/lib/auth", () => ({ ensureSeeded: () => {}, getSession: () => session }))
vi.mock("@/components/data-provider", () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDataProvider: () => ({ loaded: true }),
}))

import { RequireAuth } from "./require-auth"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  replace.mockReset()
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render() {
  act(() =>
    root.render(
      <RequireAuth requireRole={["admin", "reviewer"]}>
        <p>secret</p>
      </RequireAuth>,
    ),
  )
}

describe("RequireAuth", () => {
  it("sends a signed-in submitter on a reviewer-only page home, not to the login page", () => {
    session = { role: "submitter", email: "dana.whitfield@es2.demo" }
    render()
    expect(replace).toHaveBeenCalledWith("/home")
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining("/login"))
    expect(container.textContent).not.toContain("secret")
  })

  it("sends a signed-out visitor to the login page with the page they wanted", () => {
    session = null
    render()
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fdecisions")
  })

  it("shows the page to a reviewer", () => {
    session = { role: "reviewer", email: "jordan.pierce@es2.demo" }
    render()
    expect(replace).not.toHaveBeenCalled()
    expect(container.textContent).toContain("secret")
  })
})
