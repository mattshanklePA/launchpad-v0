import { describe, it, expect } from "vitest"
import { buildOmbCsv, inventoryColumns, ombExportContext, OMB_COLUMNS } from "@/lib/ombExport"
import { csvLine } from "@/lib/csv"
import { ALL_TENANTS } from "@/lib/tenant"
import { doc } from "@/lib/tenant/doc"
import { dow } from "@/lib/tenant/dow"
import { uspto } from "@/lib/tenant/uspto"
import { es2 } from "@/lib/tenant/es2"
import type { Submission } from "@/lib/submissions"

// ES2-10. The inventory CSV is the artifact handed to a program manager, and it
// carried another department's vocabulary in three places: the download
// filename, the "Agency"/"Bureau/Component" header columns, and the
// consolidated department-level row ("2 bureaus: ...", "across the department
// per OMB's widely-used commercial AI category guidance").
//
// The binding constraint is that DoC and USPTO output stays byte-identical, so
// every new tenant field defaults to today's OMB wording and only es2 opts in.
// lib/ombExport.test.ts pins the DoC baseline and must pass unmodified; this
// file pins the tenant-driven behavior on top of it.

function sub(id: string, formData: Record<string, unknown>): Submission {
  return { id, submittedAt: "2026-01-01T00:00:00.000Z", formData: formData as never }
}

/** Two consolidated-category submissions across two units, plus a repeat of the first. */
function consolidatedSubmissions(unitA: string, unitB: string): Submission[] {
  const emailUseCase = (id: string, office: string) =>
    sub(id, {
      useCaseTitle: "Inbox Assistant",
      submitterOffice: office,
      highImpact: "not_high_impact",
      coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
    })
  return [emailUseCase("sub-1", unitA), emailUseCase("sub-2", unitB), emailUseCase("sub-3", unitA)]
}

function consolidatedRow(tenant: Parameters<typeof ombExportContext>[0], unitA: string, unitB: string): string {
  const csv = buildOmbCsv(consolidatedSubmissions(unitA, unitB), ombExportContext(tenant))
  const lines = csv.trim().split("\n")
  expect(lines).toHaveLength(2) // header + exactly one consolidated row
  return lines[1]
}

// ============================================================
// 1. FILENAME
// ============================================================
describe("inventory download filename is tenant-driven (ES2-10 #1)", () => {
  it("every registered tenant declares one", () => {
    for (const tenant of ALL_TENANTS) {
      expect(typeof tenant.inventoryFileName, tenant.id).toBe("string")
      expect(tenant.inventoryFileName.endsWith(".csv"), tenant.id).toBe(true)
    }
  })

  it("keeps DoC and USPTO on the OMB filename", () => {
    expect(doc.inventoryFileName).toBe("omb-ai-use-case-inventory.csv")
    expect(uspto.inventoryFileName).toBe("omb-ai-use-case-inventory.csv")
  })

  it("gives es2 an internal-inventory name that does not begin with omb-", () => {
    expect(es2.inventoryFileName.startsWith("omb-")).toBe(false)
    expect(es2.inventoryFileName).not.toMatch(/omb/i)
  })

  it("no longer hardcodes the filename in the export route", async () => {
    const fs = await import("node:fs")
    const path = await import("node:path")
    const source = fs.readFileSync(path.join(process.cwd(), "app/api/export/omb/route.ts"), "utf8")
    expect(source).toContain("inventoryFileName")
    expect(source).not.toContain('filename="omb-ai-use-case-inventory.csv"')
  })
})

// ============================================================
// 2. HEADER COLUMN LABELS
// ============================================================
describe("inventory header labels are tenant-driven (ES2-10 #2)", () => {
  it("defaults to OMB's published names when a tenant declares none", () => {
    for (const tenant of [doc, uspto, dow]) {
      expect(inventoryColumns(ombExportContext(tenant)), tenant.id).toEqual([...OMB_COLUMNS])
    }
  })

  it("keeps the DoC and USPTO header row byte-identical", () => {
    for (const tenant of [doc, uspto]) {
      const csv = buildOmbCsv([], ombExportContext(tenant))
      expect(csv.trim().split("\n")[0], tenant.id).toBe(csvLine([...OMB_COLUMNS]))
    }
  })

  it("gives the es2 header row neither Agency nor Bureau/Component", () => {
    const header = buildOmbCsv([], ombExportContext(es2)).trim().split("\n")[0]
    expect(header).not.toContain("Agency")
    expect(header).not.toContain("Bureau/Component")
  })

  it("substitutes only those two columns, keeping order and count", () => {
    const columns = inventoryColumns(ombExportContext(es2))
    expect(columns).toHaveLength(OMB_COLUMNS.length)
    expect(columns[1]).toBe(es2.inventoryColumnLabels?.agency)
    expect(columns[2]).toBe(es2.inventoryColumnLabels?.agencyBureau)
    // Every other column is untouched — the federal field names stay put.
    for (let i = 0; i < OMB_COLUMNS.length; i++) {
      if (i === 1 || i === 2) continue
      expect(columns[i], `column ${i}`).toBe(OMB_COLUMNS[i])
    }
  })

  it("keeps the OMB field name that merely mentions 'agency' in lower case", () => {
    // #21 has_pii is a federal field name and explicitly out of scope.
    expect(inventoryColumns(ombExportContext(es2))).toContain("Involves PII maintained by the agency?")
  })
})

// ============================================================
// 3. THE CONSOLIDATED ROW
// ============================================================
describe("consolidated row vocabulary is tenant-driven (ES2-10 #3)", () => {
  it("keeps the DoC consolidated row byte-identical", () => {
    const row = consolidatedRow(doc, "census", "noaa")
    expect(row).toContain("2 bureaus: census, noaa")
    expect(row).toContain("Reported once across the department per OMB's widely-used commercial AI category guidance")
    expect(row).toContain("consolidates 3 bureau submissions (census, noaa) into this single department-level entry.")
  })

  it("keeps the USPTO consolidated row byte-identical", () => {
    const row = consolidatedRow(uspto, "census", "noaa")
    expect(row).toContain("2 bureaus: census, noaa")
    expect(row).toContain("Reported once across the department per OMB's widely-used commercial AI category guidance")
    expect(row).toContain("into this single department-level entry.")
  })

  it("gives the es2 consolidated row no bureau and no OMB", () => {
    const row = consolidatedRow(es2, "hrfm", "logfin")
    expect(row).not.toMatch(/bureau/i)
    expect(row).not.toContain("OMB")
  })

  it("reads with the es2 program-office and enterprise vocabulary", () => {
    const row = consolidatedRow(es2, "hrfm", "logfin")
    expect(row).toContain("2 program offices: hrfm, logfin")
    expect(row).toContain("across the enterprise")
    expect(row).toContain("consolidates 3 program office submissions (hrfm, logfin)")
    expect(row).toContain("into this single enterprise-level entry.")
    expect(row).toContain(es2.inventoryAuthority as string)
  })

  it("keeps the singular branch working for both vocabularies", () => {
    const one = (tenant: Parameters<typeof ombExportContext>[0], office: string) => {
      const csv = buildOmbCsv(
        [
          sub("sub-1", {
            useCaseTitle: "Inbox Assistant",
            submitterOffice: office,
            highImpact: "not_high_impact",
            coreProblem: "Staff spend hours a day manually sorting and prioritizing email in a crowded inbox.",
          }),
        ],
        ombExportContext(tenant),
      )
      return csv.trim().split("\n")[1]
    }
    expect(one(doc, "census")).toContain("1 bureau: census")
    expect(one(doc, "census")).toContain("consolidates 1 bureau submission (census)")
    expect(one(es2, "hrfm")).toContain("1 program office: hrfm")
    expect(one(es2, "hrfm")).toContain("consolidates 1 program office submission (hrfm)")
  })

  it("derives the es2 nouns from its own tierLabels rather than restating them", () => {
    const context = ombExportContext(es2)
    expect(context.consolidation?.unit).toBe(es2.tierLabels.unit.toLowerCase())
    expect(context.consolidation?.unitPlural).toBe(es2.tierLabels.unitPlural.toLowerCase())
    expect(context.consolidation?.department).toBe(es2.tierLabels.department.toLowerCase())
  })

  it("leaves a tenant that declares no inventory authority on OMB's wording", () => {
    // The opt-in signal. DoC's tierLabels say "Bureau"/"Department" and USPTO's
    // say "Business Unit"/"Agency"; neither may reach this export.
    for (const tenant of [doc, uspto, dow]) {
      expect(tenant.inventoryAuthority, tenant.id).toBeUndefined()
      expect(ombExportContext(tenant).consolidation, tenant.id).toBeUndefined()
    }
    expect(typeof es2.inventoryAuthority).toBe("string")
  })
})

// ============================================================
// TENANT PARITY
// ============================================================
describe("only es2's output changes (ES2-10 guardrail)", () => {
  it("produces an identical full CSV for DoC, USPTO and DoW against the legacy hardcoded output", () => {
    for (const tenant of [doc, uspto, dow]) {
      const csv = buildOmbCsv(consolidatedSubmissions("census", "noaa"), ombExportContext(tenant))
      const legacy = buildOmbCsv(consolidatedSubmissions("census", "noaa"), {
        shortName: tenant.shortName,
        publicInquiryEmail: tenant.publicInquiryEmail,
      })
      expect(csv, tenant.id).toBe(legacy)
    }
  })

  it("changes es2's CSV relative to the legacy hardcoded output", () => {
    const csv = buildOmbCsv(consolidatedSubmissions("hrfm", "logfin"), ombExportContext(es2))
    const legacy = buildOmbCsv(consolidatedSubmissions("hrfm", "logfin"), {
      shortName: es2.shortName,
      publicInquiryEmail: es2.publicInquiryEmail,
    })
    expect(csv).not.toBe(legacy)
  })
})
