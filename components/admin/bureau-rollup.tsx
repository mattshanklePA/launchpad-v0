"use client"

// Department-level roll-up: one row per org unit (bureau, for DoC) with a count
// of use cases in each pipeline status, a total, and a high-impact tally, plus a
// grand-total row. Gives leadership the "one commerce" cross-bureau view without
// drilling in. Tenant-neutral — uses getTenant().unit for labels/ordering, so it
// reads as a "Bureau roll-up" for DoC and a "Business unit roll-up" for USPTO.

import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { Submission } from "@/lib/submissions"
import { getStatus, getBusinessUnit, businessUnitLabel, STATUS_ORDER, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { findSimilar } from "@/lib/similarity"
import { officesForBureau } from "@/lib/officeRollup"
import { getTenant } from "@/lib/tenant"
import { Badge } from "@/components/ui/badge"
import { OfficeRollup } from "@/components/admin/office-rollup"

const dash = <span className="text-muted-foreground/40">–</span>
const TABLE_COLS = STATUS_ORDER.length + 4 // unit + statuses + total + high-impact + duplicates

export function BureauRollup({ submissions }: { submissions: Submission[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const unitLabel = getTenant().unit.label
  const unitLower = unitLabel.toLowerCase()
  const configOrder = getTenant().unit.options.map((o) => o.value)

  const units = Array.from(new Set(submissions.map(getBusinessUnit).filter(Boolean))).sort((a, b) => {
    const ia = configOrder.indexOf(a)
    const ib = configOrder.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })
  if (units.length === 0) return null

  const countFor = (unit: string, st: string) =>
    submissions.filter((s) => getBusinessUnit(s) === unit && getStatus(s) === st).length
  const totalFor = (unit: string) => submissions.filter((s) => getBusinessUnit(s) === unit).length
  const highFor = (unit: string) =>
    submissions.filter((s) => getBusinessUnit(s) === unit && s.formData.highImpact === "yes").length

  const grand = (st: string) => submissions.filter((s) => getStatus(s) === st).length
  const grandHigh = submissions.filter((s) => s.formData.highImpact === "yes").length

  // A use case is a "possible duplicate" when it has a likely match (see
  // lib/similarity) filed under a different bureau — the "~20 of the same
  // thing across the bureaus" problem this feature exists to surface.
  const hasCrossBureauMatch = (s: Submission) =>
    findSimilar(s, submissions).some((m) => m.bureau !== getBusinessUnit(s))
  const duplicatesFor = (unit: string) =>
    submissions.filter((s) => getBusinessUnit(s) === unit && hasCrossBureauMatch(s)).length
  const grandDuplicates = submissions.filter(hasCrossBureauMatch).length

  const toggleExpanded = (unit: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(unit)) next.delete(unit)
      else next.add(unit)
      return next
    })

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <h2 className="text-sm font-semibold text-uspto-gray-text">{unitLabel} roll-up</h2>
        <span className="text-xs text-muted-foreground">
          {submissions.length} use cases across {units.length} {unitLower}
          {units.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="text-left font-semibold py-2 pr-3">{unitLabel}</th>
              {STATUS_ORDER.map((st) => (
                <th key={st} className="text-center font-semibold px-2 py-2 whitespace-nowrap">
                  {STATUS_LABEL[st]}
                </th>
              ))}
              <th className="text-center font-semibold px-2 py-2">Total</th>
              <th className="text-center font-semibold px-2 py-2 whitespace-nowrap">High-impact</th>
              <th className="text-center font-semibold px-2 py-2 whitespace-nowrap">Possible duplicates</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const hasOffices = officesForBureau(u).length > 0
              const isExpanded = expanded.has(u)
              return (
                <Fragment key={u}>
                  <tr className="border-t">
                    <td className="py-2 pr-3 font-medium text-uspto-gray-text">
                      {hasOffices ? (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(u)}
                          className="flex items-center gap-1 hover:text-uspto-blue-primary"
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {businessUnitLabel(u)}
                        </button>
                      ) : (
                        businessUnitLabel(u)
                      )}
                    </td>
                    {STATUS_ORDER.map((st) => {
                      const n = countFor(u, st)
                      return (
                        <td key={st} className="text-center px-2 py-2">
                          {n === 0 ? dash : n}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2 font-semibold">{totalFor(u)}</td>
                    <td className="text-center px-2 py-2">
                      {highFor(u) === 0 ? (
                        dash
                      ) : (
                        <Badge className="bg-red-100 text-red-800 border-red-300">{highFor(u)}</Badge>
                      )}
                    </td>
                    <td className="text-center px-2 py-2">
                      {duplicatesFor(u) === 0 ? (
                        dash
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">{duplicatesFor(u)}</Badge>
                      )}
                    </td>
                  </tr>
                  {hasOffices && isExpanded && (
                    <tr>
                      <td colSpan={TABLE_COLS} className="pb-2 pt-0">
                        <OfficeRollup submissions={submissions} bureau={u} bureauLabel={businessUnitLabel(u)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="py-2 pr-3">All {unitLower}s</td>
              {STATUS_ORDER.map((st) => (
                <td key={st} className="text-center px-2 py-2">
                  {grand(st) || dash}
                </td>
              ))}
              <td className="text-center px-2 py-2">{submissions.length}</td>
              <td className="text-center px-2 py-2">{grandHigh || dash}</td>
              <td className="text-center px-2 py-2">{grandDuplicates || dash}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
