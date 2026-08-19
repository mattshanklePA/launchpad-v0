// Pure assembly logic for the Command Center dashboard layout (RD-1) — the
// shared body components/dashboard/command-center.tsx renders for both the
// Department (CC-4) and Bureau/Office (CC-7) dashboards. Split out so it's
// unit-testable without rendering React, same pattern as
// department-dashboard-data.ts. Nothing here changes a count or a predicate:
// every number is read from `buildActionItems`/`buildKpiCards`/`getKpiDrilldown`
// (department-dashboard-data.ts, lib/dashboard/*) — this module only decides
// how to word and group what those already computed.

import type { TenantConfig } from "@/lib/tenant"
import type { DuplicateClusterDrilldownItem } from "@/lib/dashboard/drilldown"
import type { Submission } from "@/lib/submissions"
import { getStatus, STATUS_LABEL, type SubmissionStatus } from "@/lib/reviewWorkflow"
import { clusterHref } from "@/lib/rationalization"
import { kpiDrilldownEntryHref } from "./kpi-card-data"
import type { ActionItem } from "./action-center-data"
import type { KeystoneStatus } from "@/lib/statusTokens"

const SPELLED_COUNT: Record<number, string> = {
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
}

/** Spells out 2-9 for prose ("Three program offices are building…"); falls back to the digit outside that range. */
export function spellCount(n: number): string {
  return SPELLED_COUNT[n] ?? String(n)
}

/** Splits an ActionItem/DashboardAction-style title's leading digit run from its sentence, so the row can bold just the count. `["", title]` when the title has no leading number. */
export function splitLeadingCount(title: string): [count: string, rest: string] {
  const m = title.match(/^(\d+)\s+(.*)$/)
  return m ? [m[1], m[2]] : ["", title]
}

/** `d Mon yyyy` (e.g. "18 Aug 2026") — the mock's date format throughout the dashboard family. */
export function formatKeystoneDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d)
}

/** Splits a `"Name (CODE)"` option label (bureau/office labels throughout `lib/tenant`) into its code and bare name; `code: null` when the label carries no trailing parenthetical. */
export function splitLabelCode(label: string): { code: string | null; name: string } {
  const m = label.match(/^(.*\S)\s*\(([^()]+)\)\s*$/)
  return m ? { code: m[2], name: m[1] } : { code: null, name: label }
}

export type HeroCluster = {
  headline: string
  body: string
  officeLabels: string[]
  href: string
  hint: string
}

/**
 * The "Do this first" hero card's copy, built from the same
 * `getKpiDrilldown(...).duplicates` list the Duplicates KPI card and the
 * Action Center's "Rationalize" row already read — never a new count. `null`
 * when nothing is pending (no hero to show). The headline always describes
 * the first pending cluster; with more than one pending, the body names how
 * many are waiting instead of trying to summarize all of them at once.
 */
export function buildHeroCluster(
  pendingClusters: DuplicateClusterDrilldownItem[],
  tenant: TenantConfig,
): HeroCluster | null {
  if (pendingClusters.length === 0) return null
  const lead = pendingClusters[0]
  const officeLabels = lead.bureauLabel.split(" / ").filter(Boolean)
  const unitPluralLower = tenant.tierLabels.unitPlural.toLowerCase()
  const memberCount = lead.memberIds.length

  const headline = `${spellCount(memberCount)} ${unitPluralLower} are building ${lead.title}.`
  const body =
    pendingClusters.length === 1
      ? "One duplicate cluster is pending rationalization. Nothing in it can be approved until you consolidate it or mark it keep-separate."
      : `${pendingClusters.length} duplicate clusters are pending rationalization. Nothing in them can be approved until each is consolidated or marked keep-separate.`

  return {
    headline,
    body,
    officeLabels,
    href: kpiDrilldownEntryHref(lead),
    // Mock copy (docs/design/Home - Command Center.dc.html, 01 Dashboard -
    // Action Center.dc.html): the mock's fixed "three" made general for any
    // member count.
    hint: `Opens the ${spellCount(memberCount).toLowerCase()} use cases side by side. Nothing is merged until you choose.`,
  }
}

/** The first severity-"critical" item, if any — the one the hero card promotes and the rows below must not repeat. */
export function findHeroItem(items: ActionItem[]): ActionItem | null {
  return items.find((i) => i.severity === "critical") ?? null
}

/** The row list below the hero — every item except the one already promoted. */
export function rowItems(items: ActionItem[], hero: ActionItem | null): ActionItem[] {
  return hero ? items.filter((i) => i.id !== hero.id) : items
}

// Mirrors lib/reviewWorkflow.ts's `statusBadgeClasses` mapping (in_review ->
// attention, needs_info/rejected -> alert, approved -> healthy, submitted/draft
// -> neutral) as a KeystoneStatus enum rather than a class string, for
// StatusPill (which takes the enum, not a class).
const SUBMISSION_STATUS_KEYSTONE: Record<SubmissionStatus, KeystoneStatus> = {
  draft: "neutral",
  submitted: "neutral",
  in_review: "attention",
  needs_info: "alert",
  approved: "healthy",
  rejected: "alert",
}

export function submissionStatusKeystone(status: SubmissionStatus): KeystoneStatus {
  return SUBMISSION_STATUS_KEYSTONE[status]
}

export type ScopedSubmissionRow = {
  id: string
  title: string
  meta: string
  statusLabel: string
  statusKeystone: KeystoneStatus
  href: string
}

/**
 * One row of the scoped "Use cases in this {program|program office}" list
 * (mock 02) — the submitter/date meta line, or "in duplicate cluster" when
 * the submission is itself a pending-rationalization cluster member, per a
 * cluster set the caller already computed (e.g. `clusterDuplicates` +
 * `isRationalizationPending`, lib/rationalization.ts — the same building
 * blocks `lib/dashboard/metrics.ts` uses, just not re-deriving its summary).
 * A pending member's "Open" opens its dedicated cluster page (RD-4) instead
 * of its own submission — the cluster, not the submission, is what's
 * blocking it.
 */
export function scopedSubmissionRow(s: Submission, pendingClusterId: string | undefined): ScopedSubmissionRow {
  const pendingClusterMember = !!pendingClusterId
  const submitterName = String((s.formData as Record<string, unknown>)?.submitterName || "").trim() || "Unknown submitter"
  const meta = pendingClusterMember
    ? `${submitterName} · in duplicate cluster`
    : `${submitterName} · submitted ${formatKeystoneDate(s.submittedAt)}`
  const status = getStatus(s)
  return {
    id: s.id,
    title: String((s.formData as Record<string, unknown>)?.useCaseTitle || "Untitled idea"),
    meta,
    statusLabel: pendingClusterMember ? "Blocked" : STATUS_LABEL[status],
    statusKeystone: pendingClusterMember ? "alert" : submissionStatusKeystone(status),
    href: pendingClusterId ? clusterHref(pendingClusterId) : `/submissions/${s.id}`,
  }
}
