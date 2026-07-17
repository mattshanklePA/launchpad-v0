import { describe, it, expect } from "vitest"
import { GLOSSARY, GLOSSARY_TERM_KEYS, type GlossaryTermKey } from "@/lib/glossary"

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

  it("is tenant-neutral (no hardcoded tenant/org names)", () => {
    const tenantNames = ["USPTO", "DoW", "DoC", "Commerce", "Warder", "LaunchPad"]
    for (const key of GLOSSARY_TERM_KEYS) {
      const entry = GLOSSARY[key]
      for (const name of tenantNames) {
        expect(entry.definition.includes(name), `${key} definition should not mention "${name}"`).toBe(false)
      }
    }
  })
})
