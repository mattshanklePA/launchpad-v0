import { describe, it, expect } from "vitest"
import { compareProfiles, type ProfileRowKey } from "@/lib/programProfiles"
import { es2SeedSubmissions } from "@/lib/seedSubmissionsEs2"
import { es2 } from "@/lib/tenant/es2"
import { uspto } from "@/lib/tenant/uspto"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import type { Submission } from "@/lib/submissions"

const byId = (id: string) => {
  const found = es2SeedSubmissions.find((s) => s.id === id)
  if (!found) throw new Error(`No seed submission with id "${id}"`)
  return found
}
const SUPPLIER = [
  "es2-bts-supplier-risk-scoring",
  "es2-digitalmarket-vendor-past-performance",
  "es2-logfin-supplier-past-performance",
].map(byId)
const SUPPORT = ["es2-bts-support-request-routing", "es2-cerp-support-request-routing"].map(byId)

const idea = (businessUnit: string, office = ""): Submission =>
  ({ id: `x-${businessUnit}-${office}`, businessUnit, office, formData: {} }) as unknown as Submission

const notesFor = (r: ReturnType<typeof compareProfiles>, key: ProfileRowKey) =>
  r.rows.find((x) => x.key === key)!.notes

describe("compareProfiles (F8-1, #353)", () => {
  it("gives one column per idea in member order, with office and program labels", () => {
    const r = compareProfiles(SUPPLIER, es2)
    expect(r.columns).toHaveLength(3)
    expect(r.columns.map((c) => c.submissionId)).toEqual(SUPPLIER.map((s) => s.id))
    expect(r.columns[0].officeLabel).toBe("Business Technology Solutions (BTS)")
    expect(r.columns[0].programLabel).toBeUndefined()
    expect(r.columns[1].officeLabel).toBe("Acquisition, Training and Readiness (AT&R)")
    expect(r.columns[1].programLabel).toBe("Digital Market")
    expect(r.columns.every((c) => c.profile !== null)).toBe(true)
  })

  it("supplier group: BTS and Digital Market read same on where it runs and built on, LOG-FIN differs", () => {
    const r = compareProfiles(SUPPLIER, es2)
    expect(notesFor(r, "runsOn")).toEqual([null, "same", "different"])
    expect(notesFor(r, "builtOn")).toEqual([null, "same", "different"])
  })

  it("payment group: HR-FM and LOG-FIN differ on platform", () => {
    const r = compareProfiles([idea("hrfm"), idea("logfin")], es2)
    expect(notesFor(r, "builtOn")).toEqual([null, "different"])
  })

  it("support request group: the C-ERP column has no profile and no notes", () => {
    const r = compareProfiles(SUPPORT, es2)
    expect(r.columns[0].profile).not.toBeNull()
    expect(r.columns[1].profile).toBeNull()
    for (const row of r.rows) expect(row.notes[1]).toBeNull()
  })

  it("an idea with no office or an unknown office gives a none column, never an error", () => {
    const r = compareProfiles([idea("bts"), idea(""), idea("nope"), idea("hrfm", "stray")], es2)
    expect(r.columns.map((c) => c.profile === null)).toEqual([false, true, true, true])
    for (const row of r.rows) expect(row.notes.slice(1)).toEqual([null, null, null])
  })

  it("a program with no profile does not fall back to another program's", () => {
    const r = compareProfiles([idea("atr", "digitalmarket"), idea("atr", "atis"), idea("atr")], es2)
    expect(r.columns[0].profile).not.toBeNull()
    expect(r.columns[1].profile).toBeNull()
    expect(r.columns[2].profile).toBeNull()
  })

  it("when the first column has no profile every note is empty", () => {
    const r = compareProfiles([idea("cerp"), idea("bts"), idea("hrfm")], es2)
    for (const row of r.rows) expect(row.notes).toEqual([null, null, null])
  })

  it("handles an empty group", () => {
    const r = compareProfiles([], es2)
    expect(r.columns).toEqual([])
    expect(r.rows.every((x) => x.notes.length === 0)).toBe(true)
  })

  it.each([uspto, doc, dow])("a tenant with no profiles returns no profile for every idea ($id)", (t) => {
    const r = compareProfiles(SUPPLIER, t)
    expect(r.columns).toHaveLength(3)
    expect(r.columns.every((c) => c.profile === null)).toBe(true)
    for (const row of r.rows) expect(row.notes.every((n) => n === null)).toBe(true)
  })
})

describe("ES2 program profile setup data", () => {
  it("turns the setting on for ES2 only, and covers every office but cerp", () => {
    expect(es2.features.programProfiles).toBe(true)
    for (const t of [uspto, doc, dow]) expect(t.features.programProfiles).toBeFalsy()
    const offices = (es2.programProfiles ?? []).map((p) => p.program ?? p.office).sort()
    expect(offices).toEqual(["acws", "bts", "digitalmarket", "hrfm", "logfin"])
  })

  it("points only at offices and programs the tenant declares", () => {
    for (const p of es2.programProfiles ?? []) {
      const unit = es2.unit.options.find((o) => o.value === p.office)
      expect(unit, p.office).toBeDefined()
      if (p.program) expect(unit!.offices?.some((o) => o.value === p.program), p.program).toBe(true)
    }
  })

  it("uses no vendor or product names", () => {
    const text = JSON.stringify(es2.programProfiles)
    expect(text).not.toMatch(/—|Oracle|SAP|Microsoft|AWS|Azure|Salesforce|ServiceNow|Google|Army Enterprise/i)
  })
})
