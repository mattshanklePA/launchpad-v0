import { describe, it, expect } from "vitest"
import {
  mapSubmissionToApprovalRow,
  buildApprovalReportCsv,
  getApprovalReportColumns,
  APPROVAL_REPORT_COLUMNS,
} from "@/lib/approvalReport"
import type { Submission } from "@/lib/submissions"
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

function sub(id: string, formData: Record<string, unknown>): Submission {
  return {
    id,
    submittedAt: "2026-01-01T00:00:00.000Z",
    businessUnit: (formData.submitterOffice as string) || "",
    formData: formData as any,
  }
}

describe("mapSubmissionToApprovalRow", () => {
  it("maps a signed-off, approved submission", () => {
    const row = mapSubmissionToApprovalRow(
      sub("sub-1", {
        submitterOffice: "patents",
        useCaseTitle: "Standards Assistant",
        reviewStatus: "approved",
        bureauSignoff: {
          bureau: "patents",
          decision: "approved",
          signedOffByName: "Priya Nair",
          signedOffByEmail: "priya.nair@example.gov",
          signedOffAt: "2026-01-05T00:00:00.000Z",
        },
        departmentApproval: {
          decision: "approved",
          byName: "Renee Caldwell",
          byEmail: "renee.caldwell@example.gov",
          at: "2026-01-06T00:00:00.000Z",
        },
      }),
    )

    expect(row).toEqual([
      "Patents",
      "Standards Assistant",
      "Approved",
      "Priya Nair",
      "2026-01-05T00:00:00.000Z",
      "approved by Renee Caldwell",
    ])
  })

  it("leaves sign-off/department-approval columns blank when nothing is recorded", () => {
    const row = mapSubmissionToApprovalRow(
      sub("sub-2", { submitterOffice: "trademarks", useCaseTitle: "Draft Idea", reviewStatus: "submitted" }),
    )
    expect(row.slice(3)).toEqual(["", "", ""])
  })
})

describe("buildApprovalReportCsv", () => {
  it("emits the header row followed by one row per submission", () => {
    const csv = buildApprovalReportCsv([
      sub("sub-1", { submitterOffice: "census", useCaseTitle: "Idea One", reviewStatus: "submitted" }),
      sub("sub-2", { submitterOffice: "nist", useCaseTitle: "Idea Two", reviewStatus: "in_review" }),
    ])
    const lines = csv.trim().split("\n")
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(APPROVAL_REPORT_COLUMNS.join(","))
  })

  it("keeps Commerce's header row exactly as it read before (ISS-3)", () => {
    const csv = buildApprovalReportCsv(
      [sub("sub-1", { submitterOffice: "census", useCaseTitle: "Idea One", reviewStatus: "submitted" })],
      doc,
    )
    expect(csv.trim().split("\n")[0]).toBe(
      "Bureau,Use Case,Status,Signed-off By,Signed-off At,Department Approval",
    )
  })

  // ISS-3 regression: the org-unit column header was hardcoded "Bureau", so an
  // ES2 export handed an Army reviewer a Commerce column name.
  it("names the org-unit column with a non-Commerce tenant's own tier word", () => {
    expect(getApprovalReportColumns(es2)[0]).toBe("Directorate")
    const csv = buildApprovalReportCsv(
      [sub("sub-1", { submitterOffice: "census", useCaseTitle: "Idea One", reviewStatus: "submitted" })],
      es2,
    )
    expect(csv.trim().split("\n")[0]).toBe(
      "Directorate,Use Case,Status,Signed-off By,Signed-off At,Department Approval",
    )
  })

  it("leaves the other five column names alone — they describe the report, not the org", () => {
    expect(getApprovalReportColumns(es2).slice(1)).toEqual(
      getApprovalReportColumns(doc).slice(1),
    )
  })
})
