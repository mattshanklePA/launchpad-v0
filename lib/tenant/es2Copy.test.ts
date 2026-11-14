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
  // NL-13 (#314)
  { name: "RMF functions", re: /RMF functions?/i },
  { name: "Rationalize", re: /\bRationalize\b/i },
  { name: "Consolidated (Inventory)", re: /Consolidated \(/ },
  { name: "duplicate clusters", re: /duplicate clusters/i },
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
    expect(c.inventoryCheckLabel).toBe("Check whether it counts toward the AI inventory")
    expect(c.affectedUnitsPrompt).toContain("program offices")
    expect(c.affectedUnitsPrompt).not.toContain("business units")
  })

  it("NL-13: plain words from the approved mocks", () => {
    const c = tenantCopy(es2)
    expect(c.duplicatesLabel).toBe("Same idea in more than one office")
    expect(c.duplicatesActionLabel).toBe("Decide")
    expect(c.consolidatedColumnLabel).toBe("Counted as one inventory entry")
    expect(c.inventoryEntriesPhrase).toBe("entries in the AI inventory")
    expect(c.rmfPartialRationale).toBe("Some risk steps are not covered yet. See what is missing.")
    expect(c.similarWordingLabel).toBe("{count} with similar wording")
    expect(c.noOtherMessages).toBe("No other messages")
  })

  it("NL-13: the high-impact glossary line is the CEO's wording, exactly", () => {
    expect(getGlossary(es2).highImpactDetermination.definition).toBe(
      "High-impact: an AI use whose output is a main basis for a decision with a legal, material or significant effect on people's rights or safety. Keystone uses the federal civilian definition as its standard. It is not a Department of War rule.",
    )
  })

  it("NL-13: the model prompt says line up with, not must satisfy", () => {
    expect(es2.strategicContext).toContain("line up with the DoW AI Ethical Principles")
    expect(es2.strategicContext).not.toContain("must satisfy")
  })

  it("NL-13: USPTO, DoC and DoW copy and glossary are unchanged", () => {
    for (const t of [uspto, doc, dow]) {
      const c = tenantCopy(t)
      expect(c.duplicatesLabel).toBe("")
      expect(c.duplicatesActionLabel).toBe("Rationalize")
      expect(c.consolidatedColumnLabel).toBe("Consolidated ({inventoryShort})".replace("{inventoryShort}", t.inventoryShortLabel))
      expect(c.inventoryEntriesPhrase).toBe(`${t.inventoryShortLabel} reportable entries`)
      expect(c.rmfPartialRationale).toBe("One or more RMF functions are only partially covered — review the flags for what's missing.")
      expect(c.inventoryCheckLabel).toBe("")
      expect(getGlossary(t).highImpactDetermination.definition).toContain("meets the high-impact definition in")
    }
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

describe("NL-13 (#314): record band place name", () => {
  it("uses the program short name, and the office short name when it has no programs", async () => {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_TENANT", "es2")
    const { recordPlaceShortLabel } = await import("@/components/dashboard/command-center-data")
    expect(recordPlaceShortLabel("atr", "acws")).toBe("ACWS")
    expect(recordPlaceShortLabel("atr", "digitalmarket")).toBe("Digital Market")
    expect(recordPlaceShortLabel("hrfm", "")).toBe("HR-FM")
    vi.unstubAllEnvs()
  })
})

// F5-2 (#319): the portfolio report screen's wording. Every report key, as ES2
// renders it, and the sentences the screen builds from them, must pass the same
// banned-phrase list plus the model-vendor rule. Only ES2 renders /report.
describe("F5-2 (#319): portfolio report copy", () => {
  const VENDOR = /\bAnthropic\b|\bClaude\b|\bSonnet\b|\bOpus\b|\bHaiku\b|\bOpenAI\b|\bChatGPT\b|\bGPT-?\d\w*\b|\bGemini\b|\bLlama\b|\bMistral\b|\bCohere\b|\bRMF\b|minimum practices/i
  const reportKeys = () => Object.keys(tenantCopy(es2)).filter((k) => /^report[A-Z]/.test(k)) as (keyof ReturnType<typeof tenantCopy>)[]

  it("has the report keys, none of them empty", () => {
    const keys = reportKeys()
    expect(keys.length).toBeGreaterThan(60)
    const c = tenantCopy(es2)
    for (const k of keys) expect(c[k].trim(), k).not.toBe("")
  })

  it("renders no banned phrase, em dash or vendor name in any report string", () => {
    const c = tenantCopy(es2)
    const hits: string[] = []
    for (const k of reportKeys()) {
      for (const b of [...BANNED, { name: "vendor, RMF or minimum practices", re: VENDOR }]) {
        if (b.re.test(c[k])) hits.push(`[${b.name}] ${k}: ${c[k]}`)
      }
    }
    expect(hits).toEqual([])
  })

  it("says the plain things the issue asks for", () => {
    const c = tenantCopy(es2)
    expect(c.reportEyebrow).toBe("CPE ES2 · ENTERPRISE SOFTWARE AND SERVICES")
    expect(c.reportTitle).toBe("AI portfolio")
    expect(c.reportRiskQuestion).toBe("Which ideas carry high risk, and why?")
    expect(c.reportDecisionsQuestion).toBe("Are leaders deciding, and how fast?")
    expect(c.reportOverlapQuestion).toBe("Are offices building the same thing twice?")
    expect(c.reportLeaderEmpty).toBe("Nothing is waiting on a leader today.")
    expect(c.reportNotePending).toBe("Plumb's read is added in the next step.")
    expect(c.reportFooter).toBe("Prepared from Keystone on {date}. Internal. Not an official Army record.")
    expect(c.reportComingNext).toBe("Coming next")
  })
})
