// ES2-15 C: the roll-up's badge colors carry meaning (high-impact, needs
// review or possible duplicate, consolidated) and had nothing on the page
// saying so. The legend's third entry names the tenant's own inventory, so it
// is asserted for both an "Inventory" tenant and an "OMB" one.

import { describe, it, expect, afterEach } from "vitest"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { BureauRollup } from "./bureau-rollup"
import { initialFormData, type FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { getTenant } from "@/lib/tenant"
import { businessUnitLabel } from "@/lib/reviewWorkflow"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root!.unmount())
  if (container) container.remove()
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

function withTenant(id: string, run: () => void) {
  const prev = process.env.NEXT_PUBLIC_TENANT
  process.env.NEXT_PUBLIC_TENANT = id
  try {
    run()
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
    else process.env.NEXT_PUBLIC_TENANT = prev
  }
}

const submissions: Submission[] = [
  {
    id: "s1",
    submittedAt: "2026-01-01T00:00:00.000Z",
    status: "submitted",
    businessUnit: "g3",
    formData: { ...initialFormData, useCaseName: "Contract clause recommendation" } as FormData,
  },
]

describe("BureauRollup legend", () => {
  it("names what each badge color means", () => {
    withTenant("es2", () => {
      const text = render(<BureauRollup submissions={submissions} />).textContent ?? ""
      expect(text).toContain("High-impact")
      expect(text).toContain("Needs review or possible duplicate")
      expect(text).toContain("Consolidated into one Inventory entry")
    })
  })

  it("names the consolidated swatch with the tenant's own inventory label", () => {
    withTenant("uspto", () => {
      const text = render(<BureauRollup submissions={submissions} />).textContent ?? ""
      expect(text).toContain("Consolidated into one OMB entry")
    })
  })
})

// F3-6 item 4: the roll-up built its rows from the submissions it was given, so
// an office with no ideas vanished ("across 4 program offices" with 5
// configured). Every configured unit gets a row, zeros included.
describe("BureauRollup lists every configured unit", () => {
  it.each(["uspto", "doc", "dow", "es2"])("%s: a configured unit with no ideas still has a row", (id) => {
    withTenant(id, () => {
      const configured = getTenant().unit.options
      const withIdea = configured[0].value
      const el = render(
        <BureauRollup
          submissions={[
            { id: "z1", submittedAt: "2026-01-01T00:00:00.000Z", status: "submitted", businessUnit: withIdea, formData: { ...initialFormData } as FormData },
          ]}
        />,
      )
      const rows = Array.from(el.querySelectorAll("tbody tr")).map((r) => r.textContent ?? "")
      for (const o of configured) {
        expect(rows.some((r) => r.includes(businessUnitLabel(o.value)))).toBe(true)
      }
      expect(el.textContent).toContain(`across ${configured.length} `)
    })
  })

  it("still renders a row for an idea filed under a unit the tenant does not configure", () => {
    withTenant("es2", () => {
      const el = render(
        <BureauRollup
          submissions={[
            { id: "z2", submittedAt: "2026-01-01T00:00:00.000Z", status: "submitted", businessUnit: "legacy_unit", formData: { ...initialFormData } as FormData },
          ]}
        />,
      )
      expect(el.textContent).toContain("legacy_unit")
    })
  })

  it("renders the table for a tenant with no ideas at all", () => {
    withTenant("doc", () => {
      const el = render(<BureauRollup submissions={[]} />)
      expect(el.querySelectorAll("tbody tr").length).toBeGreaterThan(getTenant().unit.options.length)
    })
  })
})
