// Office-level roll-up aggregation — the office x status counts + high-impact
// tally used to drill from a bureau into its offices. Pulled out of the
// component as pure functions so the aggregation itself is unit-testable
// without rendering React (see components/admin/office-rollup.tsx for the UI).

import type { Submission } from "@/lib/submissions"
import { getStatus, getBusinessUnit, getOffice, STATUS_ORDER } from "@/lib/reviewWorkflow"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import type { OfficeOption } from "@/lib/tenant/types"

export type OfficeRollupRow = {
  value: string
  label: string
  counts: Record<string, number>
  total: number
  highImpact: number
}

const UNASSIGNED_LABEL = "Unassigned"

/** Offices configured for a bureau, or [] when the bureau declares none. */
export function officesForBureau(bureau: string, tenant: TenantConfig = getTenant()): OfficeOption[] {
  return tenant.unit.options.find((o) => o.value === bureau)?.offices || []
}

function buildRow(value: string, label: string, rows: Submission[]): OfficeRollupRow {
  const counts: Record<string, number> = {}
  for (const st of STATUS_ORDER) counts[st] = rows.filter((s) => getStatus(s) === st).length
  return {
    value,
    label,
    counts,
    total: rows.length,
    highImpact: rows.filter((s) => s.formData.highImpact === "high_impact").length,
  }
}

/**
 * Office x status rollup for one bureau. Returns [] when the bureau has no
 * offices configured — parity with today's bureau-only view. Submissions in
 * the bureau with no office set are grouped under an "Unassigned" row so
 * totals still reconcile with the bureau's overall count.
 */
export function officeRollupRows(
  submissions: Submission[],
  bureau: string,
  tenant: TenantConfig = getTenant(),
): OfficeRollupRow[] {
  const offices = officesForBureau(bureau, tenant)
  if (offices.length === 0) return []

  const inBureau = submissions.filter((s) => getBusinessUnit(s) === bureau)
  const rows = offices.map((o) => buildRow(o.value, o.label, inBureau.filter((s) => getOffice(s) === o.value)))

  const unassigned = inBureau.filter((s) => !getOffice(s))
  if (unassigned.length > 0) rows.push(buildRow("", UNASSIGNED_LABEL, unassigned))

  return rows
}
