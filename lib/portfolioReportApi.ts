// What GET /api/report sends the browser (F5-2, #319). Pure, no I/O, so the
// rule "never send the browser an idea the person may not see" is a tested
// function rather than a property of a route.
//
// The ideas are narrowed by `visibleToSession` (lib/serverAccess.ts) first; every
// number then comes from `buildPortfolioReport` (F5-1) over that narrowed set.
// A viewer limited to one program office gets that office only: the office list,
// the report and the idea count all describe that office, never the rest.

import type { Submission } from "@/lib/submissions"
import type { SessionClaims } from "@/lib/session/token"
import type { TenantConfig } from "@/lib/tenant"
import { visibleToSession } from "@/lib/serverAccess"
import { buildPortfolioReport, type PortfolioReport } from "@/lib/portfolioReport"

export type ReportOffice = { id: string; label: string }

export type ReportResponse = {
  report: PortfolioReport
  /** The offices this person may pick from, in config order. */
  offices: ReportOffice[]
  /** Ideas this person may see, whatever office is picked. */
  totalIdeas: number
  /** Limited to one office by the person's own assignment. */
  scoped: boolean
  /** Epoch ms the report was prepared, so the page prints the same date the numbers used. */
  now: number
  /** Sample data is on for this tenant. */
  demo: boolean
}

export type ReportResult =
  | { status: 200; body: ReportResponse }
  | { status: 400 | 403 | 404; body: { error: string } }

/** The office a viewer is limited to, by the same rule `visibleSubmissions` applies. */
function limitedOffice(session: SessionClaims): string | undefined {
  const unit = session.businessUnit || undefined
  const scoped = session.role === "reviewer" || (session.role === "admin" && unit !== "os")
  return scoped ? unit : undefined
}

export function buildReportResponse(
  all: Submission[],
  session: SessionClaims,
  tenant: TenantConfig,
  officeParam: string | null | undefined,
  now: number,
): ReportResult {
  if (!tenant.features.portfolioReport) return { status: 404, body: { error: "Not found" } }
  if (session.role !== "admin" && session.role !== "reviewer") {
    return { status: 403, body: { error: "You do not have access to this" } }
  }

  const limited = limitedOffice(session)
  const known = tenant.unit.options.filter((o) => !limited || o.value === limited)
  const offices = known.map((o) => ({ id: o.value, label: o.label }))
  const asked = officeParam || undefined
  if (asked && !offices.some((o) => o.id === asked)) {
    return { status: 400, body: { error: "Unknown program office" } }
  }

  const visible = visibleToSession(all, session)
  const officeId = asked ?? (limited && offices.length ? limited : undefined)
  return {
    status: 200,
    body: {
      report: buildPortfolioReport(visible, tenant, now, officeId),
      offices,
      totalIdeas: visible.length,
      scoped: !!limited,
      now,
      demo: !!tenant.features.sampleDataStrip,
    },
  }
}
