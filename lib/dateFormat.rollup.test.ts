import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { formatKeystoneDate, submittedLabel } from "@/lib/dateFormat"

// F3-2 (#269): roll-up dates showed "11/1/2026" while every other screen showed
// "1 Nov 2026". Every screen date goes through the one shared formatter, for
// all four tenants (it is a bug, not a tenant choice).
const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8")

const SCREENS = [
  "app/admin/page.tsx",
  "components/admin/approval-transparency.tsx",
  "components/admin/rationalization-panel.tsx",
  "components/dashboard/personal-dashboard.tsx",
  "components/landing/recent-drafts.tsx",
  "components/submissions/submission-detail.tsx",
  "components/submissions/governance-capture-panel.tsx",
  "components/submissions/rmf-panel.tsx",
]

describe("roll-up and screen dates use the shared formatter", () => {
  it("formats as d Mon yyyy in the display zone", () => {
    expect(formatKeystoneDate("2026-11-01T15:00:00Z")).toBe("1 Nov 2026")
    expect(formatKeystoneDate("nope")).toBe("nope")
  })
  for (const f of SCREENS) {
    it(`${f} does not use the M/D/YYYY formatter`, () => {
      expect(read(f)).not.toMatch(/formatDisplayDate|toLocaleDateString/)
    })
  }

  it("labels a recent submission 'just submitted' and an older one with its date", () => {
    const now = Date.parse("2026-11-12T12:00:00Z")
    expect(submittedLabel("2026-11-12T08:00:00Z", now)).toBe("just submitted")
    expect(submittedLabel("2026-11-10T08:00:00Z", now)).toBe("Submitted 10 Nov 2026")
  })
})
