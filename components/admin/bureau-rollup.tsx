"use client"

// Department-level roll-up: one row per org unit (bureau, for DoC) with a count
// of use cases in each pipeline status, a total, and a high-impact tally, plus a
// grand-total row. Gives leadership the "one commerce" cross-bureau view without
// drilling in. Tenant-neutral — uses getTenant().unit for labels/ordering, so it
// reads as a "Bureau roll-up" for DoC and a "Business unit roll-up" for USPTO.

import type { Submission } from "@/lib/submissions"
import { getStatus, getBusinessUnit, businessUnitLabel, STATUS_ORDER, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { getTenant } from "@/lib/tenant"
import { Badge } from "@/components/ui/badge"

const dash = <span className="text-muted-foreground/40">–</span>

export function BureauRollup({ submissions }: { submissions: Submission[] }) {
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
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u} className="border-t">
                <td className="py-2 pr-3 font-medium text-uspto-gray-text">{businessUnitLabel(u)}</td>
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
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="py-2 pr-3">All {unitLower}s</td>
              {STATUS_ORDER.map((st) => (
                <td key={st} className="text-center px-2 py-2">
                  {grand(st) || dash}
                </td>
              ))}
              <td className="text-center px-2 py-2">{submissions.length}</td>
              <td className="text-center px-2 py-2">{grandHigh || dash}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
