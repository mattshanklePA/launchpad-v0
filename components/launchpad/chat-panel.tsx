"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Wand2, Bot, User, Info, Send, ClipboardCheck } from "lucide-react"
import { validateAndRefineInput } from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { FormData } from "@/lib/steps"
import { useForm } from "@/context/form-context"

type Message = {
  role: "user" | "assistant"
  content: string
  suggestion?: string
}

type LaunchPadChatPanelProps = {
  step: number
  onApplySuggestion: (suggestion: string) => void
}

// Helper to get the primary input field for a given step
function getInputFieldForStep(step: number): keyof FormData | null {
  switch (step) {
    case 2:
      return "targetUserContext"
    case 3:
      return "coreProblem"
    case 4:
      return "proposedSolution"
    case 5:
      return "userValue"
    case 6:
      return "businessValue"
    case 7:
      return "relevantOkrs"
    case 8:
      return "dependencies"
    case 9:
      return "successMetrics"
    default:
      return null
  }
}

export function AIdChatPanel({ step, onApplySuggestion }: LaunchPadChatPanelProps) {
  const { formData } = useForm()
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [messages])

  const handleError = (error: unknown) => {
    console.error("LaunchPad Co-Pilot Error:", error)
    let errorMessage = "An unexpected error occurred."
    if (error instanceof Error) {
      errorMessage = error.message
    }
    toast({
      variant: "destructive",
      title: "Co-Pilot Error",
      description: errorMessage,
    })
  }

  const callAI = async (conversation: Message[]) => {
    setIsLoading(true)
    try {
      const result = await validateAndRefineInput(formData, step, conversation)
      setMessages((prev) => [...prev, { role: "assistant", content: result.feedback, suggestion: result.suggestion }])
    } catch (error) {
      handleError(error)
    }
    setIsLoading(false)
  }

  const handleInitialValidation = async () => {
    const field = getInputFieldForStep(step)
    const userInput = field ? formData[field] : ""
    if (!userInput) {
      toast({ variant: "destructive", title: "Please enter a response in the main text field first." })
      return
    }
    const userMessage: Message = { role: "user", content: `Here is my input for this step: "${userInput}"` }
    setMessages([userMessage])
    await callAI([])
  }

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const newMessages: Message[] = [...messages, { role: "user", content: chatInput }]
    setMessages(newMessages)
    setChatInput("")
    await callAI(newMessages)
  }

  return (
    <TooltipProvider>
      <div className="sticky top-24 h-full">
        <div className="flex flex-col rounded-lg border bg-white shadow-sm h-full">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Bot className="h-6 w-6 text-uspto-blue-primary" />
              LaunchPad Co-Pilot
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Use LaunchPad to improve clarity, specificity, and impact.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground p-8">
                  <p>Click "Validate & Refine" to get started.</p>
                </div>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && <Bot className="h-5 w-5 text-uspto-blue-primary flex-shrink-0 mt-1" />}
                  <div
                    className={`rounded-lg p-3 max-w-[85%] text-sm w-full ${msg.role === "user" ? "bg-uspto-blue-primary text-white" : "bg-gray-100"}`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "assistant" && msg.suggestion && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">REFINED SUGGESTION:</p>
                        <p className="text-sm bg-white p-2 rounded border">{msg.suggestion}</p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2 w-full"
                          onClick={() => {
                            onApplySuggestion(msg.suggestion || "")
                            toast({
                              title: "Suggestion Applied!",
                              description: "The main text field has been updated.",
                            })
                          }}
                        >
                          <ClipboardCheck className="mr-2 h-4 w-4" /> Paste to Response
                        </Button>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && <User className="h-5 w-5 flex-shrink-0 mt-1" />}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-white">
            {messages.length === 0 ? (
              <Button
                onClick={handleInitialValidation}
                disabled={isLoading}
                className="w-full bg-uspto-blue-primary hover:bg-uspto-blue-primary/90"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {isLoading ? "Analyzing..." : "Validate & Refine"}
              </Button>
            ) : (
              <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  rows={1}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
