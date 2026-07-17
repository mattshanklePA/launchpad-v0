"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Wand2, User, Info, Send, ClipboardCheck, Sparkles, Pencil } from "lucide-react"
import { validateAndRefineInput, type ScoutResponse } from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { FormData } from "@/lib/steps"
import { useForm } from "@/context/form-context"
import { getFormConfig } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"
import { PlumbMark } from "@/components/branding/plumb-mark"

// Message format for the API (legacy shape kept for backward compatibility)
type ApiMessage = {
  role: "user" | "assistant"
  content: string
}

// Local message format for UI rendering — supports rich assistant responses
type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; response: ScoutResponse }

type LaunchPadChatPanelProps = {
  step: number
  onApplySuggestion: (suggestion: string) => void
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
    return { role: "assistant", content: `Scaffold produced: ${m.response.scaffoldText}` }
  })
}

export function AIdChatPanel({ step, onApplySuggestion }: LaunchPadChatPanelProps) {
  const { formData } = useForm()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [otherInputOpen, setOtherInputOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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

  // Scout needs a rough draft in the step's source field before it has
  // anything to work with — gate the initial button on that so a click never
  // silently no-ops.
  const sourceField = getInputFieldForStep(step)
  const sourceText = sourceField ? (formData[sourceField] as string | undefined) : undefined
  const hasDraft = !sourceField || (typeof sourceText === "string" && sourceText.trim().length > 0)

  return (
    <TooltipProvider>
      <div className="sticky top-24 max-h-[calc(100vh-8rem)]">
        <div className="flex flex-col rounded-lg border bg-white shadow-sm h-full">
          <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <PlumbMark className="h-6 w-6" />
              {tenant.productName} {tenant.assistantName}
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{tenant.assistantName} helps you one question at a time. It does not invent facts. Your specifics stay yours.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <ScrollArea className="flex-1 p-4 max-h-[calc(100vh-20rem)]">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground p-8">
                  <p className="text-sm">{getStepContext(step).emptyMessage}</p>
                </div>
              )}

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

                // Assistant — question or scaffold
                if (msg.response.mode === "question") {
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <PlumbMark className="h-5 w-5 flex-shrink-0 mt-1" />
                      <div className="rounded-lg p-3 bg-gray-100 text-sm w-full">
                        <p className="font-medium mb-1">{msg.response.questionText}</p>
                        {msg.response.rationale && (
                          <p className="text-xs text-muted-foreground italic mb-3">{msg.response.rationale}</p>
                        )}
                        <div className="flex flex-col gap-2">
                          {msg.response.options.map((opt, optIdx) => (
                            <Button
                              key={optIdx}
                              variant={opt.isRecommended ? "default" : "outline"}
                              size="sm"
                              className="justify-start text-left h-auto py-2 whitespace-normal"
                              disabled={!isLast || isLoading}
                              onClick={() => handleOptionClick(opt.label)}
                            >
                              <span className="flex-1">
                                {opt.label}
                                {opt.isRecommended && (
                                  <span className="ml-2 text-xs opacity-80">(Recommended)</span>
                                )}
                              </span>
                            </Button>
                          ))}
                        </div>

                        {isLast && otherInputOpen && (
                          <form onSubmit={handleOtherSubmit} className="mt-3 flex items-end gap-2">
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

                // Assistant — scaffold
                return (
                  <div key={index} className="flex items-start gap-3">
                    <PlumbMark className="h-5 w-5 flex-shrink-0 mt-1" />
                    <div className="rounded-lg p-3 bg-gray-100 text-sm w-full">
                      {msg.response.summary && (
                        <p className="mb-3 whitespace-pre-wrap">{msg.response.summary}</p>
                      )}
                      <div className="pt-3 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">SCAFFOLD TO FILL IN:</p>
                        <p className="text-xs text-muted-foreground italic mb-2">
                          Replace each [BRACKETED PLACEHOLDER] with specifics only you can provide.
                        </p>
                        <p className="text-sm bg-white p-2 rounded border whitespace-pre-wrap">
                          {msg.response.scaffoldText}
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2 w-full"
                          onClick={() => {
                            onApplySuggestion(msg.response.mode === "scaffold" ? msg.response.scaffoldText : "")
                            toast({
                              title: "Scaffold copied to response",
                              description: "Now fill in the bracketed placeholders with your specifics.",
                            })
                          }}
                        >
                          <ClipboardCheck className="mr-2 h-4 w-4" /> Use as Starting Point
                        </Button>
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

          <div className="p-3 border-t bg-white flex-shrink-0">
            {messages.length === 0 ? (
              <>
                <Button
                  onClick={handleInitialClick}
                  disabled={isLoading || !hasDraft}
                  className="w-full bg-uspto-blue-primary hover:bg-uspto-blue-primary/90"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  {isLoading ? "Thinking..." : getStepContext(step).buttonLabel}
                </Button>
                {!hasDraft && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Add a rough draft in the field above to enable {tenant.assistantName}.
                  </p>
                )}
              </>
            ) : isWaitingOnOptions && !otherInputOpen ? (
              <p className="text-xs text-center text-muted-foreground">
                Pick an option above to continue.
              </p>
            ) : hasScaffold ? (
              <form onSubmit={handleFollowUpSubmit} className="flex items-end gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a follow-up or request a revised scaffold..."
                  rows={1}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" aria-label="Send message" disabled={isLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <p className="text-xs text-center text-muted-foreground">
                <Pencil className="h-3 w-3 inline mr-1" />
                Typing your own answer above...
              </p>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
