"use client"

// Department-level roll-up: one row per org unit (bureau, for DoC) with a count
// of use cases in each pipeline status, a total, and a high-impact tally, plus a
// grand-total row. Gives leadership the "one commerce" cross-bureau view without
// drilling in. Tenant-neutral — tier nouns come from getTenant().tierLabels and
// row ordering from getTenant().unit.options, so it reads as a "Bureau roll-up"
// for DoC and a "Business unit roll-up" for USPTO.

import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { Submission } from "@/lib/submissions"
import { getStatus, getBusinessUnit, businessUnitLabel, STATUS_ORDER, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { hasCrossBureauMatch, crossBureauDuplicateCount } from "@/lib/crossBureauDuplicates"
import { determineReportability } from "@/lib/ombReportability"
import { determineConsolidation } from "@/lib/ombConsolidation"
import { officesForBureau } from "@/lib/officeRollup"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { signoffProgress } from "@/lib/bureauSignoff"
import { getTenant } from "@/lib/tenant"
import { Badge } from "@/components/ui/badge"
import { OfficeRollup } from "@/components/admin/office-rollup"

const dash = <span className="text-muted-foreground/40">–</span>

export function BureauRollup({ submissions }: { submissions: Submission[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const tiers = getTenant().tierLabels
  const inventoryShort = getTenant().inventoryShortLabel
  const unitLabel = tiers.unit
  const unitLower = tiers.unit.toLowerCase()
  const unitPluralLower = tiers.unitPlural.toLowerCase()
  const configOrder = getTenant().unit.options.map((o) => o.value)
  // Sign-off column only applies where bureau sign-off exists (DoC) — USPTO/DoW
  // render exactly as before. See lib/bureauSignoff.ts.
  const showSignoff = tenantHasBureauTier()
  const TABLE_COLS = STATUS_ORDER.length + (showSignoff ? 7 : 6) // unit + statuses + total + high-impact + OMB review + duplicates + consolidated [+ signed off]

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
    submissions.filter((s) => getBusinessUnit(s) === unit && s.formData.highImpact === "high_impact").length

  const needsOmbReview = (s: Submission) => determineReportability(s.formData).status === "review"
  const ombReviewFor = (unit: string) =>
    submissions.filter((s) => getBusinessUnit(s) === unit && needsOmbReview(s)).length

  const grand = (st: string) => submissions.filter((s) => getStatus(s) === st).length
  const grandHigh = submissions.filter((s) => s.formData.highImpact === "high_impact").length
  const grandOmbReview = submissions.filter(needsOmbReview).length

  // A use case is a "possible duplicate" when it has a likely match (see
  // lib/crossBureauDuplicates) filed under a different bureau — the "~20 of
  // the same thing across the bureaus" problem this feature exists to surface.
  const duplicatesFor = (unit: string) => crossBureauDuplicateCount(submissions, unit)
  const grandDuplicates = submissions.filter((s) => hasCrossBureauMatch(s, submissions)).length

  // Cross-bureau rationalization: how many of these submissions match one of
  // OMB's widely-used commercial AI categories and can be reported once across
  // the department instead of once per bureau (see lib/ombConsolidation.ts).
  const isConsolidated = (s: Submission) => determineConsolidation(s.formData).status === "Consolidated"
  const consolidatedFor = (unit: string) =>
    submissions.filter((s) => getBusinessUnit(s) === unit && isConsolidated(s)).length
  const grandConsolidated = submissions.filter(isConsolidated).length
  const consolidatedCategoryCount = new Set(
    submissions.map((s) => determineConsolidation(s.formData)).filter((c) => c.status === "Consolidated").map((c) => c.category),
  ).size
  const reportableEntries = submissions.length - grandConsolidated + consolidatedCategoryCount

  // Sign-off coverage: of a bureau's use cases, how many have a recorded
  // bureau sign-off (approved-with-signoff — see lib/bureauSignoff.ts's
  // signoffProgress). Distinct from the "Approved" status column: an
  // approved item without a sign-off record (e.g. legacy data predating this
  // feature) still counts toward "Approved" but not toward "Signed off".
  const signedOffFor = (unit: string) =>
    submissions.filter((s) => getBusinessUnit(s) === unit && signoffProgress(s) === "signed_off").length
  const grandSignedOff = submissions.filter((s) => signoffProgress(s) === "signed_off").length

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
          {submissions.length} use cases across {units.length} {units.length === 1 ? unitLower : unitPluralLower}
          {grandConsolidated > 0 && ` · consolidates to ${reportableEntries} ${inventoryShort} reportable ${reportableEntries === 1 ? "entry" : "entries"}`}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="text-left font-semibold py-2 pr-3">{unitLabel}</th>
              {STATUS_ORDER.map((st) => (
                <th key={st} className="text-center font-semibold px-2 py-2 whitespace-nowrap">
                  {STATUS_LABEL[st]}
                </th>
              ))}
              <th className="text-center font-semibold px-2 py-2">Total</th>
              <th className="text-center font-semibold px-2 py-2 whitespace-nowrap">High-impact</th>
              <th className="text-center font-semibold px-2 py-2 whitespace-nowrap">{inventoryShort} review needed</th>
              <th className="text-center font-semibold px-2 py-2 whitespace-nowrap">Possible duplicates</th>
              <th className="text-center font-semibold px-2 py-2 whitespace-nowrap">Consolidated ({inventoryShort})</th>
              {showSignoff && <th className="text-center font-semibold px-2 py-2 whitespace-nowrap">Signed off</th>}
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
                      {ombReviewFor(u) === 0 ? (
                        dash
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">{ombReviewFor(u)}</Badge>
                      )}
                    </td>
                    <td className="text-center px-2 py-2">
                      {duplicatesFor(u) === 0 ? (
                        dash
                      ) : (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">{duplicatesFor(u)}</Badge>
                      )}
                    </td>
                    <td className="text-center px-2 py-2">
                      {consolidatedFor(u) === 0 ? (
                        dash
                      ) : (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">{consolidatedFor(u)}</Badge>
                      )}
                    </td>
                    {showSignoff && (
                      <td className="text-center px-2 py-2 whitespace-nowrap">
                        {signedOffFor(u)}/{totalFor(u)}
                      </td>
                    )}
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
              <td className="py-2 pr-3">All {unitPluralLower}</td>
              {STATUS_ORDER.map((st) => (
                <td key={st} className="text-center px-2 py-2">
                  {grand(st) || dash}
                </td>
              ))}
              <td className="text-center px-2 py-2">{submissions.length}</td>
              <td className="text-center px-2 py-2">{grandHigh || dash}</td>
              <td className="text-center px-2 py-2">{grandOmbReview || dash}</td>
              <td className="text-center px-2 py-2">{grandDuplicates || dash}</td>
              <td className="text-center px-2 py-2">{grandConsolidated || dash}</td>
              {showSignoff && (
                <td className="text-center px-2 py-2 whitespace-nowrap">
                  {grandSignedOff}/{submissions.length}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
      {/* What the badge colors mean. Same classes the cells above use, so the
          swatches are the badges themselves rather than a second palette; an
          expanded OfficeRollup reuses those classes and reads off this line. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Badge className="bg-red-100 text-red-800 border-red-300">&nbsp;</Badge>
          High-impact
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">&nbsp;</Badge>
          Needs review or possible duplicate
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">&nbsp;</Badge>
          Consolidated into one {inventoryShort} entry
        </span>
      </div>
    </div>
  )
}
