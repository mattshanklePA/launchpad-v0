// Time to decision (F3-3, #270): whole days from submitted to decided, and the
// median of that over a list. Pure and I/O-free.
//
// Days are whole CALENDAR days in the fixed display zone (America/New_York,
// lib/dateFormat.ts, #236), so 1 Nov to 3 Nov is 2 days for every viewer and
// a record submitted at 11:30pm and decided at 12:30am is 1 day, not 0.
//
// Decided = status approved or rejected. The decision time is the server-stamped
// bureau sign-off time (#229). A record moved to a decided status without one
// uses the most recent status-change time (`formData.statusChangedAt`) if one
// exists, else there is no answer (CTO note, 10 Nov). Nothing in the app writes
// `statusChangedAt` yet, so today that fallback only applies to records that carry it.
//
// Median rule: for an even count, the LOWER of the two middle values (days are
// already whole numbers, so no rounding is needed).

import type { Submission } from "@/lib/submissions"
import { getStatus } from "@/lib/reviewWorkflow"
import { getBureauSignoff } from "@/lib/bureauSignoff"
import { DISPLAY_TIME_ZONE } from "@/lib/dateFormat"

/** The most recent status-change time recorded on the submission, if any. */
function getStatusChangedAt(s: Submission): string | undefined {
  const v = (s as { statusChangedAt?: unknown }).statusChangedAt ?? (s.formData as Record<string, unknown>)?.statusChangedAt
  return typeof v === "string" && v ? v : undefined
}

/** When the record was decided: the sign-off time, else the status-change time, else undefined. Undefined for an undecided record. */
export function getDecidedAt(s: Submission): string | undefined {
  const status = getStatus(s)
  if (status !== "approved" && status !== "rejected") return undefined
  return getBureauSignoff(s)?.signedOffAt || getStatusChangedAt(s)
}

/** The calendar day of `iso` in the display zone as a UTC day number, or NaN if invalid. */
function displayDayNumber(iso: string): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return NaN
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return Date.UTC(get("year"), get("month") - 1, get("day")) / 86_400_000
}

/** Whole days from submitted to decided, or undefined when there is no (trustworthy) decision time. */
export function timeToDecision(s: Submission): number | undefined {
  const decidedAt = getDecidedAt(s)
  if (!decidedAt) return undefined
  const days = displayDayNumber(decidedAt) - displayDayNumber(s.submittedAt)
  return Number.isFinite(days) && days >= 0 ? days : undefined
}

/** Median time to decision over the decided records (lower middle for an even count); undefined when none are decided. */
export function medianTimeToDecision(submissions: Submission[]): number | undefined {
  return medianDays(decidedDays(submissions))
}

/** The whole-day values for every decided record, ascending. */
export function decidedDays(submissions: Submission[]): number[] {
  return submissions
    .map(timeToDecision)
    .filter((d): d is number => d !== undefined)
    .sort((a, b) => a - b)
}

function medianDays(sortedAsc: number[]): number | undefined {
  return sortedAsc.length === 0 ? undefined : sortedAsc[Math.floor((sortedAsc.length - 1) / 2)]
}

/** "N day" / "N days". */
export function formatDays(n: number): string {
  return n === 1 ? "1 day" : `${n} days`
}
