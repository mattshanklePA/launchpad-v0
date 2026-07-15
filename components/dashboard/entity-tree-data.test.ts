import { describe, it, expect } from "vitest"
import { isBureauSelected, isOfficeSelected } from "./entity-tree-data"
import type { HierarchyBureau } from "@/lib/dashboard/scope"

const noaa: HierarchyBureau = {
  value: "noaa",
  label: "NOAA",
  offices: [
    { value: "nws", label: "National Weather Service" },
    { value: "nmfs", label: "National Marine Fisheries Service" },
  ],
}
const nist: HierarchyBureau = { value: "nist", label: "NIST", offices: [] }

describe("isBureauSelected", () => {
  it("is false with no selection", () => {
    expect(isBureauSelected(noaa, null)).toBe(false)
    expect(isBureauSelected(noaa, undefined)).toBe(false)
  })

  it("is true when the selection is exactly this bureau, no office", () => {
    expect(isBureauSelected(noaa, { businessUnit: "noaa" })).toBe(true)
  })

  it("is false when the selection is a different bureau", () => {
    expect(isBureauSelected(nist, { businessUnit: "noaa" })).toBe(false)
  })

  it("is false when the selection is an office within this bureau (office node is selected instead)", () => {
    expect(isBureauSelected(noaa, { businessUnit: "noaa", office: "nws" })).toBe(false)
  })
})

describe("isOfficeSelected", () => {
  it("is false with no selection", () => {
    expect(isOfficeSelected(noaa, "nws", null)).toBe(false)
  })

  it("is true when the selection matches bureau + office", () => {
    expect(isOfficeSelected(noaa, "nws", { businessUnit: "noaa", office: "nws" })).toBe(true)
  })

  it("is false for a different office in the same bureau", () => {
    expect(isOfficeSelected(noaa, "nws", { businessUnit: "noaa", office: "nmfs" })).toBe(false)
  })

  it("is false when the selection is the bureau itself with no office", () => {
    expect(isOfficeSelected(noaa, "nws", { businessUnit: "noaa" })).toBe(false)
  })

  it("is false when the selection is a different bureau's office of the same value", () => {
    expect(isOfficeSelected(nist, "nws", { businessUnit: "noaa", office: "nws" })).toBe(false)
  })
})
