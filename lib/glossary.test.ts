import { describe, it, expect } from "vitest"
import { GLOSSARY, GLOSSARY_TERM_KEYS, getGlossary, type GlossaryTermKey } from "@/lib/glossary"
import { doc } from "@/lib/tenant/doc"
import type { TenantConfig } from "@/lib/tenant"

const es2 = {
  ...doc,
  id: "es2",
  tierLabels: {
    department: "Command",
    unit: "Directorate",
    unitPlural: "Directorates",
    subUnit: "Branch",
    subUnitPlural: "Branches",
  },
} as TenantConfig

const EXPECTED_KEYS: GlossaryTermKey[] = [
  "crossBureauRationalization",
  "ombReportability",
  "consolidatedIndividualReporting",
  "highImpactDetermination",
  "nistAiRmf",
  "coveredPartialGap",
  "tokenOverlapMatch",
  "awaitingBureauSignOff",
  "advisory",
  "inPipeline",
  "readinessReady",
  "rmfAtRisk",
]

describe("GLOSSARY", () => {
  it("seeds exactly the starter set of terms", () => {
    expect(GLOSSARY_TERM_KEYS.sort()).toEqual([...EXPECTED_KEYS].sort())
  })

  it("gives every entry a non-empty term and definition", () => {
    for (const key of GLOSSARY_TERM_KEYS) {
      const entry = GLOSSARY[key]
      expect(entry.term.trim().length, `${key}.term`).toBeGreaterThan(0)
      expect(entry.definition.trim().length, `${key}.definition`).toBeGreaterThan(0)
    }
  })

  it("never renames the formal term inside its own definition", () => {
    // Guardrail: the tooltip explains the term, it doesn't invent a new name
    // for it — the definition should read as prose, not as "X means Y".
    for (const key of GLOSSARY_TERM_KEYS) {
      const entry = GLOSSARY[key]
      expect(entry.definition.toLowerCase().startsWith(entry.term.toLowerCase())).toBe(false)
    }
  })

  it("mentions NIST AI RMF's four functions in its definition", () => {
    expect(GLOSSARY.nistAiRmf.definition).toMatch(/govern/i)
    expect(GLOSSARY.nistAiRmf.definition).toMatch(/map/i)
    expect(GLOSSARY.nistAiRmf.definition).toMatch(/measure/i)
    expect(GLOSSARY.nistAiRmf.definition).toMatch(/manage/i)
  })

  it("gives Commerce exactly the two tier terms it read before (ISS-3)", () => {
    const g = getGlossary(doc)
    expect(g.crossBureauRationalization.term).toBe("Cross-bureau rationalization")
    expect(g.crossBureauRationalization.definition).toBe(
      "A check for AI use cases that look like the same effort being built more than once across different bureaus, so a reviewer can decide whether to consolidate them or keep them separate before approving.",
    )
    expect(g.awaitingBureauSignOff.term).toBe("Awaiting bureau sign-off")
    expect(g.awaitingBureauSignOff.definition).toBe(
      "This use case has been approved or rejected, but no record yet shows which bureau official signed off on that decision or when.",
    )
  })

  // ISS-3 regression: these two tooltips render on the reviewer detail view and
  // the dashboard KPI strip, so a hardcoded "bureau" reached every tenant.
  it("names a non-Commerce tenant's own tier in both tier terms and definitions", () => {
    const g = getGlossary(es2)
    expect(g.crossBureauRationalization.term).toBe("Cross-directorate rationalization")
    expect(g.crossBureauRationalization.definition).toContain("across different directorates")
    expect(g.awaitingBureauSignOff.term).toBe("Awaiting directorate sign-off")
    expect(g.awaitingBureauSignOff.definition).toContain("which directorate official")
    for (const key of ["crossBureauRationalization", "awaitingBureauSignOff"] as GlossaryTermKey[]) {
      expect(g[key].term, key).not.toMatch(/bureau|business unit/i)
      expect(g[key].definition, key).not.toMatch(/bureau|business unit/i)
    }
  })

  it("keeps the lookup keys structural — they never follow the copy", () => {
    // Guardrail carried forward from #178: `<GlossaryTerm term="..."/>` call
    // sites and `department-dashboard-data.ts`'s KPI `glossary` values
    // reference these keys by name.
    for (const tenant of [doc, es2]) {
      expect(Object.keys(getGlossary(tenant)).sort()).toEqual([...EXPECTED_KEYS].sort())
    }
  })

  it("leaves every non-tier entry byte-identical across tenants", () => {
    const commerce = getGlossary(doc)
    const other = getGlossary(es2)
    const tierKeys = new Set<string>(["crossBureauRationalization", "awaitingBureauSignOff"])
    for (const key of GLOSSARY_TERM_KEYS) {
      if (tierKeys.has(key)) continue
      expect(other[key], key).toEqual(commerce[key])
    }
  })

  it("is tenant-neutral (no hardcoded tenant/org names)", () => {
    const tenantNames = ["USPTO", "DoW", "DoC", "Commerce", "Keystone", "LaunchPad"]
    for (const key of GLOSSARY_TERM_KEYS) {
      const entry = GLOSSARY[key]
      for (const name of tenantNames) {
        expect(entry.definition.includes(name), `${key} definition should not mention "${name}"`).toBe(false)
      }
    }
  })
})
