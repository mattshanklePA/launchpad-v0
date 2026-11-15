import { describe, it, expect, vi, afterEach } from "vitest"

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))
vi.mock("@/components/report/report-screen", () => ({ ReportScreen: () => "screen" }))

import ReportPage from "./page"

// F5-2 (#319): with the switch off, /report is the normal not-found page.
afterEach(() => {
  delete process.env.NEXT_PUBLIC_TENANT
})

describe("/report page", () => {
  it.each(["uspto", "doc", "dow"])("is not found for %s", (t) => {
    process.env.NEXT_PUBLIC_TENANT = t
    expect(() => ReportPage()).toThrow("NEXT_NOT_FOUND")
  })

  it("renders the screen for es2", () => {
    process.env.NEXT_PUBLIC_TENANT = "es2"
    expect(ReportPage()).toBeTruthy()
  })
})
