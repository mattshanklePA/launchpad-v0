import { describe, it, expect } from "vitest"
import { plumbLine } from "./plumbLine"

describe("plumbLine", () => {
  it("leads with the cluster when a critical item is present, regardless of warning count", () => {
    expect(plumbLine(true, 0)).toBe(
      "The cluster is the only thing blocking approvals this week. Everything else can wait until it is settled.",
    )
    expect(plumbLine(true, 4)).toBe(
      "The cluster is the only thing blocking approvals this week. Everything else can wait until it is settled.",
    )
  })

  it("reports the warning count when nothing is critical", () => {
    expect(plumbLine(false, 1)).toBe("Nothing is blocked. 1 item wants a reviewer when you have time.")
    expect(plumbLine(false, 3)).toBe("Nothing is blocked. 3 items want a reviewer when you have time.")
  })

  it("reads as an all-clear when nothing needs a reviewer", () => {
    expect(plumbLine(false, 0)).toBe("Nothing off-plumb. Every use case is inside its gates.")
  })
})
