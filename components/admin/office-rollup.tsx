"use client"

// Office-level drill-down under a single bureau row in BureauRollup. Renders
// nothing when the bureau has no offices configured (see lib/officeRollup.ts)
// so tenants/bureaus without an office tier are unaffected.

import type { Submission } from "@/lib/submissions"
import { officeRollupRows } from "@/lib/officeRollup"
import { STATUS_ORDER, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { getTenant } from "@/lib/tenant"
import { Badge } from "@/components/ui/badge"
import { SquareTag } from "@/components/cockpit/square-tag"

const dash = <span className="text-muted-foreground/40">–</span>

export function OfficeRollup({
  submissions,
  bureau,
  bureauLabel,
}: {
  submissions: Submission[]
  bureau: string
  bureauLabel: string
}) {
  const tiers = getTenant().tierLabels
  const rows = officeRollupRows(submissions, bureau)
  if (rows.length === 0) return null

  // NL-4 (#285), ES2 only: same rows and numbers, cockpit table.
  if (getTenant().features.cockpitLook) {
    const th = "border-b border-[var(--ks-limestone-dark)] bg-white px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)] whitespace-nowrap"
    const td = "border-b border-[var(--ks-limestone)] bg-white px-3 py-2 text-center text-sm text-[var(--ks-ink-900)]"
    const zero = (
      <span data-zero className="text-[var(--ks-ink-700)]">
        –<span className="sr-only">zero</span>
      </span>
    )
    return (
      <div className="overflow-x-auto border border-[var(--ks-limestone-dark)]">
        <table className="w-full border-collapse">
          <caption className="bg-white px-3 py-2 text-left text-xs font-bold text-[var(--ks-ink-900)]">
            {bureauLabel} {tiers.subUnitPlural.toLowerCase()}
          </caption>
          <thead>
            <tr>
              <th className={`${th} text-left`}>{tiers.subUnit}</th>
              {STATUS_ORDER.map((st) => (
                <th key={st} className={th}>
                  {STATUS_LABEL[st]}
                </th>
              ))}
              <th className={th}>Total</th>
              <th className={th}>High-impact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.value || "_unassigned"}>
                <td className={`${td} text-left font-semibold`}>{r.label}</td>
                {STATUS_ORDER.map((st) => (
                  <td key={st} className={`${td} font-mono`}>
                    {r.counts[st] === 0 ? zero : r.counts[st]}
                  </td>
                ))}
                <td className={`${td} font-mono font-bold`}>{r.total}</td>
                <td className={td}>{r.highImpact === 0 ? zero : <SquareTag tone="alert">{r.highImpact}</SquareTag>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="ml-4 mb-2 rounded-md border bg-muted/20 p-3">
      <div className="text-xs font-semibold text-muted-foreground mb-2">
        {bureauLabel} {tiers.subUnitPlural.toLowerCase()}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="text-left font-semibold py-1 pr-3">{tiers.subUnit}</th>
              {STATUS_ORDER.map((st) => (
                <th key={st} className="text-center font-semibold px-2 py-1 whitespace-nowrap">
                  {STATUS_LABEL[st]}
                </th>
              ))}
              <th className="text-center font-semibold px-2 py-1">Total</th>
              <th className="text-center font-semibold px-2 py-1 whitespace-nowrap">High-impact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.value || "_unassigned"} className="border-t">
                <td className="py-1 pr-3 font-medium text-uspto-gray-text">{r.label}</td>
                {STATUS_ORDER.map((st) => {
                  const n = r.counts[st]
                  return (
                    <td key={st} className="text-center px-2 py-1">
                      {n === 0 ? dash : n}
                    </td>
                  )
                })}
                <td className="text-center px-2 py-1 font-semibold">{r.total}</td>
                <td className="text-center px-2 py-1">
                  {r.highImpact === 0 ? (
                    dash
                  ) : (
                    <Badge className="bg-red-100 text-red-800 border-red-300">{r.highImpact}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
