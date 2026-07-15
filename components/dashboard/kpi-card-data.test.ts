import { describe, it, expect } from "vitest"
import { kpiStatusAccentClass, kpiTrendTextClass } from "./kpi-card-data"

describe("kpiStatusAccentClass", () => {
  it("defaults to the neutral accent when no status is given", () => {
    expect(kpiStatusAccentClass()).toBe("border-l-border")
  })

  it("returns a distinct accent per status", () => {
    expect(kpiStatusAccentClass("good")).toBe("border-l-emerald-500")
    expect(kpiStatusAccentClass("warning")).toBe("border-l-amber-500")
    expect(kpiStatusAccentClass("critical")).toBe("border-l-red-500")
  })
})

describe("kpiTrendTextClass", () => {
  it("returns a distinct color per trend direction", () => {
    expect(kpiTrendTextClass("up")).toContain("emerald")
    expect(kpiTrendTextClass("down")).toContain("red")
    expect(kpiTrendTextClass("flat")).toBe("text-muted-foreground")
  })
})
