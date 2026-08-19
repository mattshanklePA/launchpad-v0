"use client"

import { useState, useRef, useEffect, type FormEvent, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Wand2, Send, ClipboardCheck, ClipboardList, Sparkles } from "lucide-react"
import { validateAndRefineInput, type ScoutResponse } from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import TextareaAutosize from "react-textarea-autosize"
import type { FormData } from "@/lib/steps"
import { FIELD_REGISTRY_BY_KEY } from "@/lib/fieldRegistry"
import { useForm } from "@/context/form-context"
import { getFormConfig } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { Field } from "@/components/steps/step-frame"
import { cn } from "@/lib/utils"

// Message format for the API (legacy shape kept for backward compatibility)
type ApiMessage = {
  role: "user" | "assistant"
  content: string
}

// Local message format for UI rendering — supports rich assistant responses
type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; response: ScoutResponse }

export type SummaryField = {
  key: keyof FormData
  label: string
  hint: string
}

type LaunchPadChatPanelProps = {
  step: number
  // Merges the given fields into FormData — called with every drafted field
  // for "Apply all" or a single field for one field's own "Apply" button.
  onApplySuggestion: (fields: Partial<FormData>) => void
  // The step's own AI-refined summary field (Refined Problem & Users Summary,
  // Solution Summary, ...), rendered below the thread per the mock (05b) —
  // absent on steps with no single summary field of their own (e.g. Technical
  // Constraints), which fall back to the thread's generic per-field Apply
  // cards further down.
  summaryField?: SummaryField
}

// Falls back to the raw field key (Title Cased) when a key isn't registered
// in FIELD_REGISTRY, so the panel never silently drops a drafted field.
// Exported so other assistant-driven views (e.g. the conversational-first
// intake, issue #169) label the same FormData keys identically.
export function fieldLabel(key: string): string {
  return FIELD_REGISTRY_BY_KEY[key]?.label || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
}

function getStepContext(step: number): { buttonLabel: string; emptyMessage: string } {
  switch (step) {
    case 2:
      // Merged Problem & Target Users
      return {
        buttonLabel: "Help Me with the Problem",
        emptyMessage:
          "Draft the core problem in the field above, then click below. I'll ask one question at a time, including who's affected and how badly.",
      }
    case 3:
      // Merged Proposed Solution + Expected Benefits
      return {
        buttonLabel: "Help Me with the Solution",
        emptyMessage: "Sketch your solution, then click below. I'll ask focused questions to firm it up.",
      }
    case 4:
      // Technical Constraints — light free-text notes only
      return {
        buttonLabel: "Help Me with Constraints",
        emptyMessage: "Note any dependencies or blockers, then click below. I'll help you phrase them clearly for reviewers.",
      }
    default:
      return { buttonLabel: "Help Me", emptyMessage: "Click below to get started." }
  }
}

function getInputFieldForStep(step: number): keyof FormData | null {
  switch (step) {
    case 2:
      // Merged Problem & Users — coach on the problem first
      return "coreProblem"
    case 3:
      // Merged Solution + Benefits — coach on the solution first
      return "proposedSolution"
    case 4:
      return "dependencies"
    default:
      return null
  }
}

// Convert local chat messages to the legacy API message shape
function toApiMessages(msgs: ChatMessage[]): ApiMessage[] {
  return msgs.map((m) => {
    if (m.role === "user") return { role: "user", content: m.content }
    if (m.response.mode === "question") {
      return { role: "assistant", content: `Question: ${m.response.questionText}` }
    }
    const fieldSummary = Object.entries(m.response.fields)
      .map(([key, draft]) => `${fieldLabel(key)}: ${draft.value}`)
      .join("\n")
    return { role: "assistant", content: `Draft produced:\n${fieldSummary}` }
  })
}

// Renders `[BRACKETED PLACEHOLDER]`-style spans with a limestone highlight so
// they're visible before Apply — the submitter still has to replace them with
// their own specifics.
function highlightPlaceholders(text: string): ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g)
  return parts.map((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? (
      <mark key={i} className="rounded-sm bg-keystone-limestone px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

const OTHER_OPTION_PREFIX = "Other"
const ENOUGH_OPTION_PREFIX = "I have enough"

export function AIdChatPanel({ step, onApplySuggestion, summaryField }: LaunchPadChatPanelProps) {
  const { formData, setFormData } = useForm()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [otherInputOpen, setOtherInputOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // Index of the scaffold message whose draft has already been sent to the
  // field (Apply or Edit the wording) — hides the "not applied yet" card for
  // that message without discarding the message itself.
  const [handledScaffoldIndex, setHandledScaffoldIndex] = useState<number | null>(null)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const { toast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const tenant = getTenant()

  // Radix ScrollArea scrolls its inner viewport, not the Root element, so a
  // ref-and-scrollTo on the Root is a no-op. scrollIntoView on a sentinel at
  // the end of the message list finds whichever ancestor actually scrolls.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isLoading])

  const handleError = (error: unknown) => {
    console.error(`${tenant.productName} ${tenant.assistantName} Error:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred."
    toast({ variant: "destructive", title: `${tenant.assistantName} Error`, description: errorMessage })
  }

  const callAI = async (updatedMessages: ChatMessage[]) => {
    setIsLoading(true)
    try {
      const apiMessages = toApiMessages(updatedMessages)
      const result = await validateAndRefineInput(formData, step, apiMessages, getFormConfig().enabled)
      setMessages([...updatedMessages, { role: "assistant", response: result }])
    } catch (error) {
      handleError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInitialClick = async () => {
    const field = getInputFieldForStep(step)
    const userInput = field ? (formData[field] as string) : ""
    if (!userInput || userInput.trim() === "") {
      toast({
        variant: "destructive",
        title: "Add a draft first",
        description: "Type at least a rough draft in the main field so I have something to work with.",
      })
      return
    }
    // Start the conversation with no user messages yet — the system prompt already
    // includes the draft text. The first AI response should be a question.
    await callAI([])
  }

  const handleOptionClick = async (label: string) => {
    if (label === "Other (let me type my own)") {
      setOtherInputOpen(true)
      return
    }
    const updated: ChatMessage[] = [...messages, { role: "user", content: label }]
    setMessages(updated)
    await callAI(updated)
  }

  const handleOtherSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const updated: ChatMessage[] = [...messages, { role: "user", content: chatInput }]
    setMessages(updated)
    setChatInput("")
    setOtherInputOpen(false)
    await callAI(updated)
  }

  const handleFollowUpSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const updated: ChatMessage[] = [...messages, { role: "user", content: chatInput }]
    setMessages(updated)
    setChatInput("")
    await callAI(updated)
  }

  const lastMessage = messages[messages.length - 1]
  const isWaitingOnOptions = lastMessage?.role === "assistant" && lastMessage.response.mode === "question"
  const hasScaffold = lastMessage?.role === "assistant" && lastMessage.response.mode === "scaffold"
  const scaffoldIndex = hasScaffold ? messages.length - 1 : null

  // Scout needs a rough draft in the step's source field before it has
  // anything to work with — gate the initial button on that so a click never
  // silently no-ops.
  const sourceField = getInputFieldForStep(step)
  const sourceText = sourceField ? (formData[sourceField] as string | undefined) : undefined
  const hasDraft = !sourceField || (typeof sourceText === "string" && sourceText.trim().length > 0)

  // Answered Q&A pairs — every assistant question that already has a
  // following user answer. The live (unanswered) question, if any, is
  // rendered separately below as the bordered "in flight" block.
  const answeredPairs: { question: string; answer: string }[] = []
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    if (m.role === "assistant" && m.response.mode === "question") {
      const next = messages[i + 1]
      if (next && next.role === "user") {
        answeredPairs.push({ question: m.response.questionText, answer: next.content })
      }
    }
  }

  const applyScaffoldField = (key: string, value: string, index: number) => {
    onApplySuggestion({ [key]: value } as Partial<FormData>)
    setHandledScaffoldIndex(index)
    toast({
      title: `${fieldLabel(key)} applied`,
      description: "Now fill in the bracketed placeholders with your specifics.",
    })
  }

  const editScaffoldWording = (key: string, value: string, index: number) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setHandledScaffoldIndex(index)
  }

  // "Have Plumb write the summary" (05a/05b) is the same scaffold trigger as
  // the thread's own "I have enough" escape — it just also works before a
  // thread exists yet, in which case it starts one first.
  const handleWriteSummaryClick = async () => {
    if (messages.length === 0) return handleInitialClick()
    if (enoughOption) return handleOptionClick(enoughOption.label)
    const updated: ChatMessage[] = [...messages, { role: "user", content: "I have enough, give me the scaffold" }]
    setMessages(updated)
    await callAI(updated)
  }

  const liveQuestion =
    isWaitingOnOptions && lastMessage?.role === "assistant" && lastMessage.response.mode === "question"
      ? lastMessage.response
      : null
  const enoughOption = liveQuestion?.options.find((o) => o.label.startsWith(ENOUGH_OPTION_PREFIX))
  const pillOptions = liveQuestion?.options.filter((o) => o !== enoughOption) ?? []

  const scaffoldFields = hasScaffold && lastMessage?.role === "assistant" && lastMessage.response.mode === "scaffold"
    ? Object.entries(lastMessage.response.fields)
    : []
  const summaryDraft = summaryField ? scaffoldFields.find(([key]) => key === summaryField.key) : undefined
  const otherScaffoldFields = summaryField ? scaffoldFields.filter(([key]) => key !== summaryField.key) : scaffoldFields
  const summaryDraftHandled = scaffoldIndex !== null && handledScaffoldIndex === scaffoldIndex

  return (
    <div className="flex flex-col gap-0">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlumbMark className="h-4 w-4 flex-shrink-0" />
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            {tenant.assistantName}&apos;s follow-ups
          </span>
        </div>
        {messages.length > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-foreground-faint">
            {answeredPairs.length} answered
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-card p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">{getStepContext(step).emptyMessage}</p>
          <Button onClick={handleInitialClick} disabled={isLoading || !hasDraft}>
            <Wand2 className="mr-2 h-4 w-4" />
            {isLoading ? "Thinking..." : getStepContext(step).buttonLabel}
          </Button>
          {!hasDraft && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Add a rough draft in the field above to enable {tenant.assistantName}.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1 border-l-2 py-1 pl-[18px]">
          {answeredPairs.map((pair, i) => (
            <div key={i} className="flex flex-col gap-0.5 pb-3">
              <p className="text-[14px] leading-[1.55] text-muted-foreground">{pair.question}</p>
              <p className="text-[14.5px] font-semibold text-foreground">{pair.answer}</p>
            </div>
          ))}
        </div>
      )}

      {liveQuestion && (
        <div className="mt-2 flex flex-col gap-2.5 rounded-md border border-keystone-activeBlue bg-card p-4">
          <p className="text-[15px] font-semibold leading-[1.55] text-foreground">{liveQuestion.questionText}</p>
          {liveQuestion.rationale && (
            <p className="text-[12.5px] text-muted-foreground">{liveQuestion.rationale}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {pillOptions.map((opt, optIdx) => (
              <button
                key={optIdx}
                type="button"
                disabled={isLoading}
                onClick={() => handleOptionClick(opt.label)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-left text-[13px] font-semibold transition-colors disabled:opacity-50",
                  opt.isRecommended
                    ? "border-keystone-activeBlue text-foreground"
                    : opt.label.startsWith(OTHER_OPTION_PREFIX)
                      ? "border-border font-normal text-muted-foreground"
                      : "border-border font-normal text-foreground",
                )}
              >
                {opt.label}
                {opt.isRecommended && (
                  <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-keystone-activeBlue">
                    Recommended
                  </span>
                )}
              </button>
            ))}
          </div>

          {otherInputOpen && (
            <form onSubmit={handleOtherSubmit} className="flex items-end gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your own answer..."
                rows={2}
                className="flex-1 text-sm"
                disabled={isLoading}
                autoFocus
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={isLoading || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}

          {enoughOption && (
            <div className="border-t border-border-subtle pt-2.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleOptionClick(enoughOption.label)}
                className="text-[13px] font-semibold text-primary hover:underline disabled:opacity-50"
              >
                I have enough, write the summary
              </button>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse" />
          {tenant.assistantName} is thinking...
        </div>
      )}
      <div ref={bottomRef} />

      {hasScaffold && !summaryField && otherScaffoldFields.length > 0 && (
        <div className="mt-3 space-y-3 rounded-md border border-border-subtle bg-card p-4">
          {lastMessage?.role === "assistant" && lastMessage.response.mode === "scaffold" && lastMessage.response.summary && (
            <p className="whitespace-pre-wrap text-sm text-foreground">{lastMessage.response.summary}</p>
          )}
          <p className="text-xs italic text-muted-foreground">
            Replace each highlighted placeholder with specifics only you can provide.
          </p>
          {otherScaffoldFields.map(([key, draft]) => (
            <div key={key} className="rounded border border-border-subtle bg-background p-3">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">{fieldLabel(key).toUpperCase()}</p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{highlightPlaceholders(draft.value)}</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => applyScaffoldField(key, draft.value, scaffoldIndex!)}
              >
                <ClipboardCheck className="mr-2 h-4 w-4" /> Apply {fieldLabel(key)}
              </Button>
            </div>
          ))}
          {otherScaffoldFields.length > 1 && (
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                const all = Object.fromEntries(otherScaffoldFields.map(([key, draft]) => [key, draft.value])) as Partial<FormData>
                onApplySuggestion(all)
                setHandledScaffoldIndex(scaffoldIndex)
                toast({
                  title: "All drafted fields applied",
                  description: "Now fill in the bracketed placeholders with your specifics.",
                })
              }}
            >
              <ClipboardList className="mr-2 h-4 w-4" /> Apply All
            </Button>
          )}
        </div>
      )}

      {hasScaffold && (
        <div className="mt-3">
          {showFollowUp ? (
            <form onSubmit={handleFollowUpSubmit} className="flex items-end gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a follow-up or request a revised scaffold..."
                rows={1}
                className="flex-1"
                disabled={isLoading}
                autoFocus
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={isLoading || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowFollowUp(true)}
              className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
            >
              Ask a follow-up
            </button>
          )}
        </div>
      )}

      {summaryField && (
        <div
          className={cn(
            "mt-4 flex flex-col gap-3 rounded-md border border-border-subtle bg-card p-5",
            "border-l-[3px] border-l-keystone-activeBlue",
          )}
        >
          {summaryDraft && !summaryDraftHandled ? (
            <>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[13.5px] font-semibold text-foreground">{summaryField.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {tenant.assistantName}&apos;s draft · not applied yet
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-[1.65] text-foreground">
                {highlightPlaceholders(summaryDraft[1].value)}
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <Button onClick={() => applyScaffoldField(summaryField.key as string, summaryDraft[1].value, scaffoldIndex!)}>
                  Apply to the field
                </Button>
                <button
                  type="button"
                  onClick={() => editScaffoldWording(summaryField.key as string, summaryDraft[1].value, scaffoldIndex!)}
                  className="text-[13px] font-semibold text-primary hover:underline"
                >
                  Edit the wording
                </button>
                <span className="text-[12px] text-foreground-faint">
                  Applying fills the field; you can still change every word.
                </span>
              </div>
            </>
          ) : (
            <Field htmlFor={summaryField.key as string} label={summaryField.label} hint={summaryField.hint}>
              <TextareaAutosize
                id={summaryField.key as string}
                value={(formData[summaryField.key] as string) || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, [summaryField.key]: e.target.value }))}
                placeholder="Plumb's draft will appear here once you ask for it..."
                minRows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-[14.5px]"
              />
            </Field>
          )}
          {(!summaryDraft || summaryDraftHandled) && (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={handleWriteSummaryClick}
              disabled={isLoading || (messages.length === 0 && !hasDraft)}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Have {tenant.assistantName} write the summary
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
