// Executive portfolio report numbers (F5-1, #318). Pure functions, no screen
// code: the screen, the PDF and the office table all read this one result, so
// they cannot disagree. Nothing calls it yet.
//
// Every rule is reused, never re-derived: status, office and labels from
// lib/reviewWorkflow.ts, risk from lib/riskProfile.ts, duplicate groups from
// lib/rationalization.ts, decision time and median from lib/timeToDecision.ts.
// Days are whole calendar days in the fixed America/New_York zone
// (lib/dateFormat.ts), so the answer never depends on the viewer's time zone.
//
// Choices the issue left open:
//  - "open" idea = not yet approved or rejected.
//  - "still in review" (rule b) = status in_review.
//  - A high-risk idea that is already inside a waiting duplicate group is
//    listed once, as the group, not twice.
//  - Group days waiting = days since the group's earliest idea was submitted.
//    Group title = that earliest idea's title. Holder = an assigned reviewer on
//    an open member, else the program office of the earliest open member.
//  - With `officeId`, duplicate groups are found across the whole portfolio
//    (a group needs two offices), then kept when one of its ideas belongs to
//    that office. Ideas covered counts that office's ideas only; offices
//    involved still names every office in the group.
//  - Share of the portfolio is each row's ideas over the ideas in the set being
//    reported (so 100% for a single office).

import type { Submission } from "@/lib/submissions"
import { getStatus, getBusinessUnit, getOffice, getAssigneeName, STATUS_LABEL } from "@/lib/reviewWorkflow"
import { computeRiskProfile, type RiskLevel } from "@/lib/riskProfile"
import { determineHighImpact } from "@/lib/highImpactDetermination"
import { clusterDuplicates, isRationalizationPending, clusterHref, type RationalizationCluster } from "@/lib/rationalization"
import { getBureauSignoff } from "@/lib/bureauSignoff"
import { formatKeystoneDate } from "@/lib/dateFormat"
import { displayDayNumber, formatDays, medianTimeToDecision, timeToDecision, decidedDays } from "@/lib/timeToDecision"
import { tenantCopy } from "@/lib/tenant/copy"
import type { TenantConfig } from "@/lib/tenant"
import type { FocusArea } from "@/lib/tenant/types"

const MAX_LEADER_ITEMS = 3

export type RiskWord = string

export type PortfolioIdea = {
  id: string
  title: string
  office: string
  program: string
  status: string
  risk: RiskWord
  riskLevel: RiskLevel
  reason: string
  /** "N days open" or "N days to decide". */
  days: string
  /** Number behind `days`, used for ordering; undefined for a decision with no time on file. */
  daysValue: number | undefined
  decidedBy: string
  /** Approved or rejected. */
  decided: boolean
  /** Sits in a group of look-alike ideas from more than one office. */
  inOverlap: boolean
  priority: { labels: string[]; text: string }
  href: string
}

export type LeaderItem = {
  kind: "overlap" | "high_risk"
  id: string
  title: string
  why: string
  daysWaiting: number
  heldBy: string
  heldByKind: "reviewer" | "office"
  href: string
}

export type OfficeRow = {
  id: string
  label: string
  ideas: number
  highRisk: number
  inReview: number
  decided: number
  medianDays: number | undefined
  share: number
}

export type PortfolioReport = {
  tenantId: string
  officeId: string | undefined
  /** The office this report is limited to, undefined for the whole portfolio. */
  scopeLabel: string | undefined
  period: { start: string | undefined; end: string; label: string }
  summary: {
    risk: { high: number; medium: number; low: number; total: number; topReason: { text: string; count: number } | undefined }
    decisions: { decided: number; approved: number; notApproved: number; medianDays: number | undefined; medianCovers: number }
    overlap: { groups: number; ideas: number; offices: number; largest: { title: string; offices: string[] } | undefined }
    dataCheck: {
      withOfficeAndRisk: number
      noMeasure: number
      noMeasureIds: string[]
      officesWithNoIdeas: number
      officesWithNoIdeasLabels: string[]
      noPriority: number
    }
  }
  needsLeader: { items: LeaderItem[]; openCount: number }
  offices: { rows: OfficeRow[]; totals: Omit<OfficeRow, "id" | "label"> }
  ideas: PortfolioIdea[]
}

type Copy = ReturnType<typeof tenantCopy>

const isDecided = (s: Submission) => {
  const st = getStatus(s)
  return st === "approved" || st === "rejected"
}

const title = (s: Submission) => String((s.formData as unknown as Record<string, unknown>)?.useCaseTitle || "").trim() || s.id

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : []
}

/** Removes every parenthetical (nested too), e.g. a citation, and tidies the gap it leaves. */
function stripCitations(text: string): string {
  let out = text
  let prev: string
  do {
    prev = out
    out = out.replace(/\s*\([^()]*\)/g, "")
  } while (out !== prev)
  return out.replace(/\s+([.,;:])/g, "$1").replace(/\s{2,}/g, " ").trim()
}

function daysBetween(fromIso: string, toMs: number): number {
  const d = displayDayNumber(new Date(toMs).toISOString()) - displayDayNumber(fromIso)
  return Number.isFinite(d) ? Math.max(0, d) : 0
}

function joinList(items: string[], and: string): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`
}

function riskWord(level: RiskLevel, copy: Copy): string {
  switch (level) {
    case "high":
      return copy.portfolioRiskHigh
    case "medium":
      return copy.portfolioRiskMedium
    case "low":
      return copy.portfolioRiskLow
    default:
      return copy.portfolioRiskUnassessed
  }
}

function standardReason(level: RiskLevel, copy: Copy): string {
  switch (level) {
    case "high":
      return copy.portfolioReasonHigh
    case "medium":
      return copy.portfolioReasonMedium
    case "low":
      return copy.portfolioReasonLow
    default:
      return copy.portfolioReasonUnassessed
  }
}

const RISK_RANK: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2, unknown: 3 }

/** The one-line plain reason: the record's own, else the first high-impact reason without its citation, else the standard line. */
function plainReason(s: Submission, level: RiskLevel, tenant: TenantConfig, copy: Copy): string {
  const own = (s.formData as unknown as Record<string, unknown>)?.riskPlainReason
  if (typeof own === "string" && own.trim()) return own.trim()
  const impact = determineHighImpact(s.formData, tenant)
  if (impact.recommendation === "yes" && impact.reasons[0]) {
    const cleaned = stripCitations(impact.reasons[0])
    if (cleaned) return cleaned
  }
  return standardReason(level, copy)
}

export function buildPortfolioReport(
  submissions: Submission[],
  tenant: TenantConfig,
  now: number,
  officeId?: string,
): PortfolioReport {
  const copy = tenantCopy(tenant)
  const allOffices = tenant.unit.options
  const officeValues = new Set(allOffices.map((o) => o.value))
  const officeName = (unit: string) => allOffices.find((o) => o.value === unit)?.label ?? (unit || copy.portfolioNoOffice)
  const programName = (unit: string, program: string) =>
    program ? (allOffices.find((o) => o.value === unit)?.offices?.find((p) => p.value === program)?.label ?? program) : ""

  // Groups are found over everything, then scoped (a group needs two offices).
  const clusters = clusterDuplicates(submissions, tenant)
  const set = officeId ? submissions.filter((s) => getBusinessUnit(s) === officeId) : submissions
  const inSet = new Set(set.map((s) => s.id))
  const byId = new Map(submissions.map((s) => [s.id, s]))

  const levelOf = new Map(set.map((s) => [s.id, computeRiskProfile(s.formData).level]))
  const level = (s: Submission) => levelOf.get(s.id) ?? "unknown"
  const open = set.filter((s) => !isDecided(s))
  const inAnyGroup = new Set(clusters.flatMap((c) => c.memberIds))

  // Priorities the tenant knows about: enterprise and every program office's own.
  const focusById = new Map<string, FocusArea>()
  for (const f of [...tenant.focusAreas, ...allOffices.flatMap((o) => o.focusAreas ?? [])]) focusById.set(f.id, f)
  const focusLabels = (s: Submission) => {
    const seen = new Set<string>()
    for (const id of strList(s.formData.usptoFocusArea)) if (focusById.has(id)) seen.add(focusById.get(id)!.label)
    return [...seen]
  }

  // ── Every idea ──
  const ideas: PortfolioIdea[] = set.map((s) => {
    const lv = level(s)
    const decided = isDecided(s)
    const daysValue = decided ? timeToDecision(s) : daysBetween(s.submittedAt, now)
    const days =
      daysValue === undefined
        ? copy.portfolioNotRecorded
        : (decided ? copy.portfolioDaysToDecide : copy.portfolioDaysOpen).replace("{days}", formatDays(daysValue))
    const labels = focusLabels(s)
    const unit = getBusinessUnit(s)
    return {
      id: s.id,
      title: title(s),
      office: officeName(unit),
      program: programName(unit, getOffice(s)),
      status: STATUS_LABEL[getStatus(s)],
      risk: riskWord(lv, copy),
      riskLevel: lv,
      reason: plainReason(s, lv, tenant, copy),
      days,
      daysValue,
      decided,
      inOverlap: inAnyGroup.has(s.id),
      decidedBy: decided ? getBureauSignoff(s)?.signedOffByName || copy.portfolioNotRecorded : copy.portfolioNotYet,
      priority: { labels, text: labels.length ? labels.join(", ") : copy.portfolioNoPriority },
      href: `/submissions/${s.id}`,
    }
  })
  ideas.sort(
    (a, b) => RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel] || (b.daysValue ?? -1) - (a.daysValue ?? -1) || a.id.localeCompare(b.id),
  )

  // ── Summary: risk ──
  const high = set.filter((s) => level(s) === "high")
  const reasonCounts = new Map<string, number>()
  for (const s of high) {
    const text = ideas.find((i) => i.id === s.id)!.reason
    reasonCounts.set(text, (reasonCounts.get(text) ?? 0) + 1)
  }
  const topReason = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  const risk = {
    high: high.length,
    medium: set.filter((s) => level(s) === "medium").length,
    low: set.filter((s) => level(s) === "low").length,
    total: set.length,
    topReason: topReason ? { text: topReason[0], count: topReason[1] } : undefined,
  }

  // ── Summary: decisions ──
  const decidedSet = set.filter(isDecided)
  const decisions = {
    decided: decidedSet.length,
    approved: decidedSet.filter((s) => getStatus(s) === "approved").length,
    notApproved: decidedSet.filter((s) => getStatus(s) === "rejected").length,
    medianDays: medianTimeToDecision(set),
    medianCovers: decidedDays(set).length,
  }

  // ── Summary: overlap ──
  const groups = clusters.filter((c) => c.memberIds.some((id) => inSet.has(id)))
  const earliest = (ids: string[]) =>
    ids
      .map((id) => byId.get(id)!)
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id))
  const groupOffices = (c: RationalizationCluster) => [...new Set(earliest(c.memberIds).map(getBusinessUnit))]
  const largestGroup = [...groups].sort(
    (a, b) => b.memberIds.length - a.memberIds.length || b.maxSimilarity - a.maxSimilarity || a.id.localeCompare(b.id),
  )[0]
  const overlap = {
    groups: groups.length,
    ideas: new Set(groups.flatMap((c) => c.memberIds.filter((id) => inSet.has(id)))).size,
    offices: new Set(groups.flatMap(groupOffices)).size,
    largest: largestGroup
      ? { title: title(earliest(largestGroup.memberIds)[0]), offices: groupOffices(largestGroup).map(officeName) }
      : undefined,
  }

  // ── Summary: data check ──
  const noMeasure = set.filter((s) => !String(s.formData.successMetrics || "").trim() && strList(s.formData.keyMetrics).length === 0)
  const reportOffices = officeId ? allOffices.filter((o) => o.value === officeId) : allOffices
  const emptyOffices = reportOffices.filter((o) => !set.some((s) => getBusinessUnit(s) === o.value))
  const dataCheck = {
    withOfficeAndRisk: set.filter((s) => officeValues.has(getBusinessUnit(s)) && level(s) !== "unknown").length,
    noMeasure: noMeasure.length,
    noMeasureIds: noMeasure.map((s) => s.id),
    officesWithNoIdeas: emptyOffices.length,
    officesWithNoIdeasLabels: emptyOffices.map((o) => o.label),
    noPriority: set.filter((s) => focusLabels(s).length === 0).length,
  }

  // ── Needs a leader's decision ──
  const items: LeaderItem[] = []
  const inWaitingGroup = new Set<string>()
  for (const c of groups) {
    const openMembers = earliest(c.memberIds).filter((m) => !isDecided(m) && isRationalizationPending(m, [c]))
    if (openMembers.length === 0) continue
    for (const m of openMembers) inWaitingGroup.add(m.id)
    const all = earliest(c.memberIds)
    const reviewer = openMembers.map(getAssigneeName).find(Boolean)
    items.push({
      kind: "overlap",
      id: c.id,
      title: title(all[0]),
      why: copy.portfolioWaitOverlap.replace("{offices}", joinList(groupOffices(c).map(officeName), copy.portfolioListAnd)),
      daysWaiting: daysBetween(all[0].submittedAt, now),
      heldBy: reviewer || officeName(getBusinessUnit(openMembers[0])),
      heldByKind: reviewer ? "reviewer" : "office",
      href: clusterHref(c.id),
    })
  }
  for (const s of set) {
    if (level(s) !== "high" || getStatus(s) !== "in_review" || inWaitingGroup.has(s.id)) continue
    const reviewer = getAssigneeName(s)
    items.push({
      kind: "high_risk",
      id: s.id,
      title: title(s),
      why: copy.portfolioWaitHighRisk.replace("{reason}", ideas.find((i) => i.id === s.id)!.reason),
      daysWaiting: daysBetween(s.submittedAt, now),
      heldBy: reviewer || officeName(getBusinessUnit(s)),
      heldByKind: reviewer ? "reviewer" : "office",
      href: `/submissions/${s.id}`,
    })
  }
  items.sort((a, b) => b.daysWaiting - a.daysWaiting || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))

  // ── By program office ──
  const row = (id: string, label: string, rows: Submission[]): OfficeRow => ({
    id,
    label,
    ideas: rows.length,
    highRisk: rows.filter((s) => level(s) === "high").length,
    inReview: rows.filter((s) => getStatus(s) === "in_review").length,
    decided: rows.filter(isDecided).length,
    medianDays: medianTimeToDecision(rows),
    share: set.length ? rows.length / set.length : 0,
  })
  const rows = reportOffices.map((o) => row(o.value, o.label, set.filter((s) => getBusinessUnit(s) === o.value)))
  const stray = set.filter((s) => !reportOffices.some((o) => o.value === getBusinessUnit(s)))
  if (stray.length > 0) rows.push(row("", copy.portfolioNoOffice, stray))
  const totals = row("", "", set)

  // ── Period ──
  const earliestSubmitted = set.map((s) => s.submittedAt).filter((v) => !Number.isNaN(new Date(v).getTime())).sort()[0]
  const end = new Date(now).toISOString()
  const period = {
    start: earliestSubmitted,
    end,
    label: earliestSubmitted ? `${formatKeystoneDate(earliestSubmitted)} to ${formatKeystoneDate(end)}` : formatKeystoneDate(end),
  }

  const { id: _id, label: _label, ...totalsOnly } = totals
  return {
    tenantId: tenant.id,
    officeId,
    scopeLabel: officeId ? officeName(officeId) : undefined,
    period,
    summary: { risk, decisions, overlap, dataCheck },
    needsLeader: { items: items.slice(0, MAX_LEADER_ITEMS), openCount: open.length },
    offices: { rows, totals: totalsOnly },
    ideas,
  }
}
