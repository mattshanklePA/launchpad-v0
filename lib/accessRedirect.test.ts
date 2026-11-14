// A signed-in person without the role a page needs used to be sent to
// /login?next=<page>. The login page sends a signed-in person straight on to
// `next`, which sent them back, forever: a submitter who opened the Decision
// Center or Admin froze and crashed the browser (found on the ES2 preview,
// 14 Nov). Signed in but not allowed now goes home; only signed-out goes to
// the login page.

import { describe, it, expect } from "vitest"
import { accessRedirect } from "@/lib/accessRedirect"

const submitter = { role: "submitter" } as const
const reviewer = { role: "reviewer" } as const
const admin = { role: "admin" } as const

describe("accessRedirect", () => {
  it("sends a signed-out person to the login page, keeping where they were going", () => {
    expect(accessRedirect(null, ["admin", "reviewer"], "/decisions")).toBe("/login?next=%2Fdecisions")
    expect(accessRedirect(null, undefined, "/home")).toBe("/login?next=%2Fhome")
  })

  it("sends a signed-in person without the role home, never to the login page", () => {
    expect(accessRedirect(submitter, ["admin", "reviewer"], "/decisions")).toBe("/home")
    expect(accessRedirect(submitter, ["admin", "reviewer"], "/admin")).toBe("/home")
  })

  it("lets a signed-in person with the role stay", () => {
    expect(accessRedirect(reviewer, ["admin", "reviewer"], "/decisions")).toBeNull()
    expect(accessRedirect(admin, ["admin", "reviewer"], "/admin")).toBeNull()
    expect(accessRedirect(submitter, undefined, "/home")).toBeNull()
  })

  it("never sends anyone from /home back to /home", () => {
    expect(accessRedirect(submitter, ["admin"], "/home")).not.toBe("/home")
  })
})
