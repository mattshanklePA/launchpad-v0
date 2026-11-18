// F8-1 (#353): the "could they share?" comparison. Pure: takes a group's ideas
// and a tenant, returns one column per idea and, for each of four rows, a note
// per column. No screen reads this yet (F8-2), and it holds no user-facing text
// beyond the office and program labels the tenant already declares.

import type { Submission } from "@/lib/submissions"
import { getBusinessUnit, getOffice } from "@/lib/reviewWorkflow"
import type { ProgramProfile, TenantConfig } from "@/lib/tenant/types"

export type ProfileRowKey = "runsOn" | "builtOn" | "mainData" | "owner"
export type ProfileNote = "same" | "different" | null

export const PROFILE_ROW_KEYS: ProfileRowKey[] = ["runsOn", "builtOn", "mainData", "owner"]

export type ProfileColumn = {
  submissionId: string
  officeLabel: string
  programLabel?: string
  profile: ProgramProfile | null
}

export type ProfileComparison = {
  columns: ProfileColumn[]
  /** One entry per row key; `notes[i]` belongs to `columns[i]`. */
  rows: { key: ProfileRowKey; notes: ProfileNote[] }[]
}

// Matches the label the rest of the app uses for an idea with no office.
const UNSPECIFIED = "Unspecified"

function findProfile(tenant: TenantConfig, office: string, program: string): ProgramProfile | null {
  if (!office) return null
  return (
    (tenant.programProfiles ?? []).find((p) => p.office === office && (p.program ?? "") === program) ?? null
  )
}

const norm = (v: string) => v.trim().toLowerCase()

/**
 * Notes are measured against the first column, so the first column's own note is
 * null. A column with no profile, or any column when the first has none, gets null.
 */
export function compareProfiles(ideas: Submission[], tenant: TenantConfig): ProfileComparison {
  const columns: ProfileColumn[] = ideas.map((s) => {
    const unit = getBusinessUnit(s)
    const program = getOffice(s)
    const unitOption = tenant.unit.options.find((o) => o.value === unit)
    const programOption = unitOption?.offices?.find((o) => o.value === program)
    const column: ProfileColumn = {
      submissionId: s.id,
      officeLabel: unitOption?.label ?? (unit || UNSPECIFIED),
      profile: findProfile(tenant, unit, program),
    }
    if (programOption) column.programLabel = programOption.label
    return column
  })

  const first = columns[0]?.profile ?? null
  const rows = PROFILE_ROW_KEYS.map((key) => ({
    key,
    notes: columns.map((c, i): ProfileNote => {
      if (i === 0 || !first || !c.profile) return null
      return norm(c.profile[key]) === norm(first[key]) ? "same" : "different"
    }),
  }))

  return { columns, rows }
}
