import { describe, it, expect } from "vitest"
import {
  kpiStatusAccentClass,
  kpiTrendTextClass,
  isDuplicateClusterEntry,
  kpiDrilldownEntriesFor,
  previewKpiDrilldownEntries,
  kpiDrilldownOverflowCount,
  kpiDrilldownEntryHref,
  presentCardField,
} from "./kpi-card-data"
import type { KpiDrilldown, KpiDrilldownItem, DuplicateClusterDrilldownItem } from "@/lib/dashboard/drilldown"

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

function item(id: string): KpiDrilldownItem {
  return { id, title: `Idea ${id}`, bureau: "uspto", bureauLabel: "USPTO", stage: "Submitted", cardField: "field" }
}

function cluster(id: string, memberIds: string[]): DuplicateClusterDrilldownItem {
  return { ...item(id), memberIds }
}

describe("isDuplicateClusterEntry", () => {
  it("is false for a plain submission entry", () => {
    expect(isDuplicateClusterEntry(item("1"))).toBe(false)
  })

  it("is true for a cluster entry (carries memberIds)", () => {
    expect(isDuplicateClusterEntry(cluster("1", ["1", "2"]))).toBe(true)
  })
})

describe("kpiDrilldownEntriesFor", () => {
  const drilldown: KpiDrilldown = {
    pipeline: [item("p1")],
    readiness: [],
    "high-impact": [item("h1"), item("h2")],
    "omb-reportable": [],
    signoff: [],
    duplicates: [cluster("d1", ["d1", "d2"])],
    rmf: [],
  }

  it("returns [] when no drilldown has loaded yet", () => {
    expect(kpiDrilldownEntriesFor("pipeline", undefined)).toEqual([])
  })

  it("returns [] for a card id the drilldown doesn't recognize", () => {
    expect(kpiDrilldownEntriesFor("not-a-card", drilldown)).toEqual([])
  })

  it("looks up the matching list by card id", () => {
    expect(kpiDrilldownEntriesFor("high-impact", drilldown)).toHaveLength(2)
    expect(kpiDrilldownEntriesFor("duplicates", drilldown)).toEqual(drilldown.duplicates)
  })
})

describe("previewKpiDrilldownEntries / kpiDrilldownOverflowCount", () => {
  const items = [item("1"), item("2"), item("3"), item("4"), item("5"), item("6")]

  it("previews only the first `limit` entries and reports the rest as overflow", () => {
    expect(previewKpiDrilldownEntries(items, 4)).toEqual(items.slice(0, 4))
    expect(kpiDrilldownOverflowCount(items, 4)).toBe(2)
  })

  it("has no overflow once every entry fits within the limit", () => {
    expect(previewKpiDrilldownEntries(items, 10)).toEqual(items)
    expect(kpiDrilldownOverflowCount(items, 10)).toBe(0)
  })
})

describe("presentCardField", () => {
  it("splits a trailing parenthetical (omb-reportable's reason + consolidation status) into badge + descriptor", () => {
    expect(
      presentCardField({ ...item("1"), cardField: "Supports mission delivery, included at any stage. (Individual)" }),
    ).toEqual({ badge: "Individual", descriptor: "Supports mission delivery, included at any stage." })
    expect(presentCardField({ ...item("2"), cardField: "Matches a prior submission. (Consolidated)" })).toEqual({
      badge: "Consolidated",
      descriptor: "Matches a prior submission.",
    })
  })

  it("treats a short categorical value as badge-only", () => {
    expect(presentCardField({ ...item("1"), cardField: "Ready" })).toEqual({ badge: "Ready", descriptor: null })
    expect(presentCardField({ ...item("1"), cardField: "Pending rationalization" })).toEqual({
      badge: "Pending rationalization",
      descriptor: null,
    })
  })

  it("drops the badge when cardField just repeats stage (pipeline)", () => {
    expect(presentCardField({ ...item("1"), stage: "Approved", cardField: "Approved" })).toEqual({
      badge: null,
      descriptor: null,
    })
    expect(presentCardField({ ...item("1"), stage: "approved", cardField: "Approved" })).toEqual({
      badge: null,
      descriptor: null,
    })
  })

  it("keeps a long rationale (high-impact) as a bare descriptor", () => {
    const cardField =
      "AI output could meaningfully affect the safety of individuals (OMB M-25-21 Section 5). AI output could meaningfully affect an enforcement action (OMB M-25-21 Section 5)."
    expect(presentCardField({ ...item("1"), cardField })).toEqual({ badge: null, descriptor: cardField })
  })
})

describe("kpiDrilldownEntryHref", () => {
  it("links a plain entry to its own submission", () => {
    expect(kpiDrilldownEntryHref(item("abc"))).toBe("/submissions/abc")
  })

  it("links a cluster entry to its lead submission (id is already the lead's)", () => {
    expect(kpiDrilldownEntryHref(cluster("lead-1", ["lead-1", "member-2"]))).toBe("/submissions/lead-1")
  })
})
