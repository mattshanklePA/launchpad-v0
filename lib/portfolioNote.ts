// F5-5 (#322): Plumb's read of the portfolio. Pure, no I/O: what the assistant
// is told, what it is shown, and how its answer is cleaned. The server action
// (app/report-actions.ts) supplies the assistant and the ideas.
//
// The assistant is shown the figures from `buildPortfolioReport` over the ideas
// the signed-in person may see, never raw ideas and never anything sent by the
// browser. Every number is worked out before the assistant is asked. Besides the
// numbers it carries some free text from those ideas: idea titles, the reasons
// given for high risk, and the names of reviewers or offices holding an idea.
// Each piece of that text is cut to a fixed length and put inside quotes, so it
// reads as data, not as an instruction.

import type { Submission } from "@/lib/submissions"
import type { SessionClaims } from "@/lib/session/token"
import type { TenantConfig } from "@/lib/tenant"
import type { PortfolioReport } from "@/lib/portfolioReport"
import { buildReportResponse } from "@/lib/portfolioReportApi"
import { formatDays } from "@/lib/timeToDecision"

export type PortfolioNoteResult = { status: "ok"; note: string; writtenAt: number } | { status: "unavailable" }

/** A note is cut at a whole sentence at or under this many characters. */
export const NOTE_MAX_CHARS = 700
const NOTE_MIN_CHARS = 20

export function portfolioNoteInstruction(assistant: string, org: string): string {
  return [
    `You are ${assistant}, writing for a senior Army civilian who leads AI work at ${org}. You are given the numbers of one AI portfolio report. Write two or three plain sentences about it, as advice for this week.`,
    "Cover, where the numbers show it: where the high-risk ideas sit, which overlap a leader should settle, what has waited longest and who holds it, and where decisions are fast or slow.",
    "Write in plain words a senior Army civilian would use. Use no policy acronyms.",
    "Never say a law or memo requires anything. Where you mention the DoW AI Ethical Principles, say an idea lines up with them, never that it must.",
    "Use no em dashes. Never name an AI model vendor or model. Never cite or name any outside memo or framework.",
    "Use only the numbers given. Say nothing about an office the numbers do not cover. Do not invent names, dates or figures.",
    "You give advice. You never make or announce a decision. Return the sentences only: no list, no heading, no markup.",
  ].join("\n")
}

/** The most characters of each kind of free text that goes into the prompt. */
export const NOTE_FIELD_MAX = { title: 80, reason: 200, name: 100 } as const

/** Free text as data: one line, no quote marks, cut to `max`, inside quotes. */
function quoted(text: string, max: number): string {
  return `"${text.replace(/["\u201C\u201D]/g, "").replace(/\s+/g, " ").trim().slice(0, max).trim()}"`
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The numbers the assistant is shown, as plain lines. Covers only what the report covers. */
export function portfolioNoteInput(report: PortfolioReport, orgName: string): string {
  const { risk, decisions, overlap, dataCheck } = report.summary
  const lines: string[] = [
    `Report for: ${report.scopeLabel ?? `${orgName}, whole portfolio`}`,
    `Period: ${report.period.label}`,
    `Ideas in this report: ${count(report.ideas.length, "idea", "ideas")}`,
    `High risk: ${risk.high} of ${risk.total} (medium ${risk.medium}, low ${risk.low})`,
  ]
  if (risk.topReason) lines.push(`Most common high-risk reason: ${quoted(risk.topReason.text, NOTE_FIELD_MAX.reason)} (${risk.topReason.count} of ${risk.high})`)
  lines.push(
    `Decided: ${decisions.decided} of ${report.ideas.length} (${decisions.approved} approved, ${decisions.notApproved} not approved)`,
    decisions.medianDays === undefined ? "Median time to decide: not available" : `Median time to decide: ${formatDays(decisions.medianDays)}`,
  )
  lines.push(
    overlap.groups === 0
      ? "Overlap: no look-alike ideas found"
      : `Overlap: ${count(overlap.groups, "group", "groups")} of look-alike ideas, covering ${count(overlap.ideas, "idea", "ideas")} in ${count(overlap.offices, "office", "offices")}${
          overlap.largest ? `; largest: ${quoted(overlap.largest.title, NOTE_FIELD_MAX.title)}, in ${overlap.largest.offices.map((o) => quoted(o, NOTE_FIELD_MAX.name)).join(", ")}` : ""
        }`,
  )
  lines.push(`Waiting on a leader: ${report.needsLeader.items.length} of ${report.needsLeader.openCount} open ideas`)
  report.needsLeader.items.forEach((it, n) => {
    lines.push(`  ${n + 1}. ${quoted(it.title, NOTE_FIELD_MAX.title)}. ${quoted(it.why, NOTE_FIELD_MAX.reason)} Held by ${quoted(it.heldBy, NOTE_FIELD_MAX.name)} (${it.heldByKind === "reviewer" ? "reviewer" : "program office"}). Waiting ${formatDays(it.daysWaiting)}.`)
  })
  lines.push("By program office:")
  for (const r of report.offices.rows) {
    lines.push(
      r.ideas === 0
        ? `  ${r.label}: no ideas yet`
        : `  ${r.label}: ${count(r.ideas, "idea", "ideas")}, ${r.highRisk} high risk, ${r.inReview} in review, ${r.decided} decided, median ${r.medianDays === undefined ? "not available" : formatDays(r.medianDays)} to decide`,
    )
  }
  lines.push(`Ideas with no way to measure success yet: ${dataCheck.noMeasure}`, `Ideas tied to no priority: ${dataCheck.noPriority}`)
  return lines.join("\n")
}

const MODEL_VENDOR = /\b(Anthropic|Claude|Sonnet|Opus|Haiku|OpenAI|ChatGPT|GPT-?\d\w*|Gemini|Llama|Mistral|Cohere)\b/i

/**
 * The answer as shown, or null when it cannot be used (not text, empty, too
 * short, looks like markup, names a vendor or says something "requires" or is "required", or any word starting "requir").
 * Em dashes become commas; a long answer is cut at a whole sentence.
 */
export function cleanPortfolioNote(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const text = raw.replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim()
  if (text.length < NOTE_MIN_CHARS) return null
  if (/[{}]|```|^\s*[#*\-\[]/.test(text)) return null
  if (MODEL_VENDOR.test(text) || /\brequir/i.test(text)) return null
  if (text.length <= NOTE_MAX_CHARS) return text
  const head = text.slice(0, NOTE_MAX_CHARS)
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "), /[.!?]$/.test(head) ? head.length - 1 : -1)
  return end >= NOTE_MIN_CHARS ? head.slice(0, end + 1).trim() : null
}

export type AskAssistant = (prompt: { system: string; user: string }) => Promise<unknown>

/**
 * Builds the report from the ideas this person may see, asks the assistant
 * about it and cleans the answer. Never throws: any failure is "unavailable".
 */
export async function composePortfolioNote(args: {
  all: Submission[]
  session: SessionClaims
  tenant: TenantConfig
  office: string | null
  now: number
  ask: AskAssistant
}): Promise<PortfolioNoteResult> {
  const { all, session, tenant, office, now, ask } = args
  try {
    const result = buildReportResponse(all, session, tenant, office, now)
    if (result.status !== 200) return { status: "unavailable" }
    const note = cleanPortfolioNote(
      await ask({
        system: portfolioNoteInstruction(tenant.assistantName, tenant.orgName),
        user: portfolioNoteInput(result.body.report, tenant.orgName),
      }),
    )
    return note ? { status: "ok", note, writtenAt: now } : { status: "unavailable" }
  } catch (error) {
    console.error("writePortfolioNote failed:", error)
    return { status: "unavailable" }
  }
}
