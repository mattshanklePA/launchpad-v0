import { describe, it, expect } from "vitest"
import { landingPathFor } from "./landingPath"
import { es2 } from "./tenant/es2"
import { doc } from "./tenant/doc"
import { uspto } from "./tenant/uspto"
import { dow } from "./tenant/dow"

const s = (role: "admin" | "reviewer" | "submitter", businessUnit?: string) => ({ role, businessUnit })

describe("landingPathFor (F5-3, #320)", () => {
  it("sends an enterprise-wide admin on ES2 to /report", () => {
    expect(landingPathFor(s("admin"), es2)).toBe("/report")
    expect(landingPathFor(s("admin", "os"), es2)).toBe("/report")
  })
  it("sends an admin tied to one office, a reviewer and a submitter to /home", () => {
    expect(landingPathFor(s("admin", "census"), es2)).toBe("/home")
    expect(landingPathFor(s("reviewer"), es2)).toBe("/home")
    expect(landingPathFor(s("submitter"), es2)).toBe("/home")
  })
  it("sends nobody to /report with the switch off", () => {
    for (const t of [uspto, doc, dow, { ...es2, features: { ...es2.features, portfolioReport: false } }]) {
      expect(landingPathFor(s("admin"), t)).toBe("/home")
      expect(landingPathFor(s("admin", "os"), t)).toBe("/home")
    }
  })
  it("sends no session to /home", () => {
    expect(landingPathFor(null, es2)).toBe("/home")
  })
})
