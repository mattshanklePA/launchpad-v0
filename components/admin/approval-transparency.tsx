"use client"

// Department approval transparency — "each bureau signs its own, the
// Department sees everything" (see lib/bureauSignoff.ts, issue #54). Sibling
// to BureauRollup: where BureauRollup's "Signed off" column gives a
// department-wide count, this panel drills into *who* signed off and *when*,
// per bureau.
//
// The hard limit lives in the selector, not here: `approvalTransparency()`
// returns every bureau's data only for an OS/department admin
// (`hasDepartmentTransparency`) and scopes to the viewer's own bureau
// otherwise (the same `visibleSubmissions` roll-down every other admin
// surface uses) — so this component renders correctly for both audiences
// without an extra guard, and a bureau-scoped reviewer never sees another
// bureau's sign-off record even if this panel is shown to them.
//
// No-op for tenants without a bureau tier (USPTO/DoW): tenantHasBureauTier()
// gates rendering, same as lib/rationalization.ts's gate.

import { getSession } from "@/lib/auth"
import { formatKeystoneDate } from "@/lib/dateFormat"
import type { Submission } from "@/lib/submissions"
import { businessUnitLabel } from "@/lib/reviewWorkflow"
import { getTenant } from "@/lib/tenant"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { approvalTransparency, hasDepartmentTransparency, type SignoffProgress } from "@/lib/bureauSignoff"
import { ShieldCheck } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { SectionTitle } from "@/components/cockpit/section-title"
import { SquareTag, type SquareTagTone } from "@/components/cockpit/square-tag"
import { cn } from "@/lib/utils"

const PROGRESS_LABEL: Record<SignoffProgress, string> = {
  signed_off: "Signed off",
  pending: "Pending",
  rejected: "Rejected",
}

const PROGRESS_CLASSES: Record<SignoffProgress, string> = {
  signed_off: "bg-green-100 text-green-800 border-green-300",
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  rejected: "bg-gray-100 text-gray-600 border-gray-300",
}

const PROGRESS_TONE: Record<SignoffProgress, SquareTagTone> = {
  signed_off: "healthy",
  pending: "attention",
  rejected: "alert",
}

// NL-11 (#312), ES2 only: table cells and heads in the kit's style.
const TH =
  "border-b border-[var(--ks-limestone-dark)] bg-white px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)] whitespace-nowrap"
const TD = "border-b border-[var(--ks-limestone)] px-3 py-3 align-middle text-sm text-[var(--ks-ink-900)]"

function CockpitCount({ n }: { n: number }) {
  return n === 0 ? (
    <span data-zero className="text-[var(--ks-ink-700)]">
      –<span className="sr-only">zero</span>
    </span>
  ) : (
    <span className="font-mono">{n}</span>
  )
}

export function ApprovalTransparency({ submissions }: { submissions: Submission[] }) {
  if (!tenantHasBureauTier()) return null

  const tiers = getTenant().tierLabels
  const session = typeof window !== "undefined" ? getSession() : null
  const viewer = session
    ? { role: session.role, email: session.email, businessUnit: session.businessUnit, office: session.office }
    : null
  const { summaries, items } = approvalTransparency(submissions, viewer)
  if (summaries.length === 0) return null

  const isDepartmentView = hasDepartmentTransparency(viewer)
  const decidedItems = items.filter((i) => i.progress !== "pending" || i.signoff)

  if (getTenant().features.cockpitLook) {
    // Every configured office gets a row, zeros included (C-ERP too), so the
    // table reads the same as the status table above it. Only the department
    // view lists offices the viewer is not scoped to.
    const rows = isDepartmentView
      ? [
          ...getTenant()
            .unit.options.map((o) => o.value)
            .map((v) => summaries.find((r) => r.bureau === v) ?? { bureau: v, total: 0, signedOff: 0, pending: 0, rejected: 0, departmentApproved: 0 }),
          ...summaries.filter((r) => !getTenant().unit.options.some((o) => o.value === r.bureau)),
        ]
      : summaries
    const title = isDepartmentView ? `${tiers.department} approval transparency` : `${tiers.unit} sign-off`
    const context = isDepartmentView
      ? `Every ${tiers.unit.toLowerCase()}'s sign-off progress, ${tiers.department.toLowerCase()}-wide`
      : `Your ${tiers.unit.toLowerCase()}'s sign-off progress`
    return (
      <section aria-label={title} data-cockpit="approval-transparency" className="flex flex-col gap-4">
        <SectionTitle title={title} context={context} />
        <div className="overflow-x-auto border border-[var(--ks-limestone-dark)] bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(TH, "text-left")}>{tiers.unit}</th>
                <th className={cn(TH, "text-center")}>Signed off</th>
                <th className={cn(TH, "text-center")}>Pending</th>
                <th className={cn(TH, "text-center")}>Rejected</th>
                <th className={cn(TH, "text-center")}>{tiers.department} approved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bureau}>
                  <td className={cn(TD, "font-semibold")}>{businessUnitLabel(row.bureau)}</td>
                  <td className={cn(TD, "text-center")}><CockpitCount n={row.signedOff} /></td>
                  <td className={cn(TD, "text-center")}><CockpitCount n={row.pending} /></td>
                  <td className={cn(TD, "text-center")}><CockpitCount n={row.rejected} /></td>
                  <td className={cn(TD, "text-center")}><CockpitCount n={row.departmentApproved} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {decidedItems.length > 0 && (
          <>
            <SectionTitle title="Who / when" context="Each decision, who made it and on what date" />
            <div className="overflow-x-auto border border-[var(--ks-limestone-dark)] bg-white">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={cn(TH, "text-left")}>Use case</th>
                    <th className={cn(TH, "text-left")}>{tiers.unit}</th>
                    <th className={cn(TH, "text-left")}>Status</th>
                    <th className={cn(TH, "text-left")}>Signed off by</th>
                    <th className={cn(TH, "text-left")}>{tiers.department} decision</th>
                  </tr>
                </thead>
                <tbody>
                  {decidedItems.map((item) => (
                    <tr key={item.submissionId}>
                      <td className={TD}>
                        <Link
                          href={`/submissions/${item.submissionId}`}
                          className="font-semibold text-[var(--ks-active-blue-dark)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className={TD}>{businessUnitLabel(item.bureau)}</td>
                      <td className={TD}>
                        <SquareTag tone={PROGRESS_TONE[item.progress]}>{PROGRESS_LABEL[item.progress]}</SquareTag>
                      </td>
                      <td className={TD}>
                        {item.signoff ? `${item.signoff.signedOffByName}, ${formatKeystoneDate(item.signoff.signedOffAt)}` : "–"}
                      </td>
                      <td className={TD}>
                        {item.departmentApproval ? `${item.departmentApproval.decision} by ${item.departmentApproval.byName}` : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-uspto-gray-text flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          {isDepartmentView ? `${tiers.department} approval transparency` : `${tiers.unit} sign-off`}
        </h2>
        <span className="text-xs text-muted-foreground">
          {isDepartmentView
            ? `Every ${tiers.unit.toLowerCase()}'s sign-off progress, ${tiers.department.toLowerCase()}-wide`
            : `Your ${tiers.unit.toLowerCase()}'s sign-off progress`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="text-left font-semibold py-2 pr-3">{tiers.unit}</th>
              <th className="text-center font-semibold px-2 py-2">Signed off</th>
              <th className="text-center font-semibold px-2 py-2">Pending</th>
              <th className="text-center font-semibold px-2 py-2">Rejected</th>
              <th className="text-center font-semibold px-2 py-2 whitespace-nowrap">{tiers.department} approved</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((row) => (
              <tr key={row.bureau} className="border-t">
                <td className="py-2 pr-3 font-medium text-uspto-gray-text">{businessUnitLabel(row.bureau)}</td>
                <td className="text-center px-2 py-2">{row.signedOff}</td>
                <td className="text-center px-2 py-2">{row.pending}</td>
                <td className="text-center px-2 py-2">{row.rejected}</td>
                <td className="text-center px-2 py-2">{row.departmentApproved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {decidedItems.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who / when</div>
          <ul className="space-y-1.5">
            {decidedItems.map((item) => (
              <li key={item.submissionId} className="text-sm flex items-center justify-between gap-3">
                <Link href={`/submissions/${item.submissionId}`} className="text-uspto-blue-primary hover:underline truncate">
                  {item.title}
                </Link>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-2">
                  {businessUnitLabel(item.bureau)}
                  <Badge variant="outline" className={PROGRESS_CLASSES[item.progress]}>
                    {PROGRESS_LABEL[item.progress]}
                  </Badge>
                  {item.signoff && (
                    <span>
                      {item.signoff.signedOffByName} · {formatKeystoneDate(item.signoff.signedOffAt)}
                    </span>
                  )}
                  {item.departmentApproval && (
                    <span>
                      · dept: {item.departmentApproval.decision} by {item.departmentApproval.byName}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
