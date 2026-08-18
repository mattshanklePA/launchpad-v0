import { describe, it, expect } from "vitest"
import { jobRoleOptions } from "@/components/admin/user-management"
import { ALL_TENANTS } from "@/lib/tenant"
import { uspto } from "@/lib/tenant/uspto"
import { es2 } from "@/lib/tenant/es2"

const withTenant = <T,>(id: string, run: () => T): T => {
  const prev = process.env.NEXT_PUBLIC_TENANT
  process.env.NEXT_PUBLIC_TENANT = id
  try {
    return run()
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_TENANT
    else process.env.NEXT_PUBLIC_TENANT = prev
  }
}

// ES2-13 item 6. The job-role dropdown was a hardcoded USPTO-shaped list, so
// an Army admin could not record an Army role and the es2 user seed left the
// column null. It now comes from the same `submitterRoles` step 1 of intake
// offers, per tenant.
describe("User Management job roles (ES2-13)", () => {
  it("offers the active tenant's submitter roles, with Not set first", () => {
    for (const tenant of ALL_TENANTS) {
      expect(jobRoleOptions(tenant), tenant.id).toEqual([
        { value: "", label: "Not set" },
        ...tenant.submitterRoles,
      ])
    }
  })

  it("resolves the tenant from the environment when none is passed", () => {
    expect(withTenant("es2", () => jobRoleOptions())).toEqual(jobRoleOptions(es2))
    expect(withTenant("uspto", () => jobRoleOptions())).toEqual(jobRoleOptions(uspto))
  })

  // No stored `job_role` may become unrepresentable: USPTO's `submitterRoles`
  // carry exactly the eight values the old hardcoded JOB_ROLE_OPTIONS did.
  it("keeps every value the old hardcoded list carried, on uspto", () => {
    const OLD_JOB_ROLE_VALUES = [
      "",
      "patent_examiner",
      "trademark_examiner",
      "manager",
      "it_staff",
      "product_owner",
      "lead_product_owner",
      "developer",
      "other",
    ]
    expect(jobRoleOptions(uspto).map((o) => o.value).sort()).toEqual([...OLD_JOB_ROLE_VALUES].sort())
  })

  // The documented, accepted consequence: two USPTO labels change to the ones
  // step 1 of intake has always shown for the same values.
  it("labels the two changed uspto values the way intake already does", () => {
    const labelOf = (v: string) => jobRoleOptions(uspto).find((o) => o.value === v)?.label
    expect(labelOf("patent_examiner")).toBe("Operations / Staff Officer")
    expect(labelOf("trademark_examiner")).toBe("Analyst")
    // Every other label is unchanged from the old list.
    expect(labelOf("manager")).toBe("Manager")
    expect(labelOf("it_staff")).toBe("IT Staff")
    expect(labelOf("product_owner")).toBe("Product Owner")
    expect(labelOf("lead_product_owner")).toBe("Lead Product Owner")
    expect(labelOf("developer")).toBe("Developer")
    expect(labelOf("other")).toBe("Other")
    expect(labelOf("")).toBe("Not set")
  })

  // What the es2 instance could not do before: record an Army role.
  it("gives es2 its own roles, led by the one Avery Lang submits under", () => {
    expect(jobRoleOptions(es2).map((o) => o.value)).toContain("contracting_officer")
    expect(jobRoleOptions(es2).find((o) => o.value === "contracting_officer")?.label).toBe(
      "Contracting Officer",
    )
    expect(jobRoleOptions(es2).map((o) => o.value)).not.toContain("patent_examiner")
  })
})
