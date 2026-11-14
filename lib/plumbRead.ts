// Saved Plumb reads (issue #272). Pure, no I/O and no model call, so it is
// unit-testable (app/actions.ts is "use server" and outside the vitest globs).
//
// A Plumb read (the reviewer-assist analysis on a record) is saved with the
// record the first time it is produced, together with a fingerprint of the
// submission content it was based on. Opening the record again shows the saved
// read when the fingerprint still matches; decided records never re-read on
// their own.

import { createHash } from "node:crypto"

export type PlumbRead = {
  verdict: string
  strengths: string[]
  gaps: string[]
  suggestedDisposition: "approve" | "request_info" | "reject"
  draftRequestInfo: string
}

export type SavedPlumbRead = { read: PlumbRead; fingerprint: string; savedAt: string }

/** What the open-record screen gets back. `source` says where `read` came from. */
export type PlumbReadResult = {
  read: PlumbRead | null
  /** ISO time the shown read was produced; null when nothing was saved for it. */
  savedAt: string | null
  source: "saved" | "new" | "none"
}

/**
 * The exact text Plumb reads about a submission. The fingerprint is a hash of
 * this, so it changes when (and only when) a field Plumb reads changes.
 */
export function plumbReadInput(formData: Record<string, unknown>): string {
  const f = formData as Record<string, any>
  return `
Title: ${f.useCaseTitle || "Untitled"}
Problem: ${f.problemDefinition || f.coreProblem || "[Not provided]"}
Solution: ${f.solutionSummary || f.proposedSolution || "[Not provided]"}
Business value: ${f.businessValueSummary || f.businessValue || "[Not provided]"}
Cost/time savings: ${f.costSavings || "[Not provided]"}
Users impacted: ${f.impactedUsersCount || "[Not provided]"}
Strategic alignment: ${f.alignmentSummary || f.relevantOkrs || (Array.isArray(f.usptoFocusArea) ? f.usptoFocusArea.join(", ") : "") || "[Not provided]"}
Implementation complexity: ${f.implementationComplexity || "[Not provided]"}
Success metrics: ${f.metricsSummary || f.successMetrics || "[Not provided]"}
Timeline: ${f.timelineForResults || "[Not provided]"}
AI risk — PII: ${f.involvesSensitiveData || "?"}; model sourcing: ${f.aiModelSourcing || "?"}; drives decisions about people: ${f.aiDecisionalImpact || "?"}; mandatory human review: ${f.aiHumanReview || "?"}
Prior readiness verdict: ${f.readinessScore || "n/a"}
`
}

export function plumbReadFingerprint(formData: Record<string, unknown>): string {
  return createHash("sha256").update(plumbReadInput(formData)).digest("hex")
}

export function isDecidedRecord(formData: Record<string, unknown> | undefined): boolean {
  const s = formData?.reviewStatus
  return s === "approved" || s === "rejected"
}

export type PlumbReadDeps = {
  /** Saved read for the record, or null (also null when the table is missing). */
  load: (submissionId: string) => Promise<SavedPlumbRead | null>
  /** Best-effort save; must not throw. */
  save: (submissionId: string, saved: SavedPlumbRead) => Promise<void>
  /** Produce a new read. `ok` is false when it is canned fallback text (never saved). */
  produce: (formData: Record<string, unknown>) => Promise<{ read: PlumbRead; ok: boolean }>
  now?: () => Date
}

/**
 * Decide between the saved read and a new one.
 *  - decided record: show the saved read (any fingerprint); never re-read unless
 *    `force` (the "Produce a read" button).
 *  - otherwise: saved read when the fingerprint matches, else produce + save.
 */
export async function resolvePlumbRead(
  args: { submissionId: string; formData: Record<string, unknown>; force?: boolean },
  deps: PlumbReadDeps,
): Promise<PlumbReadResult> {
  const { submissionId, formData, force } = args
  const decided = isDecidedRecord(formData)
  const fingerprint = plumbReadFingerprint(formData)

  let saved: SavedPlumbRead | null = null
  try {
    saved = await deps.load(submissionId)
  } catch {
    saved = null
  }

  if (!force) {
    if (saved && (decided || saved.fingerprint === fingerprint)) {
      return { read: saved.read, savedAt: saved.savedAt, source: "saved" }
    }
    if (decided) return { read: null, savedAt: null, source: "none" }
  }

  const { read, ok } = await deps.produce(formData)
  if (!ok) return { read, savedAt: null, source: "new" }
  const savedAt = (deps.now?.() ?? new Date()).toISOString()
  try {
    await deps.save(submissionId, { read, fingerprint, savedAt })
  } catch {
    // saving is best-effort; the read is still shown
  }
  return { read, savedAt, source: "new" }
}
