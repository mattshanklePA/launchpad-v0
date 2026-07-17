"use client"

// Conversational-first idea intake (issue #169) — the assistant leads the
// whole light-idea flow as one thread (reusing the multi-field assistant
// engine from issue #168: ScoutResponse, validateAndRefineInput, and
// lib/scoutFieldPlan.ts's per-step field plan) while a live "your idea so
// far" record (components/launchpad/intake-record-panel.tsx) fills in next
// to it and stays editable throughout.
//
// This is a new orchestrator rather than a literal reuse of AIdChatPanel
// (components/launchpad/chat-panel.tsx): that component is scoped to a
// single wizard step with a single field plan and gates its first turn on a
// pre-typed seed field, none of which fits "one continuous thread across
// several light fields, chip-first, no separate draft box." What IS reused
// directly is the actual engine underneath it — the same ScoutResponse
// shape, the same validateAndRefineInput server action, the same
// SCOUT_STEP_FIELD_PLAN-backed steps (2 and 3), and the same field-label
// lookup (`fieldLabel`, exported from chat-panel.tsx) — plus the same
// suggested-answer chip visual language. The two fields this flow asks about
// directly (affected business unit, internal/external) aren't AI-drafted
// text in either engine — they're short, closed choices — so they're asked
// as local chip prompts sourced from the tenant/enum options, no model call
// needed.
//
// Sequencing is driven entirely by FormData content (lib/intakeFlow.ts's
// `nextIntakeTopic`), not by a step pointer: a field filled in by hand on the
// record panel — before or during the conversation — is simply already
// "captured" the next time the engine looks, so the assistant never re-asks
// it. That also means resuming a draft here needs no special-cased resume
// logic; it falls out of reading FormData fresh on mount.

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { assessReadiness, validateAndRefineInput, type ScoutResponse } from "@/app/actions"
import { useForm } from "@/context/form-context"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TooltipProvider } from "@/components/ui/tooltip"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { fieldLabel } from "@/components/launchpad/chat-panel"
import { IntakeRecordPanel } from "@/components/launchpad/intake-record-panel"
import { getFormConfig } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"
import { saveSubmission } from "@/lib/submissions"
import { cn } from "@/lib/utils"
import type { FormData } from "@/lib/steps"
import {
  INTAKE_TOPICS,
  activeIntakeTopics,
  isTopicCaptured,
  nextIntakeTopic,
  type IntakeTopic,
  type IntakeTopicId,
} from "@/lib/intakeFlow"
import { User, Send, Sparkles, CheckCircle2 } from "lucide-react"

type ApiMessage = { role: "user" | "assistant"; content: string }

type ChoicePrompt = { prompt: string; multiSelect: boolean; options: { value: string; label: string }[] }

type ThreadMessage =
  | { role: "user"; content: string; topicId: IntakeTopicId }
  | { role: "assistant"; kind: "scout"; response: ScoutResponse; topicId: IntakeTopicId }
  | ({ role: "assistant"; kind: "choice"; topicId: IntakeTopicId } & ChoicePrompt)
  | { role: "assistant"; kind: "note"; text: string }

function choicePromptFor(topic: IntakeTopic, tenant: ReturnType<typeof getTenant>): ChoicePrompt {
  if (topic.id === "affectedUnits") {
    return {
      prompt: "Which business units, systems, or groups does this affect? Tap all that apply, then Continue.",
      multiSelect: true,
      options: tenant.affectedSystems,
    }
  }
  return {
    prompt: "Is this solution internal or external facing?",
    multiSelect: false,
    options: [
      { value: "internal", label: "Internal — for our own staff" },
      { value: "external", label: "External — customer/public-facing" },
    ],
  }
}

// Same conversion chat-panel.tsx's local toApiMessages does, scoped to one
// topic's slice of the shared thread (a "choice"/"note" message never went
// to the model, so it's excluded rather than mapped).
function topicApiHistory(messages: ThreadMessage[], topicId: IntakeTopicId): ApiMessage[] {
  const history: ApiMessage[] = []
  for (const m of messages) {
    if (m.role === "user" && m.topicId === topicId) {
      history.push({ role: "user", content: m.content })
    } else if (m.role === "assistant" && m.kind === "scout" && m.topicId === topicId) {
      if (m.response.mode === "question") {
        history.push({ role: "assistant", content: `Question: ${m.response.questionText}` })
      } else {
        const fieldSummary = Object.entries(m.response.fields)
          .map(([key, draft]) => `${fieldLabel(key)}: ${draft.value}`)
          .join("\n")
        history.push({ role: "assistant", content: `Draft produced:\n${fieldSummary}` })
      }
    }
  }
  return history
}

export function ConversationalIntake() {
  const { formData, setFormData, resetForm } = useForm()
  const tenant = getTenant()
  const router = useRouter()
  const { toast } = useToast()

  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [otherInputOpen, setOtherInputOpen] = useState(false)
  const [multiSelectDraft, setMultiSelectDraft] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const startedTopics = useRef<Set<IntakeTopicId>>(new Set())
  const reviewAnnounced = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, isLoading])

  const handleError = (error: unknown) => {
    console.error(`${tenant.productName} ${tenant.assistantName} Error:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred."
    toast({ variant: "destructive", title: `${tenant.assistantName} Error`, description: errorMessage })
  }

  const runScoutTurn = async (topic: IntakeTopic, apiHistory: ApiMessage[]) => {
    setIsLoading(true)
    try {
      const response = await validateAndRefineInput(formData, topic.scoutStep!, apiHistory, getFormConfig().enabled)
      setMessages((prev) => [...prev, { role: "assistant", kind: "scout", response, topicId: topic.id }])
      if (response.mode === "scaffold") {
        const applied = Object.fromEntries(
          Object.entries(response.fields).map(([key, draft]) => [key, draft.value]),
        ) as Partial<FormData>
        setFormData((prev) => ({ ...prev, ...applied }))
      }
    } catch (error) {
      handleError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const beginTopic = async (topic: IntakeTopic) => {
    if (topic.kind === "choice") {
      setMessages((prev) => [...prev, { role: "assistant", kind: "choice", topicId: topic.id, ...choicePromptFor(topic, tenant) }])
      setMultiSelectDraft([])
      return
    }
    await runScoutTurn(topic, [])
  }

  // The assistant's whole "what's next" logic lives here: recompute the
  // first uncaptured light field from FormData itself on every change (an AI
  // scaffold applying fields, a chip choice, or a manual record edit all
  // funnel through setFormData) and start it exactly once. A topic already
  // captured — including one completed out of order via the record panel —
  // is simply skipped, never re-asked.
  useEffect(() => {
    if (submitted) return
    const topic = nextIntakeTopic(formData)
    if (!topic) {
      if (!reviewAnnounced.current) {
        reviewAnnounced.current = true
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            kind: "note",
            text: "That's everything I need — review your idea in the record on the right, then submit it for vetting whenever you're ready.",
          },
        ])
      }
      return
    }
    if (startedTopics.current.has(topic.id)) return
    startedTopics.current.add(topic.id)
    beginTopic(topic)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, submitted])

  const handleScoutOptionClick = async (topic: IntakeTopic, label: string) => {
    if (label === "Other (let me type my own)") {
      setOtherInputOpen(true)
      return
    }
    const updated: ThreadMessage[] = [...messages, { role: "user", content: label, topicId: topic.id }]
    setMessages(updated)
    await runScoutTurn(topic, topicApiHistory(updated, topic.id))
  }

  const handleOtherSubmit = async (e: FormEvent, topic: IntakeTopic) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const updated: ThreadMessage[] = [...messages, { role: "user", content: chatInput, topicId: topic.id }]
    setMessages(updated)
    setChatInput("")
    setOtherInputOpen(false)
    await runScoutTurn(topic, topicApiHistory(updated, topic.id))
  }

  const commitChoice = (topicId: IntakeTopicId, values: string[], labels: string[]) => {
    setMessages((prev) => [...prev, { role: "user", content: labels.join(", "), topicId }])
    if (topicId === "affectedUnits") {
      setFormData((prev) => ({ ...prev, affectedBusinessUnits: values }))
    } else if (topicId === "audience") {
      setFormData((prev) => ({ ...prev, deliveryAudience: (values[0] || "") as FormData["deliveryAudience"] }))
    }
    setMultiSelectDraft([])
  }

  const handleFieldChange = (patch: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }))
    const keys = Object.keys(patch)
    const topic = INTAKE_TOPICS.find((t) => t.fields.some((f) => keys.includes(f)))
    setMessages((prev) => [
      ...prev,
      { role: "assistant", kind: "note", text: `✏️ Updated "${topic?.label ?? "your idea"}" on the record — noted.` },
    ])
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const readiness = await assessReadiness(formData, getFormConfig().enabled)
      const finalData: FormData = { ...formData, ...readiness }
      const saved = await saveSubmission(finalData)
      setSubmitted(true)
      resetForm()
      toast({ title: "Idea submitted", description: "Your idea was submitted for vetting." })
      router.push(`/submissions/${saved.id}`)
    } catch (error) {
      handleError(error)
      setIsSubmitting(false)
    }
  }

  const activeTopics = activeIntakeTopics(formData.submitterOffice)
  const remaining = activeTopics.filter((t) => !isTopicCaptured(t, formData))

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-uspto-gray-text">Tell {tenant.assistantName} about your idea</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Answer a few quick questions, mostly by tapping the suggested answers. {tenant.assistantName} keeps a
          running record of what it's captured on the right — edit anything there at any time.
        </p>
      </div>

      <TooltipProvider>
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <div className="flex flex-col rounded-lg border bg-white shadow-sm h-[calc(100vh-14rem)] min-h-[480px]">
              <div className="flex items-center gap-2 p-3 border-b flex-shrink-0">
                <PlumbMark className="h-6 w-6" />
                <h2 className="font-semibold text-lg">
                  {tenant.productName} {tenant.assistantName}
                </h2>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div
                  className="space-y-4"
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                  aria-label={`Conversation with ${tenant.assistantName}`}
                >
                  {messages.map((msg, index) => {
                    const isLast = index === messages.length - 1

                    if (msg.role === "user") {
                      return (
                        <div key={index} className="flex items-start gap-3 justify-end">
                          <div className="rounded-lg p-3 max-w-[85%] text-sm bg-uspto-blue-primary text-white">
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <User className="h-5 w-5 flex-shrink-0 mt-1" />
                        </div>
                      )
                    }

                    if (msg.kind === "note") {
                      return (
                        <p key={index} className="text-xs text-center text-muted-foreground italic px-2" role="status">
                          {msg.text}
                        </p>
                      )
                    }

                    if (msg.kind === "choice") {
                      const topic = INTAKE_TOPICS.find((t) => t.id === msg.topicId)!
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <PlumbMark className="h-5 w-5 flex-shrink-0 mt-1" />
                          <div className="rounded-lg p-3 bg-gray-100 text-sm w-full">
                            <p className="font-medium mb-2">{msg.prompt}</p>
                            {msg.multiSelect ? (
                              <>
                                <div className="flex flex-wrap gap-2" role="group" aria-label={msg.prompt}>
                                  {msg.options.map((opt) => {
                                    const selected = multiSelectDraft.includes(opt.value)
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        aria-pressed={selected}
                                        disabled={!isLast || isLoading}
                                        onClick={() =>
                                          setMultiSelectDraft((prev) =>
                                            prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value],
                                          )
                                        }
                                        className={cn(
                                          "rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60",
                                          selected
                                            ? "border-uspto-blue-primary bg-uspto-blue-primary/10 font-medium text-uspto-blue-primary"
                                            : "border-input bg-white hover:bg-muted/50",
                                        )}
                                      >
                                        {opt.label}
                                      </button>
                                    )
                                  })}
                                </div>
                                {isLast && (
                                  <Button
                                    size="sm"
                                    className="mt-3"
                                    disabled={multiSelectDraft.length === 0 || isLoading}
                                    onClick={() =>
                                      commitChoice(
                                        topic.id,
                                        multiSelectDraft,
                                        msg.options.filter((o) => multiSelectDraft.includes(o.value)).map((o) => o.label),
                                      )
                                    }
                                  >
                                    Continue
                                  </Button>
                                )}
                              </>
                            ) : (
                              <div role="radiogroup" aria-label={msg.prompt} className="flex flex-col gap-2">
                                {msg.options.map((opt) => (
                                  <Button
                                    key={opt.value}
                                    variant="outline"
                                    size="sm"
                                    role="radio"
                                    aria-checked={false}
                                    className="justify-start text-left h-auto py-2 whitespace-normal"
                                    disabled={!isLast || isLoading}
                                    onClick={() => commitChoice(topic.id, [opt.value], [opt.label])}
                                  >
                                    {opt.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }

                    // kind === "scout"
                    const topic = INTAKE_TOPICS.find((t) => t.id === msg.topicId)!
                    if (msg.response.mode === "question") {
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <PlumbMark className="h-5 w-5 flex-shrink-0 mt-1" />
                          <div className="rounded-lg p-3 bg-gray-100 text-sm w-full">
                            <p className="font-medium mb-1">{msg.response.questionText}</p>
                            {msg.response.rationale && (
                              <p className="text-xs text-muted-foreground italic mb-3">{msg.response.rationale}</p>
                            )}
                            <div className="flex flex-col gap-2" role="group" aria-label="Suggested answers">
                              {msg.response.options.map((opt, optIdx) => (
                                <Button
                                  key={optIdx}
                                  variant={opt.isRecommended ? "default" : "outline"}
                                  size="sm"
                                  className="justify-start text-left h-auto py-2 whitespace-normal"
                                  disabled={!isLast || isLoading}
                                  onClick={() => handleScoutOptionClick(topic, opt.label)}
                                >
                                  <span className="flex-1">
                                    {opt.label}
                                    {opt.isRecommended && <span className="ml-2 text-xs opacity-80">(Recommended)</span>}
                                  </span>
                                </Button>
                              ))}
                            </div>

                            {isLast && otherInputOpen && (
                              <form onSubmit={(e) => handleOtherSubmit(e, topic)} className="mt-3 flex items-end gap-2">
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
                          </div>
                        </div>
                      )
                    }

                    // scaffold — auto-applied to FormData already; show what landed
                    // on the record instead of an "Apply" button.
                    const fieldEntries = Object.entries(msg.response.fields)
                    return (
                      <div key={index} className="flex items-start gap-3">
                        <PlumbMark className="h-5 w-5 flex-shrink-0 mt-1" />
                        <div className="rounded-lg p-3 bg-gray-100 text-sm w-full">
                          {msg.response.summary && <p className="mb-3 whitespace-pre-wrap">{msg.response.summary}</p>}
                          <div className="pt-3 border-t space-y-3">
                            {fieldEntries.map(([key, draft]) => (
                              <div key={key} className="rounded border bg-white p-2">
                                <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                  {fieldLabel(key).toUpperCase()}
                                  <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" aria-hidden="true" />
                                </p>
                                <p className="text-sm whitespace-pre-wrap">{draft.value}</p>
                              </div>
                            ))}
                            <p className="text-xs text-muted-foreground italic">
                              Added to your record on the right — edit anytime, including the bracketed placeholders.
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {isLoading && (
                    <div className="flex items-start gap-3">
                      <PlumbMark className="h-5 w-5 flex-shrink-0 mt-1" />
                      <div className="rounded-lg p-3 bg-gray-100 text-sm">
                        <Sparkles className="h-4 w-4 inline animate-pulse mr-1" />
                        {tenant.assistantName} is thinking...
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="lg:col-span-5">
            <IntakeRecordPanel
              formData={formData}
              onFieldChange={handleFieldChange}
              remainingLabels={remaining.map((t) => t.label)}
              readyToSubmit={remaining.length === 0}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}
