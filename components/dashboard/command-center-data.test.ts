import { describe, it, expect } from "vitest"
import {
  spellCount,
  splitLeadingCount,
  formatKeystoneDate,
  splitLabelCode,
  buildHeroCluster,
  findHeroItem,
  rowItems,
  submissionStatusKeystone,
  scopedSubmissionRow,
  uniqueSlugTail,
} from "./command-center-data"
import type { DuplicateClusterDrilldownItem } from "@/lib/dashboard/drilldown"
import type { ActionItem } from "./action-center-data"
import type { Submission } from "@/lib/submissions"
import type { TenantConfig } from "@/lib/tenant"

describe("spellCount", () => {
  it("spells out 2-9", () => {
    expect(spellCount(2)).toBe("Two")
    expect(spellCount(9)).toBe("Nine")
  })

  it("falls back to the digit outside 2-9", () => {
    expect(spellCount(1)).toBe("1")
    expect(spellCount(10)).toBe("10")
  })
})

describe("splitLeadingCount", () => {
  it("splits a leading digit run from the rest of the sentence", () => {
    expect(splitLeadingCount("9 submissions with no reviewer assigned")).toEqual(["9", "submissions with no reviewer assigned"])
  })

  it("returns an empty count when the title has no leading number", () => {
    expect(splitLeadingCount("Nothing needs attention")).toEqual(["", "Nothing needs attention"])
  })
})

describe("formatKeystoneDate", () => {
  it("formats as d Mon yyyy", () => {
    expect(formatKeystoneDate("2026-08-18T00:00:00.000Z")).toBe("18 Aug 2026")
  })
})

describe("splitLabelCode", () => {
  it("splits a trailing parenthetical code from the bare name", () => {
    expect(splitLabelCode("Army Contract Writing System (ACWS)")).toEqual({ code: "ACWS", name: "Army Contract Writing System" })
  })

  it("returns a null code when the label has no parenthetical", () => {
    expect(splitLabelCode("Digital Market")).toEqual({ code: null, name: "Digital Market" })
  })
})

describe("uniqueSlugTail", () => {
  it("drops the tenant and unit prefix, uppercasing what's left", () => {
    expect(uniqueSlugTail("es2-acws-source-selection-scoring")).toBe("SOURCE-SELECTION-SCORING")
  })

  it("gives two submissions in the same unit different identifiers", () => {
    expect(uniqueSlugTail("es2-acws-source-selection-scoring")).not.toBe(uniqueSlugTail("es2-acws-clause-recommendation"))
  })

  it("falls back to the full id, uppercased, when there aren't three segments to drop from", () => {
    expect(uniqueSlugTail("abc")).toBe("ABC")
    expect(uniqueSlugTail("abc-def")).toBe("ABC-DEF")
  })
})

function cluster(id: string, memberIds: string[], bureauLabel: string, title = `Idea ${id}`): DuplicateClusterDrilldownItem {
  return { id, title, bureau: "x", bureauLabel, stage: "In review", cardField: "Pending rationalization", memberIds }
}

const tenant = {
  tierLabels: { department: "Enterprise", unit: "Program Office", unitPlural: "Program Offices", subUnit: "Program", subUnitPlural: "Programs" },
} as unknown as TenantConfig

describe("buildHeroCluster", () => {
  it("is null when nothing is pending", () => {
    expect(buildHeroCluster([], tenant)).toBeNull()
  })

  it("builds the headline from the first cluster's member count and lead title", () => {
    const hero = buildHeroCluster(
      [cluster("lead-1", ["lead-1", "m2", "m3"], "Business Technology Solutions / Acquisition, Training and Readiness / Logistics & Finance", "Supplier Past-Performance Risk Scoring")],
      tenant,
    )
    expect(hero?.headline).toBe("Three program offices are building Supplier Past-Performance Risk Scoring.")
    expect(hero?.officeLabels).toEqual(["Business Technology Solutions", "Acquisition, Training and Readiness", "Logistics & Finance"])
    expect(hero?.href).toBe("/clusters/lead-1")
    expect(hero?.body).toMatch(/^One duplicate cluster is pending rationalization\./)
    expect(hero?.hint).toBe("Opens the three use cases side by side. Nothing is merged until you choose.")
  })

  it("uses the first cluster for the headline and states the total count in the body when more than one is pending", () => {
    const hero = buildHeroCluster(
      [cluster("lead-1", ["lead-1", "m2"], "BTS / AT&R"), cluster("lead-2", ["lead-2", "m3"], "LOG-FIN / C-ERP")],
      tenant,
    )
    expect(hero?.headline).toContain("Idea lead-1")
    expect(hero?.body).toBe(
      "2 duplicate clusters are pending rationalization. Nothing in them can be approved until each is consolidated or marked keep-separate.",
    )
  })
})

describe("findHeroItem / rowItems", () => {
  const items: ActionItem[] = [
    { id: "duplicates", title: "1 cluster pending rationalization", severity: "critical" },
    { id: "signoff", title: "2 approved use cases awaiting sign-off", severity: "warning" },
  ]

  it("finds the critical item as the hero", () => {
    expect(findHeroItem(items)?.id).toBe("duplicates")
  })

  it("is null when nothing is critical", () => {
    expect(findHeroItem(items.filter((i) => i.severity !== "critical"))).toBeNull()
  })

  it("excludes the hero item from the row list", () => {
    const hero = findHeroItem(items)
    expect(rowItems(items, hero).map((i) => i.id)).toEqual(["signoff"])
  })

  it("keeps every item when there is no hero", () => {
    expect(rowItems(items, null).map((i) => i.id)).toEqual(["duplicates", "signoff"])
  })
})

describe("submissionStatusKeystone", () => {
  it("maps every status onto the DS four-state vocabulary", () => {
    expect(submissionStatusKeystone("approved")).toBe("healthy")
    expect(submissionStatusKeystone("in_review")).toBe("attention")
    expect(submissionStatusKeystone("needs_info")).toBe("alert")
    expect(submissionStatusKeystone("rejected")).toBe("alert")
    expect(submissionStatusKeystone("submitted")).toBe("neutral")
  })
})

describe("scopedSubmissionRow", () => {
  function submission(overrides: Partial<Submission> = {}): Submission {
    return {
      id: "s1",
      submittedAt: "2026-08-18T00:00:00.000Z",
      formData: { useCaseTitle: "Closeout completeness flagging", submitterName: "Avery Lang" } as any,
      status: "in_review",
      ...overrides,
    }
  }

  it("shows the submitted date and links to the submission when not a pending cluster member", () => {
    const row = scopedSubmissionRow(submission(), undefined)
    expect(row.meta).toBe("Avery Lang · submitted 18 Aug 2026")
    expect(row.statusLabel).toBe("In review")
    expect(row.statusKeystone).toBe("attention")
    expect(row.href).toBe("/submissions/s1")
  })

  it("shows 'in duplicate cluster', forces a Blocked/alert pill, and links to the cluster page for a pending cluster member", () => {
    const row = scopedSubmissionRow(submission(), "s1")
    expect(row.meta).toBe("Avery Lang · in duplicate cluster")
    expect(row.statusLabel).toBe("Blocked")
    expect(row.statusKeystone).toBe("alert")
    expect(row.href).toBe("/clusters/s1")
  })
})
