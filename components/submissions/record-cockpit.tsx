"use client"

// NL-6 (#287): the review record on ES2 (`features.cockpitLook`), before a
// decision. Presentation only: every word comes from the caller (today's
// strings) and nothing here reads, saves or calls anything.

import type { ReactNode } from "react"
import { SectionTitle, SquareTag, useCockpitBand, type SquareTagTone } from "@/components/cockpit"
import { STATUS_LABEL, type SubmissionStatus } from "@/lib/reviewWorkflow"
import type { KeystoneStatus } from "@/lib/statusTokens"

const STATUS_TONE: Record<SubmissionStatus, KeystoneStatus> = {
  draft: "neutral",
  submitted: "neutral",
  in_review: "attention",
  needs_info: "alert",
  approved: "healthy",
  rejected: "alert",
}

export function StatusTag({ status }: { status: SubmissionStatus }) {
  return <SquareTag tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</SquareTag>
}

/**
 * NL-10 (#311): the record's eyebrow "office · record ID · status" and its full
 * idea title go in the page band (no second band, no cut-off). Renders nothing itself.
 */
export function RecordBandContent({
  placeLabel,
  status,
  title,
  statusLabel,
  justSubmitted,
}: {
  /** NL-13: program short name, or the office short name when it has no programs. Never a record ID. */
  placeLabel: string
  status: SubmissionStatus
  title: string
  /** Replaces the status word in the eyebrow (NL-7: "Decided" once the record is final). */
  statusLabel?: string
  /** F7-4 (#347): adds "Just submitted" to the eyebrow. The caller passes true only within 24 hours of submitting. */
  justSubmitted?: boolean
}) {
  useCockpitBand({
    eyebrow: `${placeLabel} · ${statusLabel ?? STATUS_LABEL[status]}${justSubmitted ? " · Just submitted" : ""}`.toUpperCase(),
    title,
  })
  return null
}

export type KeyFact = { label: string; value: ReactNode; reason?: string; tone?: SquareTagTone; tag?: boolean }

/** K5 label and value grid. A `tag` fact renders its value as a K6 square tag; `reason` sits right beside it. */
export function KeyFacts({ facts }: { facts: KeyFact[] }) {
  return (
    <dl
      data-cockpit="key-facts"
      className="m-0 grid grid-cols-1 gap-x-8 gap-y-4 border border-[var(--ks-limestone-dark)] bg-white p-5 sm:grid-cols-3"
    >
      {facts.map((f) => (
        <div key={f.label} className={f.reason ? "sm:col-span-2" : undefined}>
          <dt className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]">{f.label}</dt>
          <dd className="m-0 flex flex-wrap items-center gap-2 text-sm leading-[1.45] text-[var(--ks-ink-900)]">
            {f.tag ? <SquareTag tone={f.tone}>{f.value}</SquareTag> : f.value}
            {f.reason ? <span>{f.reason}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * NL-7 (#288): "The decision" block on a decided record. A K3 title over a K5
 * label and value grid; the lock line sits beside a K6 "Locked" tag when the
 * server-side lock (lib/decisionLock.ts) applies. Presentation only: the caller
 * passes values it already shows today, and omits facts it does not have.
 */
export function DecisionBlock({ title, facts }: { title: string; facts: KeyFact[] }) {
  return (
    <section data-cockpit="decision-block" className="space-y-3">
      <SectionTitle title={title} />
      <KeyFacts facts={facts} />
    </section>
  )
}
