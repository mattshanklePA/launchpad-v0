import { describe, it, expect, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "", style: {} })
  return { Fraunces: font, Public_Sans: font }
})

import { ALL_TENANTS, tenantFilePrefix, type TenantConfig } from "@/lib/tenant"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { es2 } from "@/lib/tenant/es2"
import { uspto } from "@/lib/tenant/uspto"
import { getIntakeTopics } from "@/lib/intakeFlow"
import { getGlossary } from "@/lib/glossary"
import { determineHighImpact } from "@/lib/highImpactDetermination"
import { businessUnitLabel } from "@/lib/reviewWorkflow"
import { formConfigLockedNote } from "@/lib/formConfig"

const source = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8")
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The source-level half of the vocabulary scan, for copy that lives in inline
// JSX and so can't be built as data. Scans DISPLAY TEXT only — quoted/template
// literals and JSX text nodes — after stripping comments, `className`
// attributes, and module specifiers, so a Tailwind class
// (`text-uspto-gray-text`), an identifier (`bureau?: string`), or an import
// path (`@/lib/bureauSignoff`) can't masquerade as a leak.
function displayTextOf(src: string): string[] {
  const code = src
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    // No `$` anchor — these files are CRLF and `.` does not match `\r`.
    .map((line) => line.replace(/(^|[^:])\/\/.*/, "$1"))
    .join("\n")
    .replace(/className=(?:"[^"]*"|\{[^}]*\})/g, "")
    // Module specifiers are paths, not copy. Added for ES2-11, whose swept
    // files import `@/components/branding/launchpad-logo` and
    // `@/lib/bureauSignoff` — both would otherwise read as leaks.
    .replace(/\bfrom\s+(['"])[^'"]*\1/g, "")
    .replace(/\bimport\s*\(\s*(['"])[^'"]*\1\s*\)/g, "")
    .replace(/\bimport\s+(['"])[^'"]*\1/g, "")
    .replace(/\brequire\(\s*(['"])[^'"]*\1\s*\)/g, "")

  const out: string[] = []
  for (const m of code.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`]*)`/g)) {
    out.push(m[1] ?? m[2] ?? m[3] ?? "")
  }
  // JSX text nodes: the run between a closing `>` and the next `<`.
  for (const m of code.matchAll(/>([^<>{}]+)</g)) out.push(m[1])
  return out.map((t) => t.trim()).filter(Boolean)
}

// ISS-8. A walkthrough of the deployed es2 instance found eight places where
// another org's vocabulary, a raw enum, or a stale name reached a screen — each
// in a file none of the prior sweeps had in scope. These are the two classes
// behind them, generalized so the next one fails the build instead of a demo.

// ── Class 1: a raw org code reaching a screen ──────────────────────────────
//
// The Enterprise Breakdown panel rendered `atr — 11 submissions` and the
// Decision Center card rendered `· ATR ·`. Both went through the raw
// `business_unit` value instead of `businessUnitLabel()`. The rule is that no
// rendered string ever *equals* a bare code from `unit.options` (or its
// uppercased form), for any tenant.
describe("no screen renders a raw org code (ISS-8)", () => {
  const withTenant = (id: string, run: () => void) => {
    const prev = process.env.NEXT_PUBLIC_TENANT
    process.env.NEXT_PUBLIC_TENANT = id
    try {
      run()
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
      else process.env.NEXT_PUBLIC_TENANT = prev
    }
  }

  it("resolves every unit and office code to a label, for every tenant", () => {
    for (const tenant of ALL_TENANTS) {
      withTenant(tenant.id, () => {
        for (const option of tenant.unit.options) {
          const label = businessUnitLabel(option.value)
          expect(label, `${tenant.id}: ${option.value}`).toBe(option.label)
          // The failure mode: the label falling through to the raw code.
          // (Case alone isn't the test — USPTO's `patents` legitimately
          // labels as "Patents"; what must never happen is the code itself
          // reaching a screen, which the source check below covers.)
          expect(label, `${tenant.id}: ${option.value} rendered as its own code`).not.toBe(option.value)
        }
      })
    }
  })

  it("never lets a code stand in for a label in the components that render one", () => {
    // `businessUnitLabel` is the single resolver; these are the two call sites
    // the walkthrough caught rendering the raw value instead.
    expect(source("app/admin/page.tsx")).toContain("businessUnitLabel(bu)")
    expect(source("components/admin/decision-center.tsx")).toContain("businessUnitLabel(d.submitterOffice)")
    // …and neither still uppercases a raw code for display.
    expect(source("components/admin/decision-center.tsx")).not.toMatch(
      /\{\(d\.submitterOffice \|\| ""\)\.toUpperCase\(\)/,
    )
  })
})

// ── Class 2: another org's vocabulary in a lib or component string ─────────
//
// #183 swept lib/fieldRegistry.ts and #185 swept the inventory vocabulary, but
// each stopped at the files it had in scope. This extends both sweeps to the
// files ISS-8 found, and drives off ALL_TENANTS so a new tenant is covered.
describe("no display string carries another org's vocabulary (ISS-8)", () => {
  const FORBIDDEN = /\bDoC\b|Department of Commerce|Commerce|USPTO|M-25-21|\bbureau\b|business unit/i

  const ownVocabulary = (tenant: TenantConfig): string[] =>
    [
      tenant.riskFramework.label,
      tenant.inventoryLabel,
      tenant.inventoryShortLabel,
      tenant.minimumPracticesLabel,
      tenant.productName,
      tenant.assistantName,
      tenant.orgName,
      tenant.shortName,
      ...Object.values(tenant.tierLabels),
    ]
      .filter(Boolean)
      .flatMap((v) => [v, v.toLowerCase()])
      .sort((a, b) => b.length - a.length)

  const strip = (value: string, vocabulary: string[]) =>
    vocabulary.reduce((acc, word) => acc.split(word).join(""), value)

  it("holds for the intake topics, glossary, and high-impact reasons on every tenant", () => {
    for (const tenant of ALL_TENANTS) {
      const vocabulary = ownVocabulary(tenant)

      for (const topic of getIntakeTopics(tenant)) {
        expect(strip(topic.label, vocabulary), `${tenant.id}: intake topic "${topic.label}"`).not.toMatch(FORBIDDEN)
      }

      const glossary = getGlossary(tenant)
      for (const [key, entry] of Object.entries(glossary)) {
        expect(strip(entry.term, vocabulary), `${tenant.id}: glossary ${key}.term`).not.toMatch(FORBIDDEN)
        expect(strip(entry.definition, vocabulary), `${tenant.id}: glossary ${key}.definition`).not.toMatch(FORBIDDEN)
      }

      // Every high-impact reason, manual and inferred, plus the no-signal one.
      const reasonSets = [
        determineHighImpact({ highImpactFactors: [] }, tenant).reasons,
        determineHighImpact(
          { highImpactFactors: ["rights", "safety", "benefits_access", "resource_allocation", "enforcement"] },
          tenant,
        ).reasons,
        determineHighImpact(
          {
            highImpactFactors: [],
            aiDecisionalImpact: "yes",
            severity: "high",
            coreProblem: "life-safety triage for benefits eligibility, enforcement action, and funding allocation",
          },
          tenant,
        ).reasons,
      ]
      for (const reason of reasonSets.flat()) {
        expect(strip(reason, vocabulary), `${tenant.id}: high-impact reason "${reason}"`).not.toMatch(FORBIDDEN)
      }
    }
  })

  it("would still catch a hardcoded word — the stripping is not swallowing everything", () => {
    const vocabulary = ownVocabulary(es2)
    expect(strip("mandatory for every bureau", vocabulary)).toMatch(FORBIDDEN)
    expect(strip("Affected business unit(s)", vocabulary)).toMatch(FORBIDDEN)
    expect(strip("M-25-21 Section 5", vocabulary)).toMatch(FORBIDDEN)
    expect(strip(`Affected ${es2.tierLabels.unitPlural}`, vocabulary)).not.toMatch(FORBIDDEN)
  })

  it("has no bare DoC, M-25-21, bureau, or business unit in the display text of the newly swept files", () => {
    const SWEPT = [
      "app/admin/page.tsx",
      "components/admin/decision-center.tsx",
      "components/admin/rationalization-panel.tsx",
      "components/admin/user-management.tsx",
      "components/submissions/governance-capture-panel.tsx",
      "lib/intakeFlow.ts",
      "lib/highImpactDetermination.ts",
      "lib/glossary.ts",
    ]
    for (const file of SWEPT) {
      const offending = displayTextOf(source(file)).filter((t) => FORBIDDEN.test(t))
      expect(offending, `${file}:\n${offending.join("\n")}`).toEqual([])
    }
  })

  it("would catch a leak in inline JSX — the extractor is not just returning nothing", () => {
    expect(displayTextOf("<span>Cross-bureau rationalization</span>")).toContain("Cross-bureau rationalization")
    expect(displayTextOf('const x = "Affected business unit(s)"')).toContain("Affected business unit(s)")
    // …while class names, identifiers, and import paths are excluded.
    expect(displayTextOf('<h1 className="text-uspto-gray-text">Title</h1>')).toEqual(["Title"])
    expect(displayTextOf("function f(bureau?: string) {}")).toEqual([])
    expect(displayTextOf('import { LaunchPadLogo } from "@/components/branding/launchpad-logo"')).toEqual([])
    expect(displayTextOf('import { getBureauSignoff } from "@/lib/bureauSignoff"')).toEqual([])
  })
})

// ── The assistant's name ───────────────────────────────────────────────────
describe("the assistant is never hardcoded (ISS-8)", () => {
  it("has no literal Scout outside the tenant configs", () => {
    // The governance panel tagged AI-proposed values "SCOUT PROPOSED" on a
    // tenant whose assistant is Plumb. `lib/tenant/*.ts` is where an
    // assistant name legitimately lives (uspto and dow both set "Scout").
    const files = [
      "components/submissions/governance-capture-panel.tsx",
      "components/submissions/submission-detail.tsx",
      "components/launchpad/chat-panel.tsx",
      "components/launchpad/conversational-intake.tsx",
      "app/admin/page.tsx",
    ]
    for (const file of files) {
      const offending = fs
        .readFileSync(path.join(process.cwd(), file), "utf8")
        .split("\n")
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .map(({ line, n }) => ({ line: line.replace(/(^|[^:])\/\/.*/, "$1"), n }))
        // `ScoutResponse`, `runScoutTurn`, `scoutStep` and friends are
        // identifiers, not copy — only a standalone word counts.
        .filter(({ line }) => /\bScout\b/.test(line))
        .map(({ line, n }) => `${file}:${n}: ${line.trim()}`)
      expect(offending, offending.join("\n")).toEqual([])
    }
  })

  it("keeps each tenant's own assistant name in its config", () => {
    expect([doc.assistantName, es2.assistantName]).toEqual(["Plumb", "Plumb"])
    expect(uspto.assistantName).toBe("Scout")
  })
})

// ── The two documented Commerce/USPTO changes ─────────────────────────────
describe("documented rendered-text changes (ISS-8)", () => {
  it("gives USPTO its own top-tier word on the requirement badge", () => {
    expect(uspto.tierLabels.department).toBe("Agency")
    expect(doc.tierLabels.department).toBe("Department")
  })

  it("names each tenant's own authority in the high-impact reasons", () => {
    const [docReason] = determineHighImpact({ highImpactFactors: ["rights"] }, doc).reasons
    expect(docReason).toBe(
      `AI output could meaningfully affect an individual's rights (${doc.riskFramework.label}).`,
    )
    const [es2Reason] = determineHighImpact({ highImpactFactors: ["rights"] }, es2).reasons
    expect(es2Reason).toContain(es2.riskFramework.label)
    // Substance unchanged — only the parenthetical citation moved.
    expect(es2Reason.startsWith("AI output could meaningfully affect an individual's rights (")).toBe(true)
  })

  it("keeps the intake topic label in step with the record panel's card heading", () => {
    // The card heading comes from lib/fieldRegistry.ts's `Affected ${unitPlural}`.
    expect(getIntakeTopics(es2).find((t) => t.id === "affectedUnits")?.label).toBe("Affected Program Offices")
    expect(getIntakeTopics(doc).find((t) => t.id === "affectedUnits")?.label).toBe("Affected Bureaus")
  })
})

// ── ES2-11: the 17 August walkthrough copy sweep ───────────────────────────
//
// Six user-facing strings, all on or next to the demo path. Same two classes
// as ISS-8: another org's vocabulary reaching an es2 screen (the login hint's
// "bureau", the sponsor placeholder's uspto.gov address, the PDF's
// "launchpad-" filename prefix), and composed copy that only reads as English
// for the tenant it was written for (the Form Config note, and the stacked
// "{productName} {assistantName}" panel header that printed "Keystone Plumb").
describe("no swept screen carries another org's vocabulary (ES2-11)", () => {
  // "bureau" is DoC's tier noun, "uspto.gov" is USPTO's domain, and
  // "launchpad-" is USPTO/DoW's product name used as a filename prefix. None
  // of the three belongs in a string an es2 user reads. Driven off source
  // rather than ALL_TENANTS because every one of these is inline copy.
  const FORBIDDEN_ES2 = /\bbureaus?\b|uspto\.gov|launchpad-/i

  const SWEPT = [
    "app/actions.ts",
    "app/admin/page.tsx",
    "app/login/page.tsx",
    "components/landing/hero-actions.tsx",
    "components/launchpad/chat-panel.tsx",
    "components/launchpad/conversational-intake.tsx",
    "components/steps/step-1-submitter-info.tsx",
    "components/steps/step-10-review-submit.tsx",
    "components/submissions/submission-detail.tsx",
    "lib/pdfGenerator.ts",
  ]

  it("has no bureau, uspto.gov, or launchpad- in the display text of the swept files", () => {
    for (const file of SWEPT) {
      const offending = displayTextOf(source(file)).filter((t) => FORBIDDEN_ES2.test(t))
      expect(offending, `${file}:\n${offending.join("\n")}`).toEqual([])
    }
  })

  it("would still catch each of the three — the pattern is not inert", () => {
    expect(displayTextOf("<span>Use your bureau account to sign in.</span>")[0]).toMatch(FORBIDDEN_ES2)
    expect(displayTextOf('placeholder="e.g., jonathan.smith@uspto.gov"')[0]).toMatch(FORBIDDEN_ES2)
    expect(displayTextOf('doc.save(`launchpad-${slug}.pdf`)')[0]).toMatch(FORBIDDEN_ES2)
  })

  // Item 1. The login hint also pointed a real user at "the runbook for demo
  // accounts" — demo scaffolding, not production copy.
  it("drops the other org's tier noun and the demo-runbook pointer from the login hint", () => {
    const src = source("app/login/page.tsx")
    expect(src).not.toMatch(/runbook/i)
    expect(src).not.toMatch(/demo accounts/i)
  })

  // Item 2. The assistant is Plumb; the product is Keystone. The panel header
  // names the assistant alone.
  it("renders the assistant's name alone in the assistant panel headers", () => {
    // Only matches the JSX form `{tenant.productName} {tenant.assistantName}` —
    // the template-literal form is `${tenant.productName} ...`, whose `$`
    // breaks the run.
    const stacked = /\{tenant\.productName\}\s+\{tenant\.assistantName\}/
    for (const file of [
      "components/launchpad/chat-panel.tsx",
      "components/launchpad/conversational-intake.tsx",
      "components/landing/hero-actions.tsx",
    ]) {
      expect(source(file), file).not.toMatch(stacked)
    }
    // …while the console error keeps it, where the product name is useful
    // disambiguation rather than a rendered panel title.
    expect(source("components/launchpad/chat-panel.tsx")).toContain(
      "`${tenant.productName} ${tenant.assistantName} Error:`",
    )
  })

  // Item 3. The sponsor email placeholder reuses the tenant's own example
  // address instead of hardcoding one org's domain.
  it("takes the sponsor email placeholder from the tenant", () => {
    const src = source("components/steps/step-1-submitter-info.tsx")
    expect(src).not.toMatch(/placeholder="[^"]*@[^"]*"/)
    expect(src).toContain("loginEmailPlaceholder")
  })

  // Item 5. USPTO and DoW keep `launchpad-`; DoC and es2 get their own.
  it("derives the submission PDF's filename prefix from the tenant's product name", () => {
    expect(tenantFilePrefix(uspto)).toBe("launchpad")
    expect(tenantFilePrefix(dow)).toBe("launchpad")
    expect(tenantFilePrefix(doc)).toBe("keystone")
    expect(tenantFilePrefix(es2)).toBe("keystone")
    expect(source("lib/pdfGenerator.ts")).toContain("tenantFilePrefix(tenant)")
  })

  // Item 6. Three remaining "Affected Business Units" — USPTO's tier noun —
  // resolved through `tierLabels.unitPlural`, the way #186 handled the intake
  // hint.
  it("resolves every remaining Affected Business Units through unitPlural", () => {
    for (const file of [
      "components/steps/step-10-review-submit.tsx",
      "components/submissions/submission-detail.tsx",
      "app/actions.ts",
    ]) {
      // Display text, not raw source — the comments in these files name the
      // old string to explain what moved.
      const offending = displayTextOf(source(file)).filter((t) => /[Aa]ffected [Bb]usiness [Uu]nits/.test(t))
      expect(offending, `${file}:\n${offending.join("\n")}`).toEqual([])
      expect(source(file), file).toMatch(/Affected \$\{(?:TENANT|tenant)\.tierLabels\.unitPlural\}/)
    }
  })
})

// ── Item 4: the Form Config sentence ───────────────────────────────────────
//
// It read "…the AI risk questions {label} mandates are locked on by design",
// which on es2 printed "…the AI risk questions DoW AI Ethical Principles +
// NIST AI RMF mandates are locked on by design" — a missing connector, and
// nonsense to read. Built as data so it can be checked for every tenant.
describe("the Form Config lock note reads as a sentence for every tenant (ES2-11)", () => {
  it("never runs the framework label straight into 'mandates are locked'", () => {
    for (const tenant of ALL_TENANTS) {
      const note = formConfigLockedNote(tenant)
      expect(note, tenant.id).toContain(tenant.riskFramework.label)
      expect(note, tenant.id).not.toMatch(
        new RegExp(`${escapeRe(tenant.riskFramework.label)}\s+mandates are locked`),
      )
      expect(note, tenant.id).toMatch(
        new RegExp(
          `Core fields and the AI risk questions required by ${escapeRe(tenant.riskFramework.label)} are locked on by design\.`,
        ),
      )
    }
  })

  it("is what the Form Configuration tab renders, rather than a second copy inline", () => {
    const src = source("app/admin/page.tsx")
    expect(src).toContain("formConfigLockedNote(tenant)")
    expect(src).not.toMatch(/mandates are locked on by design/)
  })
})

// ── ES2-13: the Rally surfaces a tenant without the integration still saw ──
//
// `features.rallyExport` is off for doc, dow and es2, and step 10's route
// options already respect it. Two surfaces did not: the "View in Rally" button
// on the intake's last screen (Step11ExportTracking) and the "Rally
// Integration Endpoint" field in Settings > Platform Configuration. Both are
// simulated here rather than mounted — strip the JSX a false flag turns off,
// then scan the display text that is left — because the Platform Configuration
// card lives inside app/admin/page.tsx and cannot be mounted on its own.
// Step 11 is additionally mounted for real in
// components/steps/step-11-export-tracking.test.tsx.

// Index just past the `}` that closes the block opening at `start`, ignoring
// braces inside quoted strings.
function endOfBlock(src: string, start: number): number {
  let depth = 0
  let quote = ""
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (quote) {
      if (ch === "\\") i++
      else if (ch === quote) quote = ""
      continue
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch
    else if (ch === "{") depth++
    else if (ch === "}" && --depth === 0) return i + 1
  }
  throw new Error("unbalanced JSX block")
}

// What a tenant with `rallyExport: false` renders: the same source with every
// `{tenant.features.rallyExport && ( … )}` block removed.
function withoutRallyBlocks(src: string): string {
  const gate = /\{\s*(?:tenant|getTenant\(\))\.features\.rallyExport\s*&&/
  let out = src
  for (;;) {
    const m = gate.exec(out)
    if (!m) return out
    out = out.slice(0, m.index) + out.slice(endOfBlock(out, m.index))
  }
}

// The Settings > Platform Configuration card, from its title to the end of the
// card — the three fields and the Save button.
function platformConfigurationCard(src: string): string {
  const start = src.indexOf("<CardTitle>Platform Configuration</CardTitle>")
  if (start < 0) throw new Error("no Platform Configuration card in app/admin/page.tsx")
  return src.slice(start, src.indexOf("</Card>", start))
}

describe("no Rally surface renders on a tenant without the integration (ES2-13)", () => {
  const RALLY = /rally/i
  const step11 = source("components/steps/step-11-export-tracking.tsx")
  const platformCard = platformConfigurationCard(source("app/admin/page.tsx"))
  const rallyText = (src: string, rallyExport: boolean) =>
    displayTextOf(rallyExport ? src : withoutRallyBlocks(src)).filter((t) => RALLY.test(t))

  it("shows no Rally string on either surface, for every tenant with the flag off", () => {
    const off = ALL_TENANTS.filter((t) => !t.features.rallyExport)
    expect(off.map((t) => t.id).sort()).toEqual(["doc", "dow", "es2"])
    for (const tenant of off) {
      expect(rallyText(step11, false), `${tenant.id}: step 11`).toEqual([])
      expect(rallyText(platformCard, false), `${tenant.id}: Platform Configuration`).toEqual([])
    }
  })

  it("still shows both on uspto, whose integration is on", () => {
    expect(uspto.features.rallyExport).toBe(true)
    expect(rallyText(step11, true).join(" | ")).toMatch(RALLY)
    expect(rallyText(platformCard, true).join(" | ")).toMatch(RALLY)
  })

  it("leaves the rest of the Platform Configuration card standing", () => {
    const stripped = withoutRallyBlocks(platformCard)
    const text = displayTextOf(stripped).join(" | ")
    expect(text).toContain("Default Submission Timeout (days)")
    expect(text).toContain("Save Settings")
    // The model field's label is composed (`{tenant.assistantName} AI Model`),
    // so it is not a bare display-text run — check it in the stripped source.
    expect(stripped).toContain("{tenant.assistantName} AI Model")
  })

  it("removes the gated block and nothing else — the simulator is not inert", () => {
    const sample = [
      "<div>",
      "  <Button>Keep me</Button>",
      "  {tenant.features.rallyExport && (",
      "    <Button disabled>View in Rally</Button>",
      "  )}",
      "  <Button>Keep me too</Button>",
      "</div>",
    ].join("\n")
    expect(displayTextOf(sample)).toContain("View in Rally")
    expect(displayTextOf(withoutRallyBlocks(sample))).toEqual(["Keep me", "Keep me too"])
  })
})
