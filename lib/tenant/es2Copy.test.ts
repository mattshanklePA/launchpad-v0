import { describe, it, expect, vi } from "vitest"

vi.mock("next/font/local", () => ({
  default: () => ({ variable: "", className: "", style: {} }),
}))

import { es2 } from "@/lib/tenant/es2"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { tenantCopy } from "@/lib/tenant/copy"
import { landingStrings } from "@/components/landing/public-landing"
import { getGlossary } from "@/lib/glossary"
import { plumbLine } from "@/lib/dashboard/plumbLine"
import { proposeIsWithheld } from "@/lib/ombAutofill"

// F3-2 (#269). Reg Shuford and Billy McCain read every word on the ES2 screens:
// no mandate framing, no unmeasured time claims, no OMB cited as authority, no
// internal jargon. This walks every ES2 string that is built as data and fails
// on a banned phrase. Strings in shared JSX are covered by component tests that
// render under the ES2 tenant; wording for the other tenants is not touched.

const BANNED: { name: string; re: RegExp }[] = [
  { name: "requires (as a mandate)", re: /\brequires\b/i },
  { name: "two minutes", re: /\btwo minutes\b/i },
  { name: "2 minutes", re: /\b2 minutes\b/i },
  { name: "OMB's", re: /\bOMB['’]s\b/i },
  { name: "off-plumb", re: /off-plumb/i },
  { name: "NLP-based", re: /NLP-based/i },
  { name: "scaffold", re: /scaffold/i },
  { name: "rationalization", re: /rationalization/i },
  { name: "reportability", re: /reportability/i },
  { name: "keep-separate", re: /keep-separate/i },
  { name: "em dash", re: /—/ },
]

function leaves(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => leaves(v, out))
  else if (value && typeof value === "object") Object.values(value).forEach((v) => leaves(v, out))
  return out
}

function es2Strings(): string[] {
  // `strategicContext` is a model prompt, never rendered.
  const { strategicContext: _omit, ...rendered } = es2
  void _omit
  return [
    ...leaves(rendered),
    ...landingStrings(es2, true),
    ...leaves(getGlossary(es2)),
    ...leaves(tenantCopy(es2)),
  ]
}

describe("ES2 copy and credibility sweep (#269)", () => {
  it("renders no banned phrase anywhere in ES2's data-built strings", () => {
    const hits: string[] = []
    for (const s of es2Strings()) {
      for (const b of BANNED) if (b.re.test(s)) hits.push(`[${b.name}] ${s}`)
    }
    expect(hits).toEqual([])
  })

  it("uses the plain-word replacements", () => {
    const c = tenantCopy(es2)
    expect(c.rmfAtRiskLabel).toBe("Risk framework needs attention")
    expect(c.pendingDecisionLabel).toBe("Waiting on a decision: combine or keep separate")
    expect(c.keepSeparate).toBe("keep separate")
    expect(c.nothingNeedsAttention).toBe("Nothing needs attention")
    expect(c.inventoryCheckLabel).toBe("Check if it goes in the AI inventory")
    expect(c.affectedUnitsPrompt).toContain("program offices")
    expect(c.affectedUnitsPrompt).not.toContain("business units")
  })

  it("says what the public reporting default is without citing OMB", () => {
    const p = proposeIsWithheld({ nationalSecuritySystem: "no", securityClassification: "" } as never, es2)
    expect(p.rationale).toBe("Defaults to No: nothing found that needs to stay out of public reporting.")
  })

  it("Plumb's all-clear line is plain on ES2", () => {
    expect(plumbLine(false, 0, es2)).toBe("Nothing needs attention. Every use case is inside its gates.")
  })

  it("leaves USPTO, DoC and DoW wording exactly as it was", () => {
    for (const t of [uspto, doc, dow]) {
      const c = tenantCopy(t)
      expect(c.rmfAtRiskLabel).toBe("RMF at risk")
      expect(c.keepSeparate).toBe("keep-separate")
      expect(c.nothingNeedsAttention).toBe("Nothing off-plumb")
      expect(c.haveEnoughOption).toBe("I have enough, give me the scaffold")
      expect(plumbLine(false, 0, t)).toBe("Nothing off-plumb. Every use case is inside its gates.")
      expect(landingStrings(t, true)).toContain("See it in 2 minutes")
    }
  })
})
