import { describe, it, expect, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "", style: {} })
  return { Fraunces: font, Public_Sans: font }
})

import { ALL_TENANTS, type TenantConfig } from "@/lib/tenant"
import { doc } from "@/lib/tenant/doc"
import { es2 } from "@/lib/tenant/es2"
import { uspto } from "@/lib/tenant/uspto"
import { getIntakeTopics } from "@/lib/intakeFlow"
import { getGlossary } from "@/lib/glossary"
import { determineHighImpact } from "@/lib/highImpactDetermination"
import { businessUnitLabel } from "@/lib/reviewWorkflow"

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
    const source = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8")
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

  // The source-level half, for copy that lives in inline JSX and so can't be
  // built as data. Scans DISPLAY TEXT only — quoted/template literals and JSX
  // text nodes — after stripping comments and `className` attributes, so a
  // Tailwind class (`text-uspto-gray-text`) or an identifier
  // (`bureau?: string`) can't masquerade as a leak.
  function displayTextOf(source: string): string[] {
    const code = source
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      // No `$` anchor — these files are CRLF and `.` does not match `\r`.
      .map((line) => line.replace(/(^|[^:])\/\/.*/, "$1"))
      .join("\n")
      .replace(/className=(?:"[^"]*"|\{[^}]*\})/g, "")

    const out: string[] = []
    for (const m of code.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`]*)`/g)) {
      out.push(m[1] ?? m[2] ?? m[3] ?? "")
    }
    // JSX text nodes: the run between a closing `>` and the next `<`.
    for (const m of code.matchAll(/>([^<>{}]+)</g)) out.push(m[1])
    return out.map((t) => t.trim()).filter(Boolean)
  }

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
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8")
      const offending = displayTextOf(source).filter((t) => FORBIDDEN.test(t))
      expect(offending, `${file}:\n${offending.join("\n")}`).toEqual([])
    }
  })

  it("would catch a leak in inline JSX — the extractor is not just returning nothing", () => {
    expect(displayTextOf("<span>Cross-bureau rationalization</span>")).toContain("Cross-bureau rationalization")
    expect(displayTextOf('const x = "Affected business unit(s)"')).toContain("Affected business unit(s)")
    // …while class names and identifiers are excluded.
    expect(displayTextOf('<h1 className="text-uspto-gray-text">Title</h1>')).toEqual(["Title"])
    expect(displayTextOf("function f(bureau?: string) {}")).toEqual([])
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
