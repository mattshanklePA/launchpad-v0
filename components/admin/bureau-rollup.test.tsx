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

// NL-4 (#285): ES2 only. Same numbers, cockpit kit pieces (K3 title, K5 table).
describe("BureauRollup cockpit look (NL-4)", () => {
  const mixed: Submission[] = [
    { id: "a1", submittedAt: "2026-01-01T00:00:00.000Z", status: "submitted", businessUnit: "g3", formData: { ...initialFormData } as FormData },
    { id: "a2", submittedAt: "2026-01-02T00:00:00.000Z", status: "submitted", businessUnit: "g3", formData: { ...initialFormData } as FormData },
  ]

  it("es2: K3 section title with today's context line, and a table", () => {
    withTenant("es2", () => {
      const el = render(<BureauRollup submissions={mixed} />)
      const title = el.querySelector('[data-cockpit="section-title"]')
      expect(title).not.toBeNull()
      expect(title?.textContent).toContain("roll-up")
      expect(title?.textContent).toMatch(/2 use cases across \d+ program offices/)
      expect(el.querySelector('[data-cockpit="rollup-table"]')).not.toBeNull()
    })
  })

  it("es2: zero is an en dash with screen-reader text 'zero'", () => {
    withTenant("es2", () => {
      const el = render(<BureauRollup submissions={mixed} />)
      const zeros = Array.from(el.querySelectorAll('[data-zero]'))
      expect(zeros.length).toBeGreaterThan(0)
      for (const z of zeros) {
        expect(z.textContent).toBe("–zero")
        expect(z.querySelector(".sr-only")?.textContent).toBe("zero")
      }
    })
  })

  it("es2: totals row is bold, last, and each column equals the sum of the rows", () => {
    withTenant("es2", () => {
      const el = render(<BureauRollup submissions={mixed} />)
      const rows = Array.from(el.querySelectorAll('[data-cockpit="rollup-table"] tbody > tr[data-unit-row]'))
      const totals = el.querySelector('[data-cockpit="rollup-table"] tbody > tr[data-totals-row]')
      expect(totals).not.toBeNull()
      expect(totals?.className).toContain("font-bold")
      expect(totals?.previousElementSibling).not.toBeNull()
      const cell = (tr: Element, i: number) => {
        const t = (tr.children[i].textContent ?? "").replace("zero", "").trim()
        return t === "–" ? 0 : Number(t)
      }
      const statusAndTotalCols = Array.from(totals!.children).length
      for (let i = 1; i < statusAndTotalCols; i++) {
        if ((totals!.children[i].textContent ?? "").includes("/")) continue // signed-off "n/total"
        const sum = rows.reduce((acc, r) => acc + cell(r, i), 0)
        expect(cell(totals!, i)).toBe(sum)
      }
    })
  })

  it("es2: square corners, no shadow", () => {
    withTenant("es2", () => {
      const el = render(<BureauRollup submissions={mixed} />)
      expect(el.innerHTML).not.toMatch(/rounded-(lg|md|xl|full)|shadow-(sm|md|lg|xl)/)
    })
  })

  it("doc: renders the roll-up as today (no cockpit pieces)", () => {
    withTenant("doc", () => {
      const el = render(<BureauRollup submissions={[]} />)
      expect(el.querySelector('[data-cockpit="section-title"]')).toBeNull()
      expect(el.querySelector('[data-cockpit="rollup-table"]')).toBeNull()
      expect(el.querySelector("h2")?.textContent).toBe(`${getTenant().tierLabels.unit} roll-up`)
      expect(el.querySelector("[data-zero]")).toBeNull()
      expect(el.textContent).not.toContain("zero")
      expect(el.querySelector(".rounded-lg")).not.toBeNull()
    })
  })
})
