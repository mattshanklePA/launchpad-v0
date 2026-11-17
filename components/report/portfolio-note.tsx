"use client"

// F5-5 (#322): Plumb's read of the portfolio and the Decision Center briefing
// kept in the report, below the numbers on /report (ES2 only). The numbers never
// wait for the note: it is written only when a person presses "Ask Plumb for a
// read" (FIX-3, #339), shows its own reading state, and on any failure shows a
// plain message with "Try again". The note and the
// briefing live in browser memory for the session (lib/portfolioReportSession.ts).

import { useCallback, useEffect, useRef, useState } from "react"
import { SectionTitle } from "@/components/cockpit/section-title"
import { SquareTag, type SquareTagTone } from "@/components/cockpit/square-tag"
import { writePortfolioNote } from "@/app/report-actions"
import { formatKeystoneDateTime } from "@/lib/dateFormat"
import { getTenant } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import { removeBriefing, setNote, useSavedBriefing, useSavedNote } from "@/lib/portfolioReportSession"

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-active-blue)]"
const BOX = "rounded-lg border border-[var(--ks-limestone-dark)] bg-white px-[22px] py-5"
const BTN = `min-h-[44px] border border-[var(--ks-limestone-dark)] bg-white px-[18px] text-[15px] font-semibold text-[var(--ks-active-blue-dark)] ${FOCUS}`

const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
const when = (ms: number) => formatKeystoneDateTime(new Date(ms).toISOString())

type Phase = "idle" | "writing" | "error"

/**
 * Plumb's note for the office view in `office` ("" is the whole portfolio).
 * Nothing is requested until a person presses the button. When the office
 * changes, a note on screen is cleared (by the report screen): it was about a different set of ideas.
 */
export function PortfolioNote({ office }: { office: string }) {
  const copy = tenantCopy(getTenant())
  const saved = useSavedNote(office)
  const [phase, setPhase] = useState<Phase>("idle")
  const live = useRef(true)
  const current = useRef(office)
  const busy = useRef(false)

  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  useEffect(() => {
    current.current = office
  }, [office])

  const write = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    const asked = office
    setPhase("writing")
    let next: Phase = "error"
    try {
      const result = await writePortfolioNote(asked)
      // An answer about an office that is no longer on screen is dropped.
      if (result.status === "ok" && current.current === asked) {
        setNote(asked, { note: result.note, writtenAt: result.writtenAt })
        next = "idle"
      } else if (result.status === "ok") {
        next = "idle"
      }
    } catch {
      next = "error"
    }
    busy.current = false
    if (live.current) setPhase(current.current === asked ? next : "idle")
  }, [office])

  const writing = phase === "writing"
  const failed = phase === "error" && !writing
  const context = saved && !failed ? fill(copy.reportNoteLabel, { when: when(saved.writtenAt) }) : copy.reportNoteContext

  return (
    <section aria-label={copy.reportNoteTitle} className="flex flex-col gap-3.5">
      <SectionTitle title={copy.reportNoteTitle} context={context} />
      {failed ? (
        <div role="status" className={`flex flex-wrap items-center justify-between gap-4 ${BOX}`}>
          <div className="flex items-center gap-3.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 bg-[var(--ks-alert)]" />
            <p className="m-0 text-[15px]">{copy.reportNoteError}</p>
          </div>
          <button type="button" onClick={() => void write()} className={BTN}>
            {copy.reportNoteRetry}
          </button>
        </div>
      ) : (
        <div className={`flex flex-wrap items-start justify-between gap-4 ${BOX}`}>
          <p className="m-0 max-w-[880px] text-[15px] leading-[1.6] text-[var(--ks-ink-900)]">{saved ? saved.note : copy.reportNoteExplainer}</p>
          <button type="button" disabled={writing} aria-busy={writing} onClick={() => void write()} className={`${BTN} disabled:opacity-70`}>
            {writing ? copy.reportNoteReading : saved ? copy.reportNoteAskAgain : copy.reportNoteAsk}
          </button>
        </div>
      )}
    </section>
  )
}

function verdictTag(verdict: string, copy: ReturnType<typeof tenantCopy>) {
  const tone: SquareTagTone = verdict === "fund_now" ? "healthy" : verdict === "fund_with_conditions" ? "attention" : "neutral"
  const word = verdict === "fund_now" ? copy.reportBriefingFundNow : verdict === "fund_with_conditions" ? copy.reportBriefingFundWithConditions : copy.reportBriefingHold
  return <SquareTag tone={tone}>{word}</SquareTag>
}

/** The briefing the person added from the Decision Center, or nothing when none was added. */
export function ReportBriefing() {
  const copy = tenantCopy(getTenant())
  const saved = useSavedBriefing()
  if (!saved) return null
  const { briefing, titles, writtenAt } = saved
  const fund = briefing.perSubmission.find((p) => p.id === briefing.recommendation.fundId)
  return (
    <section aria-label={copy.reportBriefingTitle} className="flex flex-col gap-3.5">
      <SectionTitle title={copy.reportBriefingTitle} context={fill(copy.reportBriefingContext, { ideas: titles.join(", "), when: when(writtenAt) })} />
      <div className={`flex flex-col gap-4 ${BOX}`}>
        <div className="border-l-4 border-l-[var(--ks-amber)] pl-4">
          {fund ? <p className="m-0 font-semibold text-[var(--ks-ink-900)]">{fill(copy.reportBriefingFundFirst, { title: fund.title })}</p> : null}
          <p className="m-0 mt-0.5 text-[15px] leading-[1.6] text-[var(--ks-ink-900)]">{briefing.recommendation.headline}</p>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0" style={{ gridTemplateColumns: `repeat(${briefing.perSubmission.length}, minmax(0, 1fr))` }}>
          {briefing.perSubmission.map((p) => (
            <li key={p.id} className="border border-[var(--ks-limestone-dark)] p-3">
              <p className="m-0 font-medium leading-tight">{p.title}</p>
              <div className="mt-1.5">{verdictTag(p.verdict, copy)}</div>
              <p className="m-0 mt-2 text-xs leading-relaxed text-[var(--ks-ink-700)]">{p.oneLine}</p>
              <p className="m-0 mt-1.5 text-xs leading-relaxed">
                <span className="font-semibold">{copy.reportBriefingGap}: </span>
                {p.gap}
              </p>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]">{copy.reportBriefingDiffer}</p>
            <p className="m-0 mt-1 text-[15px] leading-relaxed">{briefing.differ}</p>
          </div>
          <div>
            <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]">{copy.reportBriefingBiggestGap}</p>
            <p className="m-0 mt-1 text-[15px] leading-relaxed">{briefing.portfolioGap}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={removeBriefing} className={BTN}>
            {copy.reportBriefingRemove}
          </button>
        </div>
      </div>
    </section>
  )
}
