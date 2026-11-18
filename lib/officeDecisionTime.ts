// Typical time to a decision for one office (F6-3, #343). Pure and I/O-free.
//
// Keeps the ideas in the office, keeps those decided within the last 90 days
// (a decision exactly 90 days old counts, 91 does not), and answers with the
// median of their whole-day times (`medianTimeToDecision`, F3-3) once there are
// at least three. Under three it answers "not-enough": a median of one or two
// ideas would point at a person.
//
// The answer is one number or one marker. It carries nothing else about any idea.

import type { Submission } from "@/lib/submissions"
import { getBusinessUnit } from "@/lib/reviewWorkflow"
import { decidedDays, getDecidedAt, medianTimeToDecision } from "@/lib/timeToDecision"

export const DECISION_WINDOW_DAYS = 90
export const MIN_DECISIONS = 3

export type OfficeDecisionTime = { status: "days"; days: number } | { status: "not-enough" }

export function officeDecisionTime(all: Submission[], officeId: string, now: number): OfficeDecisionTime {
  const cutoff = now - DECISION_WINDOW_DAYS * 86_400_000
  const recent = all.filter((s) => {
    if (getBusinessUnit(s) !== officeId) return false
    const at = Date.parse(getDecidedAt(s) ?? "")
    return Number.isFinite(at) && at >= cutoff && at <= now
  })
  if (decidedDays(recent).length < MIN_DECISIONS) return { status: "not-enough" }
  const days = medianTimeToDecision(recent)
  return days === undefined ? { status: "not-enough" } : { status: "days", days }
}
