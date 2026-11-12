import { describe, it, expect } from "vitest"
import { formatDisplayDate, DISPLAY_TIME_ZONE } from "./dateFormat"

describe("formatDisplayDate", () => {
  it("uses the fixed display zone", () => {
    expect(DISPLAY_TIME_ZONE).toBe("America/New_York")
    expect(formatDisplayDate("2026-08-18T00:00:00.000Z")).toBe("8/17/2026")
  })
  it("honours an explicit zone", () => {
    expect(formatDisplayDate("2026-08-18T00:00:00.000Z", "UTC")).toBe("8/18/2026")
  })
  it("returns the input for an invalid date", () => {
    expect(formatDisplayDate("nope")).toBe("nope")
  })
})
