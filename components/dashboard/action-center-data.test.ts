import { describe, it, expect } from "vitest"
import { sortActionItemsBySeverity, type ActionItem } from "./action-center-data"

function item(id: string, severity?: ActionItem["severity"]): ActionItem {
  return { id, title: id, severity }
}

describe("sortActionItemsBySeverity", () => {
  it("orders critical, then warning, then info", () => {
    const items = [item("a", "info"), item("b", "critical"), item("c", "warning")]
    expect(sortActionItemsBySeverity(items).map((i) => i.id)).toEqual(["b", "c", "a"])
  })

  it("treats a missing severity as info", () => {
    const items = [item("a", "critical"), item("b", undefined)]
    expect(sortActionItemsBySeverity(items).map((i) => i.id)).toEqual(["a", "b"])
  })

  it("preserves relative order within the same severity (stable sort)", () => {
    const items = [item("a", "warning"), item("b", "warning")]
    expect(sortActionItemsBySeverity(items).map((i) => i.id)).toEqual(["a", "b"])
  })

  it("does not mutate the input array", () => {
    const items = [item("a", "info"), item("b", "critical")]
    const copy = [...items]
    sortActionItemsBySeverity(items)
    expect(items).toEqual(copy)
  })
})
