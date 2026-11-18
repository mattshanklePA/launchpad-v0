"use client"

// Guided intake ready check (F6-2, #342). ES2 only: the conversational intake
// renders this instead of IntakeRecordPanel where `features.readyCheck` is on.
// Two panels beside the chat: "Your idea so far" (with one "Fill this in" card
// for the first bracketed blank) and "Before you send" (the F6-1 list). The
// send button calls the same submit handler, which checks the gate again.

import { useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IntakeDetailsEditor } from "@/components/launchpad/intake-details-editor"
import { fieldLabel } from "@/components/launchpad/chat-panel"
import { SectionTitle } from "@/components/cockpit"
import { getBeforeYouSend, type BeforeYouSendBlank } from "@/lib/guidedSubmitGate"
import type { GuidedSubmitGate } from "@/lib/guidedSubmitGate"
import { tenantCopy } from "@/lib/tenant/copy"
import { getTenant } from "@/lib/tenant"
import type { FormData } from "@/lib/steps"

type Props = {
  formData: FormData
  onFieldChange: (patch: Partial<FormData>) => void
  /** The single submit gate; the button opens only when it (and the list) pass. */
  gate: GuidedSubmitGate
  isSubmitting: boolean
  onSubmit: () => void
  /** "Fix" for a field the details form does not hold: move focus to the conversation. */
  onFixInChat: (field: string) => void
  /** The assistant's suggested fill for a blank, when it has one. */
  guessFor?: (blank: BeforeYouSendBlank, token: string) => string | undefined
}

const PANEL = "min-w-0 rounded-lg border border-[var(--ks-line,#D6CEBE)] bg-white p-5"
const BLANK_TOKEN = /(\[[^\][a-z]*[A-Z]{2}[^\][a-z]*\])/

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
}

/** The text with every bracketed blank marked in place (dashed outline). */
function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(BLANK_TOKEN).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-transparent px-1 font-semibold text-inherit outline-dashed outline-2 outline-offset-1 outline-[var(--ks-amber,#C77D3A)]">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

/** Replace the first occurrence of `token` in `text`. */
function replaceFirst(text: string, token: string, value: string): string {
  const at = text.indexOf(token)
  return at < 0 ? text : text.slice(0, at) + value + text.slice(at + token.length)
}

function questionFor(token: string, label: string): string {
  const numeric = /NUMBER|COUNT|HOURS|DAYS|MONTH|WEEK|BUDGET|COST|PERCENT|\$|%/.test(token)
  return numeric
    ? `What number goes in place of ${token} in "${label}"?`
    : `What goes in place of ${token} in "${label}"?`
}

function FillCard({
  blank,
  copy,
  assistant,
  guess,
  onFill,
}: {
  blank: BeforeYouSendBlank
  copy: ReturnType<typeof tenantCopy>
  assistant: string
  guess?: string
  onFill: (value: string) => void
}) {
  const token = blank.tokens[0]
  const [typing, setTyping] = useState(false)
  const [value, setValue] = useState("")
  const trimmed = value.trim()
  return (
    <div data-testid="fill-card" className="mt-4 min-w-0 rounded-md border border-[var(--ks-amber,#C77D3A)] bg-[#FBF6EC] p-4">
      <h3 className="m-0 text-[15px] font-bold text-[var(--ks-ink-900,#1E252C)]">{copy.readyFillTitle}</h3>
      <p className="mt-1 break-words text-sm text-[var(--ks-ink-800,#2A333C)]">{questionFor(token, blank.label)}</p>
      {guess ? (
        <p className="mt-1 text-sm text-[var(--ks-ink-700,#4A545E)]">{fill(copy.readyGuess, { assistant, guess })}</p>
      ) : null}
      {typing ? (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (trimmed) onFill(trimmed)
          }}
        >
          <Input
            data-testid="fill-input"
            aria-label={`${copy.readyTypeIt}: ${token}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-w-0 flex-1"
            autoFocus
          />
          <Button type="submit" size="sm" disabled={!trimmed}>
            {copy.readySave}
          </Button>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {guess ? (
            <Button type="button" size="sm" onClick={() => onFill(guess)}>
              {fill(copy.readyUse, { guess })}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" onClick={() => setTyping(true)}>
            {copy.readyTypeIt}
          </Button>
        </div>
      )}
    </div>
  )
}

function Mark({ done }: { done: boolean }): ReactNode {
  return done ? (
    <span aria-hidden="true" className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#2E7D4F]" />
  ) : (
    <span aria-hidden="true" className="inline-block h-2.5 w-2.5 flex-shrink-0 rotate-45 bg-[var(--ks-amber,#C77D3A)]" />
  )
}

export function IntakeReadyCheckPanel({ formData, onFieldChange, gate, isSubmitting, onSubmit, onFixInChat, guessFor }: Props) {
  const tenant = getTenant()
  const copy = tenantCopy(tenant)
  const before = getBeforeYouSend(formData, tenant)
  const ready = before.ready && gate.canSubmit
  const first = before.blanks[0]
  const firstValue = first ? (formData[first.field as keyof FormData] as string | undefined) : undefined

  // The summary text: the description. If the first blank sits in another
  // field, that field's text is shown under its own label, so the blank is
  // always visible in place.
  const showOther = first && first.field !== "useCaseDescription" && firstValue
  const description = formData.useCaseDescription || ""

  const fix = (field: string) => {
    const el = document.getElementById(`details-${field}`)
    if (el) el.focus()
    else onFixInChat(field)
  }

  const applyFill = (value: string) => {
    if (!first) return
    const token = first.tokens[0]
    const patch: Record<string, string> = {}
    // Every field holding this same text (a guided draft and the form field it
    // stands in for) is filled together, so the blank does not come back.
    for (const [key, v] of Object.entries(formData)) {
      if (typeof v === "string" && v === firstValue && v.includes(token)) patch[key] = replaceFirst(v, token, value)
    }
    if (Object.keys(patch).length) onFieldChange(patch as Partial<FormData>)
  }

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="ready-check">
      <section className={PANEL} aria-label={copy.readyIdeaTitle}>
        <SectionTitle title={copy.readyIdeaTitle} />
        <p className="mt-3 break-words text-[17px] font-bold text-[var(--ks-ink-900,#1E252C)]">{formData.useCaseTitle}</p>
        {description ? (
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ks-ink-800,#2A333C)]">
            <Highlighted text={description} />
          </p>
        ) : null}
        {showOther ? (
          <div className="mt-3">
            <p className="m-0 text-xs font-bold uppercase tracking-wide text-[var(--ks-ink-700,#4A545E)]">{first.label}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--ks-ink-800,#2A333C)]">
              <Highlighted text={firstValue as string} />
            </p>
          </div>
        ) : null}
        {first ? (
          <FillCard
            key={`${first.field}:${first.tokens[0]}`}
            blank={first}
            copy={copy}
            assistant={tenant.assistantName}
            guess={guessFor?.(first, first.tokens[0])}
            onFill={applyFill}
          />
        ) : null}
        <div className="mt-4 border-t pt-3">
          <IntakeDetailsEditor formData={formData} onFieldChange={onFieldChange} />
        </div>
      </section>

      <section className={PANEL} aria-label={copy.readyBeforeTitle}>
        <SectionTitle title={copy.readyBeforeTitle} />
        <ul className="m-0 mt-2 list-none p-0">
          {before.rows.map((row) => (
            <li
              key={row.id}
              data-testid="ready-row"
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#E7E1D6] py-2.5 text-sm"
            >
              <Mark done={row.done} />
              <span className="min-w-0 flex-1 break-words">{row.label}</span>
              <span className="text-xs font-bold uppercase tracking-wide">{row.done ? copy.readyDone : copy.readyMissing}</span>
              {!row.done && row.fixField ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-[#006BA1] underline underline-offset-2 hover:text-[#1E252C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  aria-label={`${copy.readyFix}: ${row.label}`}
                  onClick={() => fix(row.fixField as string)}
                >
                  {copy.readyFix}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-semibold" aria-live="polite" data-testid="ready-summary">
          {before.summary}
        </p>
        <Button className="mt-3 w-full" onClick={onSubmit} disabled={isSubmitting || !ready}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {copy.readySendingLabel}
            </>
          ) : (
            copy.readySendLabel
          )}
        </Button>
      </section>
    </div>
  )
}
