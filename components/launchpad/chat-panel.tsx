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

// Helper to get step-specific button label and empty message
function getStepContext(step: number): { buttonLabel: string; emptyMessage: string } {
  switch (step) {
    case 3:
      return { 
        buttonLabel: "Vet My Target Users", 
        emptyMessage: "Describe your target users, then click below to pressure-test whether your audience is well-defined." 
      }
    case 4:
      return { 
        buttonLabel: "Challenge My Problem Statement", 
        emptyMessage: "Define the problem, then click below to see if it would hold up under leadership scrutiny." 
      }
    case 5:
      return { 
        buttonLabel: "Vet My Solution", 
        emptyMessage: "Describe your proposed solution, then click below to check if it's specific enough to evaluate." 
      }
    case 6:
      return { 
        buttonLabel: "Challenge My Value Claim", 
        emptyMessage: "Describe the user value, then click below to see if your claims are grounded and measurable." 
      }
    case 7:
      return { 
        buttonLabel: "Vet My Business Case", 
        emptyMessage: "Describe the business value, then click below to pressure-test your ROI and strategic argument." 
      }
    case 8:
      return { 
        buttonLabel: "Check My Alignment", 
        emptyMessage: "Describe strategic alignment, then click below to verify it connects to real USPTO priorities." 
      }
    case 9:
      return { 
        buttonLabel: "Challenge My Feasibility", 
        emptyMessage: "Describe feasibility and security considerations, then click below for a reality check." 
      }
    case 10:
      return { 
        buttonLabel: "Vet My Metrics", 
        emptyMessage: "Define your success metrics, then click below to see if they're measurable and realistic." 
      }
    default:
      return { 
        buttonLabel: "Validate & Refine", 
        emptyMessage: "Click the button below to get started." 
      }
  }
}

// Helper to get the primary input field for a given step
function getInputFieldForStep(step: number): keyof FormData | null {
  switch (step) {
    case 3:
      return "targetUserContext" // Step 3: Target User
    case 4:
      return "coreProblem" // Step 4: Problem Statement
    case 5:
      return "proposedSolution" // Step 5: Proposed Solution
    case 6:
      return "userValue" // Step 6: User Value
    case 7:
      return "businessValue" // Step 7: Business Value
    case 8:
      return "relevantOkrs" // Step 8: Strategic Alignment
    case 9:
      return "dependencies" // Step 9: Feasibility & Security
    case 10:
      return "successMetrics" // Step 10: Outcome Measurements
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
      <div className="sticky top-24 max-h-[calc(100vh-8rem)]">
        <div className="flex flex-col rounded-lg border bg-white shadow-sm h-full">
          <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Bot className="h-6 w-6 text-uspto-blue-primary" />
              LaunchPad Co-Pilot
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>The Co-Pilot pressure-tests your idea at each step to make sure it's ready for leadership review.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <ScrollArea className="flex-1 p-4 max-h-[calc(100vh-20rem)]" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground p-8">
                  <p>{getStepContext(step).emptyMessage}</p>
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
                        <p className="text-xs font-semibold text-muted-foreground mb-1">SCAFFOLD TO FILL IN:</p>
                        <p className="text-xs text-muted-foreground mb-2 italic">
                          Replace each [BRACKETED PLACEHOLDER] with details only you can provide.
                        </p>
                        <p className="text-sm bg-white p-2 rounded border whitespace-pre-wrap">{msg.suggestion}</p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2 w-full"
                          onClick={() => {
                            onApplySuggestion(msg.suggestion || "")
                            toast({
                              title: "Scaffold copied to response",
                              description: "Now fill in the bracketed placeholders with your specifics.",
                            })
                          }}
                        >
                          <ClipboardCheck className="mr-2 h-4 w-4" /> Use as Starting Point
                        </Button>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && <User className="h-5 w-5 flex-shrink-0 mt-1" />}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-white flex-shrink-0">
            {messages.length === 0 ? (
              <Button
                onClick={handleInitialValidation}
                disabled={isLoading}
                className="w-full bg-uspto-blue-primary hover:bg-uspto-blue-primary/90"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {isLoading ? "Analyzing..." : getStepContext(step).buttonLabel}
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
