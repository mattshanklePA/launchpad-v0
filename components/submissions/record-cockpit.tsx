"use client"

// NL-6 (#287): the review record on ES2 (`features.cockpitLook`), before a
// decision. Presentation only: every word comes from the caller (today's
// strings) and nothing here reads, saves or calls anything.

import type { ReactNode } from "react"
import { HeaderBand, SquareTag, type SquareTagTone } from "@/components/cockpit"
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

/** K1 band for the record: eyebrow "office · record ID · status", title is the idea's title. */
export function RecordBand({
  unitLabel,
  slugTail,
  status,
  title,
  background,
}: {
  unitLabel: string
  slugTail: string
  status: SubmissionStatus
  title: string
  background?: string
}) {
  return (
    <HeaderBand
      eyebrow={`${unitLabel} · ${slugTail} · ${STATUS_LABEL[status]}`.toUpperCase()}
      title={title}
      headingLevel="h2"
      background={background}
    />
  )
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
