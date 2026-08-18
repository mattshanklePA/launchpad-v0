import { describe, it, expect, afterEach, vi } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"

// The screen under test only needs the wizard's data and a router; the real
// FormProvider would drag localStorage draft state into a render test, and the
// PDF button drags jspdf in. Neither is what ES2-13 is about.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }))
vi.mock("@/context/form-context", () => ({
  useForm: () => ({ formData: { routeTo: ["governance"] }, resetForm: () => {} }),
}))
vi.mock("@/components/steps/pdf-export-button", () => ({
  PDFExportButton: ({ label }: { label?: string }) => <button>{label}</button>,
}))

import { Step11ExportTracking } from "./step-11-export-tracking"
import { ALL_TENANTS } from "@/lib/tenant"

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

function unmount() {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
  container = null
  root = null
}

// `getTenant()` resolves from the env on every call, so the screen can be
// mounted once per tenant in a single run.
function renderAs(tenantId: string): string {
  const prev = process.env.NEXT_PUBLIC_TENANT
  process.env.NEXT_PUBLIC_TENANT = tenantId
  try {
    return render(<Step11ExportTracking />).textContent ?? ""
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
    else process.env.NEXT_PUBLIC_TENANT = prev
  }
}

// ES2-13 item 1. "Idea Submitted for Vetting" is the screen every intake ends
// on, so a Rally button on a tenant with no Rally integration is on the demo
// path. The button was disabled, but rendered.
describe("Step11ExportTracking (ES2-13)", () => {
  it("renders no Rally control on any tenant with rallyExport off", () => {
    for (const tenant of ALL_TENANTS.filter((t) => !t.features.rallyExport)) {
      const text = renderAs(tenant.id)
      expect(text, `${tenant.id} rendered: ${text}`).not.toMatch(/rally/i)
      unmount()
    }
  })

  it("still renders it on uspto, whose integration is on", () => {
    for (const tenant of ALL_TENANTS.filter((t) => t.features.rallyExport)) {
      const text = renderAs(tenant.id)
      expect(text, tenant.id).toMatch(/View in Rally/)
      unmount()
    }
  })

  it("moves nothing else on the screen, on any tenant", () => {
    for (const tenant of ALL_TENANTS) {
      const text = renderAs(tenant.id)
      expect(text, tenant.id).toContain("Idea Submitted for Vetting!")
      expect(text, tenant.id).toContain("What Happens Next")
      expect(text, tenant.id).toContain("Download Submission as PDF")
      expect(text, tenant.id).toContain("Start a New Idea")
      expect(text, tenant.id).toContain("Return to Dashboard")
      unmount()
    }
  })
})
