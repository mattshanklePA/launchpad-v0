import { describe, it, expect, vi } from "vitest"

// public-landing.tsx self-hosts fonts via next/font, which only resolves under
// a Next build. Stubbed so its copy builders can be imported here.
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "", className: "", style: {} })
  return { Fraunces: font, Public_Sans: font }
})

import { ALL_TENANTS, type TenantConfig } from "@/lib/tenant"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { es2 } from "@/lib/tenant/es2"
import { buildKpiCards, buildActionItems } from "@/components/dashboard/department-dashboard-data"
import { landingStrings } from "@/components/landing/public-landing"
import type { DashboardMetrics } from "@/lib/dashboard/metrics"

// ISS-7. #182 added `inventoryLabel` and applied it to the landing page only,
// because that is where it found the problem — and eight more surfaces kept
// saying "OMB" to a tenant that does not report to OMB. This file is the test
// that would have caught that: it builds the strings for every inventory-facing
// surface, for every registered tenant, and asserts that a tenant whose
// `inventoryShortLabel` is not "OMB" produces none.
//
// SURFACES COVERED HERE (built directly, no rendering needed):
//   - components/dashboard/department-dashboard-data.ts — KPI label + Action
//     Center item title
//   - components/landing/public-landing.tsx — every landing string
//
// SURFACES COVERED BY SOURCE SCAN (JSX literals, not extractable as data):
//   - dashboard-shell.tsx, dashboard-workspace-links.tsx, orientation-banner.tsx,
//     bureau-rollup.tsx, form-config-panel.tsx, field-requirement-badge.tsx,
//     governance-capture-panel.tsx, submission-detail.tsx, app/admin/page.tsx
// The scan asserts these files carry no bare "OMB"/"M-25-21" string literal at
// all, which is the same guarantee for a file whose copy is inline JSX.

const OMB_OR_MEMO = /\bOMB\b|M-25-21/

function baseMetrics(overrides: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    scope: { level: "department" },
    pipelineStatus: { counts: {} as never, total: 10 },
    readiness: { ready: 3, needs_work: 4, early_stage: 2, not_assessed: 1, total: 10 },
    highImpact: { count: 2, total: 10 },
    ombReportability: { reportable: 6, excluded: 1, review: 3, consolidated: 2, individual: 4 },
    crossBureauDuplicates: { clusterCount: 1, pendingCount: 1 },
    awaitingSignoff: { count: 2, total: 10 },
    rmfRollup: { on_track: 5, attention: 3, at_risk: 0, unknown: 2, total: 10 },
    ...overrides,
  } as DashboardMetrics
}

/** Every inventory-facing string a tenant produces from the data-shaped builders. */
function inventoryStrings(tenant: TenantConfig): string[] {
  const out: string[] = []
  for (const bureauTier of [true, false]) {
    for (const rmf of [true, false]) {
      out.push(...buildKpiCards(baseMetrics(), bureauTier, rmf, tenant).flatMap((c) => [c.label, c.subtitle ?? ""]))
    }
    out.push(...buildActionItems(baseMetrics(), bureauTier, [], tenant).map((i) => i.title))
    out.push(...landingStrings(tenant, bureauTier))
  }
  return out.filter(Boolean)
}

describe("inventory vocabulary resolves from the tenant (ISS-7)", () => {
  it("sets all three label fields on every registered tenant", () => {
    expect(ALL_TENANTS.length).toBeGreaterThanOrEqual(4)
    for (const tenant of ALL_TENANTS) {
      for (const field of ["inventoryLabel", "inventoryShortLabel", "minimumPracticesLabel"] as const) {
        expect(typeof tenant[field], `${tenant.id}.${field}`).toBe("string")
        expect(tenant[field].trim().length, `${tenant.id}.${field}`).toBeGreaterThan(0)
      }
    }
    expect([doc.inventoryShortLabel, uspto.inventoryShortLabel]).toEqual(["OMB", "OMB"])
    expect([dow.inventoryShortLabel, es2.inventoryShortLabel]).toEqual(["Inventory", "Inventory"])
    expect(doc.minimumPracticesLabel).toBe("M-25-21 minimum practices")
    expect(es2.minimumPracticesLabel).toBe("High-impact AI minimum practices")
  })

  // The assertion this issue exists for.
  it("never says OMB or M-25-21 to a tenant that does not report to OMB", () => {
    for (const tenant of ALL_TENANTS.filter((t) => t.inventoryShortLabel !== "OMB")) {
      for (const s of inventoryStrings(tenant)) {
        expect(s, `${tenant.id}: "${s}"`).not.toMatch(OMB_OR_MEMO)
      }
    }
  })

  it("still says OMB everywhere it should for the tenants that do report to OMB", () => {
    for (const tenant of [doc, uspto]) {
      const all = inventoryStrings(tenant).join(" | ")
      expect(all, tenant.id).toMatch(/\bOMB reportable\b/)
      expect(all, tenant.id).toMatch(/OMB reportability review/)
    }
  })

  it("keeps Commerce's dashboard copy word-for-word", () => {
    const cards = buildKpiCards(baseMetrics(), true, true, doc)
    expect(cards.find((c) => c.id === "omb-reportable")?.label).toBe("OMB reportable")
    const items = buildActionItems(
      baseMetrics({ ombReportability: { reportable: 0, excluded: 0, review: 1, consolidated: 0, individual: 0 } }),
      true,
      [],
      doc,
    )
    expect(items.map((i) => i.title)).toContain("1 submission needs an OMB reportability review")
  })

  it("gives ES2 its own adjectival short form", () => {
    const cards = buildKpiCards(baseMetrics(), true, true, es2)
    expect(cards.find((c) => c.id === "omb-reportable")?.label).toBe("Inventory reportable")
    // The KPI *id* is structural and must not follow the copy.
    expect(cards.map((c) => c.id)).toContain("omb-reportable")
  })
})

describe("no inventory-facing component carries a bare OMB literal", () => {
  // Import lazily so the node:fs dependency stays out of the browser-shaped
  // module graph above.
  const SWEPT_FILES = [
    "components/dashboard/dashboard-shell.tsx",
    "components/dashboard/dashboard-workspace-links.tsx",
    "components/dashboard/orientation-banner.tsx",
    "components/dashboard/department-dashboard-data.ts",
    "components/admin/bureau-rollup.tsx",
    "components/admin/form-config-panel.tsx",
    "components/launchpad/field-requirement-badge.tsx",
    "components/submissions/governance-capture-panel.tsx",
    "components/submissions/submission-detail.tsx",
    "components/landing/public-landing.tsx",
    "app/admin/page.tsx",
  ]

  it("has no OMB or M-25-21 outside a comment in any swept file", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    for (const file of SWEPT_FILES) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8")
      const offending = source
        .split("\n")
        .map((line, i) => ({ line, n: i + 1 }))
        // Comments are explicitly out of scope — they document real behavior
        // (e.g. bureau-rollup's column-count tally). Strips whole-line comments
        // and trailing ones, leaving `https://` alone. No `$` anchor: these
        // files are CRLF, and `.` does not match the trailing `\r`.
        .filter(({ line }) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .map(({ line, n }) => ({ line: line.replace(/(^|[^:])\/\/.*/, "$1"), n }))
        .filter(({ line }) => OMB_OR_MEMO.test(line))
        // `/api/export/omb` is a route path and `ombReportability` /
        // `omb-reportable` are structural ids, not copy — lowercase, so the
        // \bOMB\b word match already skips them.
        .map(({ line, n }) => `${file}:${n}: ${line.trim()}`)
      expect(offending, offending.join("\n")).toEqual([])
    }
  })

  it("leaves FieldLevel's structural omb value and the OMB export module alone", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const registry = fs.readFileSync(path.join(process.cwd(), "lib/fieldRegistry.ts"), "utf8")
    expect(registry).toMatch(/export type FieldLevel = "omb" \| "department" \| "bureau"/)
    // lib/ombExport.ts carries OMB's published column names; they are correct
    // for every tenant regardless of what the UI calls the inventory.
    const exportModule = fs.readFileSync(path.join(process.cwd(), "lib/ombExport.ts"), "utf8")
    expect(exportModule).toMatch(/agency_bureau|use_case_name/)
  })
})
