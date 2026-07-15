import { describe, it, expect, beforeEach } from "vitest"
import { profileFromSession, isProfileComplete } from "./form-context"

const SESSION_KEY = "launchpad-session"

function setSession(session: Record<string, unknown>) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

describe("profileFromSession", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns empty when there is no signed-in user (anonymous path)", () => {
    expect(profileFromSession()).toEqual({})
  })

  it("pre-fills name, email, role, and business unit from a complete profile", () => {
    setSession({
      userId: "user-1",
      email: "jane.doe@census.gov",
      name: "Jane Doe",
      role: "submitter",
      loggedInAt: "2026-07-15T00:00:00.000Z",
      jobRole: "product_owner",
      businessUnit: "census",
      office: "field-ops",
    })

    expect(profileFromSession()).toEqual({
      submitterName: "Jane Doe",
      submitterEmail: "jane.doe@census.gov",
      submitterRole: "product_owner",
      submitterOffice: "census",
      submitterSubOffice: "field-ops",
    })
  })

  it("only pre-fills the fields the profile actually has (partial profile)", () => {
    setSession({
      userId: "user-2",
      email: "sam@census.gov",
      name: "Sam Rivera",
      role: "submitter",
      loggedInAt: "2026-07-15T00:00:00.000Z",
      // jobRole/businessUnit/office intentionally absent
    })

    expect(profileFromSession()).toEqual({
      submitterName: "Sam Rivera",
      submitterEmail: "sam@census.gov",
      submitterRole: "",
      submitterOffice: "",
      submitterSubOffice: "",
    })
  })
})

describe("isProfileComplete", () => {
  it("is true only when name, email, role, and business unit are all present", () => {
    expect(
      isProfileComplete({
        submitterName: "Jane Doe",
        submitterEmail: "jane@census.gov",
        submitterRole: "product_owner",
        submitterOffice: "census",
      }),
    ).toBe(true)
  })

  it("is false when role is missing", () => {
    expect(
      isProfileComplete({
        submitterName: "Jane Doe",
        submitterEmail: "jane@census.gov",
        submitterRole: "",
        submitterOffice: "census",
      }),
    ).toBe(false)
  })

  it("is false when business unit is missing", () => {
    expect(
      isProfileComplete({
        submitterName: "Jane Doe",
        submitterEmail: "jane@census.gov",
        submitterRole: "product_owner",
        submitterOffice: "",
      }),
    ).toBe(false)
  })
})
