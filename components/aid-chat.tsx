"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Wand2, Bot, User, Check, Copy } from "lucide-react"
import { validateAndRefineInput } from "@/app/actions"
import { useToast } from "./ui/use-toast"
import { Badge } from "./ui/badge"

type Message = {
  role: "user" | "assistant"
  content: string
  suggestion?: string
  quality?: "good" | "fair" | "poor"
}

type AIdChatProps = {
  step: number
  userInput: string
  onApplySuggestion: (suggestion: string) => void
}

export function AIdChat({ step, userInput, onApplySuggestion }: AIdChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleValidate = async () => {
    setIsLoading(true)
    setMessages((prev) => [...prev, { role: "user", content: userInput }])
    try {
      const result = await validateAndRefineInput(step, userInput)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.feedback,
          suggestion: result.suggestion,
          quality: result.quality,
        },
      ])
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not get feedback from AId.",
      })
    }
    setIsLoading(false)
  }

  const getQualityBadge = (quality: "good" | "fair" | "poor") => {
    switch (quality) {
      case "good":
        return (
          <Badge variant="default" className="bg-green-600">
            Good
          </Badge>
        )
      case "fair":
        return <Badge variant="secondary">Fair</Badge>
      case "poor":
        return <Badge variant="destructive">Poor</Badge>
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AId Co-Pilot
        </h4>
        <Button onClick={handleValidate} disabled={isLoading || !userInput}>
          <Wand2 className="mr-2 h-4 w-4" />
          {isLoading ? "Thinking..." : "Validate & Refine"}
        </Button>
      </div>

      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && <Bot className="h-5 w-5 text-primary flex-shrink-0 mt-1" />}
              <div
                className={`rounded-lg p-3 max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-background"}`}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.role === "assistant" && msg.suggestion && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-muted-foreground">REFINED SUGGESTION</p>
                      {msg.quality && getQualityBadge(msg.quality)}
                    </div>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{msg.suggestion}</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => onApplySuggestion(msg.suggestion || "")}>
                        <Check className="mr-2 h-4 w-4" /> Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(msg.suggestion || "")
                          toast({ title: "Copied to clipboard!" })
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" /> Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {msg.role === "user" && <User className="h-5 w-5 flex-shrink-0 mt-1" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
